"""Os casos de uso da API, sobre o motor que já existe (`app/pipeline.py` e `app/rules.py`).

Regra central: `approve` é a única porta de entrada da oferta. A cascata só chama quem está na
decisão gravada na trilha, e refaz as regras antes de cada chamada, porque a agenda pode ter mudado
desde a recomendação. O n8n só pede para avançar: quem decide o que acontece é este código.

A API roda com um único processo, então uma trava por vaga basta para duas chamadas ao mesmo tempo
não recomendarem ou aprovarem em dobro. As restrições de unicidade do banco seguem como segunda
barreira para as ofertas.
"""

import json
from collections import Counter
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4

from app.api.errors import ApiError
from app.api.repository import Profile, Repository
from app.api.tempo import db_from_local, local_from_db, local_now
from app.api.world import WorldCache
from app.audit import ACTIONS, FORBIDDEN_DETAIL_KEYS
from app.evidence import exclusion_evidence
from app.llm.client import LLMClient
from app.llm.extraction import ExtractionResult, extract
from app.llm.guardrails import ShiftFields, detect_injection
from app.models import Dataset, Offer, Policy, Shift, Unit
from app.pipeline import Recommendation, approve, recommend
from app.privacy import MAX_FREE_TEXT, MIN_JUSTIFICATION, remove_personal_data, without_marks
from app.ranking.compute import FeatureStore
from app.ranking.features import RANKING_FEATURES
from app.ranking.model import LogisticModel
from app.rules import RULE_TEXTS, evaluate_candidate, schedule_check, shift_period

FINAL_STATUSES = ("filled", "cancelled", "uncovered")
MAX_DAYS_AHEAD = 60
# Gerada da ficha do modo de demonstração (`apps/web/lib/demo/mundo.json`); um teste trava as duas.
MODEL_CARD_PATH = Path(__file__).resolve().parent / "ficha_do_modelo.json"


class RestAudit:
    """A trilha no banco, com a mesma interface de `app.audit.AuditLog`.

    Sequência, data e hash ficam com o gatilho do banco, então `now` não é usado. No modo
    `buffered`, as linhas só vão na chamada a `flush`, de uma vez.
    """

    def __init__(
        self, repository: Repository, organization_id: str | None, *, buffered: bool = False
    ) -> None:
        self._repository = repository
        self._organization_id = organization_id
        self._buffered = buffered
        self._rows: list[dict[str, Any]] = []

    def append(
        self,
        *,
        now: datetime,
        actor_role: str,
        actor_pseudo_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        model_version: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if action not in ACTIONS:
            raise ValueError(f"ação de auditoria desconhecida: {action}")
        details = details or {}
        if FORBIDDEN_DETAIL_KEYS & {key.lower() for key in details}:
            raise ValueError("a trilha de auditoria não aceita dado pessoal")
        row = {
            "organization_id": self._organization_id,
            "actor_role": actor_role,
            "actor_pseudo_id": actor_pseudo_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "model_version": model_version,
            "details": details,
        }
        if self._buffered:
            self._rows.append(row)
        else:
            self._repository.add_audit([row])
        return row

    def flush(self) -> None:
        rows, self._rows = self._rows, []
        self._repository.add_audit(rows)


@dataclass(frozen=True, slots=True)
class ShortlistItem:
    doctor_id: str


@dataclass(frozen=True, slots=True)
class Shortlist:
    """O que `pipeline.approve` precisa saber da recomendação, lido de volta do banco."""

    shift_key: str
    model_version: str
    candidates: tuple[ShortlistItem, ...]


@dataclass(frozen=True, slots=True)
class RecommendOutcome:
    """O resultado do motor, a evidência de cada exclusão e a hora em que foi gerado."""

    result: Recommendation
    evidence: dict[str, str]
    generated_at: datetime


@dataclass(frozen=True, slots=True)
class DecisionState:
    """O que já foi decidido na vaga: a aprovação gravada e quem está pulado agora."""

    approved_ids: list[str] | None
    decided_by: str | None
    decided_at: datetime | None
    exception: dict[str, Any] | None
    skipped: list[str]


@dataclass(slots=True)
class CascadeStep:
    shift_id: str
    action: str
    shift_status: str
    offer: Offer | None = None
    skipped: list[tuple[str, str]] = field(default_factory=list)


class _ShiftLocks:
    """Uma trava por vaga. Só valem porque a API roda com um único processo."""

    def __init__(self) -> None:
        self._guard = Lock()
        self._locks: dict[str, Lock] = {}

    def of(self, shift_id: str) -> Lock:
        with self._guard:
            return self._locks.setdefault(shift_id, Lock())


class MatchingService:
    def __init__(
        self,
        repository: Repository,
        world: WorldCache,
        model: LogisticModel,
        *,
        llm: LLMClient | None = None,
        reescrever_motivos: bool = False,
        clock: Callable[[], datetime] = local_now,
    ) -> None:
        self._repository = repository
        self._world = world
        self._model = model
        self._llm = llm
        # Desligado por padrão: cinco chamadas em fila atrasam a tela e gastam a cota gratuita
        # do Gemini, e o texto montado por regra já diz o mesmo (ADR 0003).
        self._llm_dos_motivos = llm if reescrever_motivos else None
        self._clock = clock
        self._locks = _ShiftLocks()

    @property
    def model_version(self) -> str:
        return self._model.version

    def _shift_of_organization(self, shift_id: str, profile: Profile) -> tuple[Shift, Unit]:
        """A vaga, se for da organização de quem pede. De outra, é como se não existisse."""
        shift = self._repository.shift(shift_id)
        unit = self._world.unit(shift.unit_id) if shift else None
        if shift is None or unit is None or unit.organization_id != profile.organization_id:
            raise ApiError(404, "vaga_nao_encontrada", "Vaga não encontrada.")
        return shift, unit

    def extract(self, profile: Profile, text: str) -> ExtractionResult:
        """Só lê o texto. Nada é gravado: o pedido entra no banco quando o coordenador confere."""
        units = self._world.units_of(profile.organization_id or "")
        return extract(text, self._clock().date(), units, self._llm)

    def publish(
        self,
        profile: Profile,
        *,
        text: str,
        unit_id: str,
        specialty: str,
        starts_at: datetime,
        ends_at: datetime,
        urgency: str,
    ) -> tuple[Shift, list[str]]:
        """Publica a vaga com os campos conferidos. O texto é guardado, nunca obedecido."""
        unit = self._world.unit(unit_id)
        if unit is None or unit.organization_id != profile.organization_id:
            raise ApiError(404, "unidade_nao_encontrada", "Unidade não encontrada.")
        now = self._clock()
        first_day = now.date() - timedelta(days=1)
        last_day = now.date() + timedelta(days=MAX_DAYS_AHEAD)
        if not first_day <= starts_at.date() <= last_day:
            raise ApiError(422, "data_fora_da_janela", "A data da vaga está fora da janela aceita.")
        flags = detect_injection(text)
        request_id, shift = self._repository.publish(
            unit_id=unit_id,
            coordinator_id=profile.user_id,
            # O Postgres não guarda o caractere nulo; o sinal já foi registrado em `flags`.
            raw_text=text.replace("\x00", ""),
            specialty=specialty,
            starts_at=starts_at,
            ends_at=ends_at,
            period=shift_period(starts_at),
            is_weekend=starts_at.weekday() >= 5,
            urgency=urgency,
            now=now,
        )
        self._world.put_shift(shift)
        audit = RestAudit(self._repository, unit.organization_id, buffered=True)
        audit.append(
            now=now,
            actor_role="coordinator",
            actor_pseudo_id=profile.user_id,
            action="extraction_confirmed",
            entity_type="shift_request",
            entity_id=request_id,
            details={"flags": flags},
        )
        audit.append(
            now=now,
            actor_role="coordinator",
            actor_pseudo_id=profile.user_id,
            action="shift_published",
            entity_type="shift",
            entity_id=shift.id,
            details={"unit_id": unit_id, "specialty": specialty, "urgency": urgency},
        )
        audit.flush()
        return shift, flags

    def recommend(self, profile: Profile, shift_id: str) -> RecommendOutcome:
        """Roda o motor e grava o resultado. Não envia nenhuma oferta."""
        with self._locks.of(shift_id):
            shift, unit = self._shift_of_organization(shift_id, profile)
            if shift.status != "open":
                raise ApiError(409, "vaga_nao_aberta", "Esta vaga não está mais aberta.")
            # As exclusões contam: uma vaga sem elegíveis também já foi avaliada.
            if self._repository.shortlist(shift_id) or self._repository.has_exclusions(shift_id):
                raise ApiError(409, "ja_recomendada", "Esta vaga já tem recomendação.")
            dataset, store = self._world.engine(unit.organization_id)
            audit = RestAudit(self._repository, unit.organization_id, buffered=True)
            result = recommend(
                dataset,
                store,
                self._model,
                ShiftFields(
                    shift.unit_id, shift.specialty, shift.starts_at, shift.ends_at, shift.urgency
                ),
                self._clock(),
                client=self._llm_dos_motivos,
                audit=audit,
                key=shift_id,
            )
            evidence = _exclusion_evidence(result, dataset, store)
            self._repository.save_recommendations(
                [
                    {
                        "shift_id": shift_id,
                        "doctor_id": candidate.doctor_id,
                        "rank": candidate.rank,
                        "score": candidate.score,
                        "model_version": result.model_version,
                        # O banco só aceita as variáveis do ranking; as de contexto vão aos alertas.
                        "features": ranking_features(candidate.features),
                        "contributions": rounded_contributions(candidate.contributions),
                        "alerts": list(candidate.alerts),
                    }
                    for candidate in result.candidates
                ],
                [
                    {
                        "text": candidate.explanation.text,
                        "factors_cited": list(candidate.explanation.factors_cited),
                        "source": candidate.explanation.source,
                        # O template e a reescrita aceita passam ambos pela validação em código.
                        "validated": True,
                    }
                    for candidate in result.candidates
                ],
                [
                    {
                        "shift_id": shift_id,
                        "doctor_id": exclusion.doctor_id,
                        "rule_code": exclusion.rule_code,
                        "rule_text": exclusion.rule_text,
                        "evidence": evidence.get(exclusion.doctor_id),
                    }
                    for exclusion in result.exclusions
                ],
            )
            audit.flush()
            return RecommendOutcome(result, evidence, result.now)

    def approve(
        self,
        profile: Profile,
        shift_id: str,
        doctor_ids: list[str],
        justification: str | None = None,
    ) -> CascadeStep:
        """A decisão do coordenador. Só aqui a cascata começa, e só com quem foi recomendado.

        Aprovar quem tem alerta de jornada é uma exceção humana: pede uma justificativa escrita,
        que vai para a trilha sem CRM, telefone, e-mail nem documento (D2, ADR 0015).
        """
        with self._locks.of(shift_id):
            shift, unit = self._shift_of_organization(shift_id, profile)
            if shift.status != "open":
                raise ApiError(409, "vaga_nao_aberta", "Esta vaga não está mais aberta.")
            if self._repository.approved_ids(shift_id) is not None:
                raise ApiError(409, "ja_aprovada", "Esta vaga já foi aprovada.")
            rows = self._repository.shortlist_rows(shift_id)
            if not rows:
                raise ApiError(409, "sem_recomendacao", "Gere a recomendação antes de aprovar.")
            if set(doctor_ids) & set(self._skipped(shift_id)):
                raise ApiError(
                    422,
                    "medico_pulado",
                    "Um dos nomes foi pulado. Desfaça o pulo antes de aprovar.",
                )
            alerts = {row["doctor_id"]: list(row["alerts"] or []) for row in rows}
            exception = _exception(
                [alert for doctor_id in doctor_ids for alert in alerts.get(doctor_id, [])],
                justification,
            )
            now = self._clock()
            audit = RestAudit(self._repository, unit.organization_id)
            recommended = Shortlist(
                shift_id,
                self._model.version,
                tuple(ShortlistItem(row["doctor_id"]) for row in rows),
            )
            try:
                approve(
                    audit,
                    recommended,
                    doctor_ids,
                    now=now,
                    coordinator_id=profile.user_id,
                    exception=exception,
                )
            except ValueError as exc:
                raise ApiError(422, "fora_da_recomendacao", str(exc)) from exc
            return self._send_next(shift, unit, doctor_ids, [], now, audit)

    def _skipped(self, shift_id: str) -> list[str]:
        """Quem está pulado agora: a trilha só cresce, então desfazer é uma linha nova."""
        skipped: list[str] = []
        for row in self._repository.candidate_events(shift_id):
            doctor_id = row["entity_id"].split(":", 1)[1]
            if row["action"] == "recommendation_rejected" and doctor_id not in skipped:
                skipped.append(doctor_id)
            elif row["action"] == "recommendation_restored" and doctor_id in skipped:
                skipped.remove(doctor_id)
        return skipped

    def _candidate_of_open_shift(
        self, profile: Profile, shift_id: str, doctor_id: str
    ) -> tuple[Unit, int]:
        """Vaga aberta, ainda sem aprovação, e o médico entre os recomendados (com a posição)."""
        shift, unit = self._shift_of_organization(shift_id, profile)
        if shift.status != "open":
            raise ApiError(409, "vaga_nao_aberta", "Esta vaga não está mais aberta.")
        if self._repository.approved_ids(shift_id) is not None:
            raise ApiError(409, "ja_aprovada", "Esta vaga já foi aprovada.")
        return unit, self._rank_of(shift_id, doctor_id)

    def _rank_of(self, shift_id: str, doctor_id: str) -> int:
        for row in self._repository.shortlist_rows(shift_id):
            if row["doctor_id"] == doctor_id:
                return int(row["rank"])
        raise ApiError(422, "fora_da_recomendacao", "Este médico não está entre os recomendados.")

    def skip(self, profile: Profile, shift_id: str, doctor_id: str, reason: str | None) -> None:
        """O coordenador pula um nome. Não cancela a vaga: só tira o nome desta decisão (D3)."""
        with self._locks.of(shift_id):
            unit, rank = self._candidate_of_open_shift(profile, shift_id, doctor_id)
            if doctor_id in self._skipped(shift_id):
                return  # pular de novo não duplica o registro
            RestAudit(self._repository, unit.organization_id).append(
                now=self._clock(),
                actor_role="coordinator",
                actor_pseudo_id=profile.user_id,
                action="recommendation_rejected",
                entity_type="recommendation",
                entity_id=f"{shift_id}:{doctor_id}",
                model_version=self._model.version,
                details={
                    "shift_id": shift_id,
                    "doctor_id": doctor_id,
                    "rank": rank,
                    "reason": _clean_free_text(reason),
                },
            )

    def unskip(self, profile: Profile, shift_id: str, doctor_id: str) -> None:
        """Desfaz o pulo enquanto a vaga espera a decisão. A linha do pulo continua na trilha."""
        with self._locks.of(shift_id):
            unit, rank = self._candidate_of_open_shift(profile, shift_id, doctor_id)
            if doctor_id not in self._skipped(shift_id):
                return  # desfazer o que não está pulado não grava nada
            RestAudit(self._repository, unit.organization_id).append(
                now=self._clock(),
                actor_role="coordinator",
                actor_pseudo_id=profile.user_id,
                action="recommendation_restored",
                entity_type="recommendation",
                entity_id=f"{shift_id}:{doctor_id}",
                model_version=self._model.version,
                details={"shift_id": shift_id, "doctor_id": doctor_id, "rank": rank},
            )

    def feedback(
        self,
        profile: Profile,
        shift_id: str,
        doctor_id: str,
        helpful: bool,
        comment: str | None,
    ) -> None:
        """ "Esta explicação ajudou?". Fica na trilha e não treina nada (D3)."""
        _, unit = self._shift_of_organization(shift_id, profile)
        rank = self._rank_of(shift_id, doctor_id)
        RestAudit(self._repository, unit.organization_id).append(
            now=self._clock(),
            actor_role="coordinator",
            actor_pseudo_id=profile.user_id,
            action="explanation_feedback",
            entity_type="recommendation",
            entity_id=f"{shift_id}:{doctor_id}",
            model_version=self._model.version,
            details={
                "shift_id": shift_id,
                "doctor_id": doctor_id,
                "rank": rank,
                "helpful": helpful,
                "comment": _clean_free_text(comment),
            },
        )

    def decision_state(self, profile: Profile, shift_id: str) -> DecisionState:
        """A aprovação gravada e os nomes pulados, para a tela voltar igual depois de recarregar."""
        self._shift_of_organization(shift_id, profile)
        row = self._repository.approval(shift_id)
        skipped = self._skipped(shift_id)
        if row is None:
            return DecisionState(None, None, None, None, skipped)
        details = row["details"]
        return DecisionState(
            list(details["approved_doctor_ids"]),
            row["actor_pseudo_id"],
            local_from_db(row["occurred_at"]) if row.get("occurred_at") else None,
            details.get("excecao"),
            skipped,
        )

    def policy(self, profile: Profile) -> Policy:
        """A política da organização de quem pede: limites de jornada, raio, prazo e top-k."""
        dataset, _ = self._world.engine(profile.organization_id or "")
        return dataset.policy

    def contest(self, profile: Profile, offer_id: str, reason: str, text: str) -> dict[str, Any]:
        """O médico contesta a recomendação da própria oferta. Uma por oferta (D8, ADR 0015)."""
        offer = self._repository.offer(offer_id)
        if offer is None or offer.doctor_id != profile.doctor_id:
            raise ApiError(404, "oferta_nao_encontrada", "Oferta não encontrada.")
        shift = self._repository.shift(offer.shift_id)
        unit = self._world.unit(shift.unit_id) if shift else None
        if shift is None or unit is None:
            raise ApiError(404, "oferta_nao_encontrada", "Oferta não encontrada.")
        if self._repository.contestation_of_offer(offer_id) is not None:
            raise ApiError(409, "ja_contestada", "Esta oferta já foi contestada.")
        cleaned = _required_free_text(text, "Escreva por que você contesta a recomendação.")
        now = self._clock()
        contestation_id = str(uuid4())
        protocol = f"CT-{contestation_id[:8].upper()}"
        row = self._repository.add_contestation(
            {
                "id": contestation_id,
                "protocol": protocol,
                "organization_id": unit.organization_id,
                "offer_id": offer_id,
                "shift_id": offer.shift_id,
                "doctor_id": offer.doctor_id,
                "reason": reason,
                "text": cleaned,
                "status": "open",
                "created_at": db_from_local(now),
            }
        )
        # O texto fica na tabela, sob RLS; a trilha guarda só códigos e IDs.
        RestAudit(self._repository, unit.organization_id).append(
            now=now,
            actor_role="doctor",
            actor_pseudo_id=offer.doctor_id,
            action="contestation_opened",
            entity_type="contestation",
            entity_id=contestation_id,
            model_version=self._model.version,
            details={
                "offer_id": offer_id,
                "shift_id": offer.shift_id,
                "reason": reason,
                "protocol": protocol,
            },
        )
        return row

    def answer_contestation(
        self, profile: Profile, contestation_id: str, text: str
    ) -> dict[str, Any]:
        """O coordenador responde por escrito. A resposta e a trilha ficam para a auditoria."""
        current = self._repository.contestation(contestation_id)
        if current is None or current["organization_id"] != profile.organization_id:
            raise ApiError(404, "contestacao_nao_encontrada", "Contestação não encontrada.")
        cleaned = _required_free_text(text, "Escreva a resposta ao médico.")
        now = self._clock()
        answered = self._repository.answer_contestation(
            contestation_id, text=cleaned, answered_by=profile.user_id, now=now
        )
        if answered is None:
            raise ApiError(409, "ja_respondida", "Esta contestação já foi respondida.")
        RestAudit(self._repository, current["organization_id"]).append(
            now=now,
            actor_role="coordinator",
            actor_pseudo_id=profile.user_id,
            action="contestation_answered",
            entity_type="contestation",
            entity_id=contestation_id,
            model_version=self._model.version,
            details={
                "offer_id": current["offer_id"],
                "shift_id": current["shift_id"],
                "protocol": current["protocol"],
            },
        )
        return answered

    @staticmethod
    def model_card() -> dict[str, Any]:
        """A ficha do modelo ativo: o que usa, o que não usa, métricas, risco e limites."""
        return json.loads(MODEL_CARD_PATH.read_text(encoding="utf-8"))

    def reject(self, profile: Profile, shift_id: str) -> Shift:
        """O coordenador recusa a lista: a vaga é cancelada, e ninguém recebe oferta."""
        with self._locks.of(shift_id):
            shift, unit = self._shift_of_organization(shift_id, profile)
            if shift.status != "open":
                raise ApiError(409, "vaga_nao_aberta", "Esta vaga não está mais aberta.")
            updated = self._repository.set_shift_status(shift_id, "cancelled")
            if updated is None:
                raise ApiError(404, "vaga_nao_encontrada", "Vaga não encontrada.")
            self._world.put_shift(updated)
            RestAudit(self._repository, unit.organization_id).append(
                now=self._clock(),
                actor_role="coordinator",
                actor_pseudo_id=profile.user_id,
                action="recommendation_rejected",
                entity_type="shift",
                entity_id=shift_id,
                model_version=self._model.version,
            )
            return updated

    def respond(
        self, profile: Profile, offer_id: str, response: str, decline_reason: str | None
    ) -> tuple[Offer, str, CascadeStep | None]:
        """A resposta do médico à própria oferta: a oferta, o status da vaga e o próximo passo."""
        offer = self._repository.offer(offer_id)
        if offer is None or offer.doctor_id != profile.doctor_id:
            raise ApiError(404, "oferta_nao_encontrada", "Oferta não encontrada.")
        with self._locks.of(offer.shift_id):
            return self._respond_locked(offer, response, decline_reason)

    def _respond_locked(
        self, offer: Offer, response: str, decline_reason: str | None
    ) -> tuple[Offer, str, CascadeStep | None]:
        now = self._clock()
        if now >= offer.sent_at + timedelta(minutes=offer.ttl_minutes):
            raise ApiError(409, "oferta_expirada", "O prazo desta oferta já acabou.")
        shift = self._repository.shift(offer.shift_id)
        unit = self._world.unit(shift.unit_id) if shift else None
        if shift is None or unit is None:
            raise ApiError(404, "oferta_nao_encontrada", "Oferta não encontrada.")
        if response == "accepted":
            self._check_agenda(offer, shift, unit, now)
        closed = self._repository.close_offer(
            offer.id, response=response, responded_at=now, decline_reason=decline_reason
        )
        if closed is None:
            raise ApiError(409, "oferta_ja_fechada", "Esta oferta já foi fechada.")
        self._world.put_offer(closed)
        audit = RestAudit(self._repository, unit.organization_id)
        audit.append(
            now=now,
            actor_role="doctor",
            actor_pseudo_id=offer.doctor_id,
            action="offer_accepted" if response == "accepted" else "offer_declined",
            entity_type="offer",
            entity_id=offer.id,
            model_version=self._model.version,
            details={"shift_id": offer.shift_id, "decline_reason": decline_reason},
        )
        if response == "accepted":
            filled = self._repository.set_shift_status(offer.shift_id, "filled", filled_at=now)
            if filled is not None:
                self._world.put_shift(filled)
            return closed, "filled", None
        step = self._advance(shift, unit, now, audit)
        return closed, step.shift_status, step

    def _check_agenda(self, offer: Offer, shift: Shift, unit: Unit, now: datetime) -> None:
        """Quem aceita não pode ter ganhado outro plantão no mesmo horário enquanto decidia."""
        dataset, store = self._world.engine(unit.organization_id)
        code, _ = schedule_check(
            store.assignments_at(offer.doctor_id, now),
            shift.starts_at,
            shift.ends_at,
            dataset.policy,
        )
        if code:
            raise ApiError(409, "conflito_de_agenda", RULE_TEXTS[code])

    def advance(self, shift_id: str) -> CascadeStep:
        """Chamado pelo n8n. Sem a aprovação gravada na trilha, não existe próxima oferta."""
        with self._locks.of(shift_id):
            shift = self._repository.shift(shift_id)
            unit = self._world.unit(shift.unit_id) if shift else None
            if shift is None or unit is None:
                raise ApiError(404, "vaga_nao_encontrada", "Vaga não encontrada.")
            audit = RestAudit(self._repository, unit.organization_id)
            return self._advance(shift, unit, self._clock(), audit)

    def _advance(self, shift: Shift, unit: Unit, now: datetime, audit: RestAudit) -> CascadeStep:
        if shift.status in FINAL_STATUSES:
            return CascadeStep(shift.id, "nada_a_fazer", shift.status)
        approved = self._repository.approved_ids(shift.id)
        if approved is None:
            raise ApiError(409, "sem_aprovacao", "Sem a aprovação do coordenador não há oferta.")
        offers = self._repository.offers_of_shift(shift.id)
        for offer in offers:
            if offer.response != "pending":
                continue
            if now < offer.sent_at + timedelta(minutes=offer.ttl_minutes):
                return CascadeStep(shift.id, "aguardar", shift.status, offer)
            expired = self._repository.close_offer(offer.id, response="expired", responded_at=None)
            if expired is not None:
                self._world.put_offer(expired)
                audit.append(
                    now=now,
                    actor_role="system",
                    actor_pseudo_id="matching-api",
                    action="offer_expired",
                    entity_type="offer",
                    entity_id=offer.id,
                    model_version=self._model.version,
                    details={"shift_id": shift.id},
                )
        return self._send_next(shift, unit, approved, offers, now, audit)

    def _send_next(
        self,
        shift: Shift,
        unit: Unit,
        approved: list[str],
        offers: list[Offer],
        now: datetime,
        audit: RestAudit,
    ) -> CascadeStep:
        """Chama o próximo aprovado que passa nas regras. Sem ninguém, a vaga fica descoberta."""
        already_called = {offer.doctor_id for offer in offers}
        dataset, store = self._world.engine(unit.organization_id)
        skipped: list[tuple[str, str]] = []
        for doctor_id in approved:
            if doctor_id in already_called:
                continue
            doctor = self._world.doctor(doctor_id)
            if doctor is None:
                continue
            check = evaluate_candidate(
                doctor,
                specialty=shift.specialty,
                starts_at=shift.starts_at,
                ends_at=shift.ends_at,
                unit=unit,
                policy=dataset.policy,
                windows=dataset.windows.get(doctor_id, []),
                assignments=store.assignments_at(doctor_id, now),
            )
            if not check.eligible:
                skipped.append((doctor_id, check.rule_code or ""))
                continue
            offer = self._repository.add_offer(
                shift_id=shift.id,
                doctor_id=doctor_id,
                sequence_no=len(offers) + 1,
                ttl_minutes=dataset.policy.offer_ttl_minutes,
                now=now,
            )
            self._world.put_offer(offer)
            updated = self._repository.set_shift_status(shift.id, "offered")
            if updated is not None:
                self._world.put_shift(updated)
            audit.append(
                now=now,
                actor_role="system",
                actor_pseudo_id="matching-api",
                action="offer_sent",
                entity_type="offer",
                entity_id=offer.id,
                model_version=self._model.version,
                details={
                    "shift_id": shift.id,
                    "doctor_id": doctor_id,
                    "sequence_no": offer.sequence_no,
                    "skipped": _skipped_details(skipped),
                },
            )
            return CascadeStep(shift.id, "oferta_enviada", "offered", offer, skipped)
        updated = self._repository.set_shift_status(shift.id, "uncovered")
        if updated is not None:
            self._world.put_shift(updated)
        audit.append(
            now=now,
            actor_role="system",
            actor_pseudo_id="matching-api",
            action="shift_uncovered",
            entity_type="shift",
            entity_id=shift.id,
            model_version=self._model.version,
            details={"skipped": _skipped_details(skipped)},
        )
        return CascadeStep(shift.id, "sem_candidatos", "uncovered", None, skipped)


def _clean_free_text(text: str | None) -> str | None:
    """Texto livre que vai para a trilha: sem dado pessoal reconhecível e com tamanho limitado."""
    if text is None or not text.strip():
        return None
    return remove_personal_data(text.strip()[:MAX_FREE_TEXT])


def _required_free_text(text: str, message: str) -> str:
    """Texto que precisa sobrar depois de tirar o dado pessoal."""
    cleaned = _clean_free_text(text) or ""
    if not without_marks(cleaned):
        raise ApiError(422, "texto_obrigatorio", message)
    return cleaned


def _exception(alerts: list[str], justification: str | None) -> dict[str, Any] | None:
    """A exceção humana: os alertas aprovados e a justificativa. Sem alerta, não há exceção."""
    if not alerts:
        return None
    cleaned = _clean_free_text(justification) or ""
    if len(without_marks(cleaned)) < MIN_JUSTIFICATION:
        raise ApiError(
            422,
            "justificativa_obrigatoria",
            "Aprovar quem tem alerta de jornada pede uma justificativa escrita, "
            f"com pelo menos {MIN_JUSTIFICATION} caracteres.",
        )
    return {"alertas": list(dict.fromkeys(alerts)), "justificativa": cleaned}


def _exclusion_evidence(
    result: Recommendation, dataset: Dataset, store: FeatureStore
) -> dict[str, str]:
    """A evidência numérica de cada exclusão, com a agenda do instante da recomendação."""
    fields = result.fields
    if not (fields.specialty and fields.starts_at and fields.ends_at):
        return {}
    evidence: dict[str, str] = {}
    for exclusion in result.exclusions:
        doctor = dataset.doctors.get(exclusion.doctor_id)
        if doctor is None:
            continue
        agenda = store.assignments_at(doctor.id, result.now)
        check = evaluate_candidate(
            doctor,
            specialty=fields.specialty,
            starts_at=fields.starts_at,
            ends_at=fields.ends_at,
            unit=result.unit,
            policy=dataset.policy,
            windows=dataset.windows.get(doctor.id, []),
            assignments=agenda,
        )
        if check.eligible or check.rule_code != exclusion.rule_code:
            continue  # a agenda mudou entre o motor e esta conta: melhor sem evidência
        evidence[doctor.id] = exclusion_evidence(
            doctor,
            check,
            specialty=fields.specialty,
            starts_at=fields.starts_at,
            ends_at=fields.ends_at,
            policy=dataset.policy,
            agenda=agenda,
        )
    return evidence


def rounded_contributions(contributions: dict[str, float]) -> dict[str, float]:
    """Só as variáveis do contrato, com quatro casas e sem zero negativo."""
    return {name: round(contributions[name], 4) + 0.0 for name in RANKING_FEATURES}


def _skipped_details(skipped: list[tuple[str, str]]) -> list[dict[str, str]]:
    return [{"doctor_id": doctor_id, "rule_code": code} for doctor_id, code in skipped]


def ranking_features(features: dict[str, float]) -> dict[str, float]:
    """Só as variáveis do contrato do ranking."""
    return {name: features[name] for name in RANKING_FEATURES}


def excluded_by_rule(result: Recommendation) -> dict[str, int]:
    return dict(Counter(exclusion.rule_code for exclusion in result.exclusions).most_common())
