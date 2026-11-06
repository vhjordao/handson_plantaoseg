"""Rotas da API. A regra fica em `service.py`; aqui só entram autenticação, papel e formato.

Toda rota de escrita precisa de um usuário com perfil. As rotas de `/internal` usam o segredo do
n8n e ficam fora da rota pública do Traefik: só quem está dentro do servidor as alcança.
"""

import hmac
from datetime import timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Header, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.api.errors import ApiError
from app.api.repository import Profile
from app.api.schemas import (
    AdvanceOut,
    ApproveIn,
    CandidateOut,
    DecisionOut,
    ExceptionOut,
    ExclusionOut,
    ExplanationOut,
    ExtractedFields,
    ExtractIn,
    ExtractOut,
    FeedbackIn,
    FeedbackOut,
    FieldReadingOut,
    HealthOut,
    ModelCardOut,
    OfferOut,
    PolicyOut,
    ProfileOut,
    PublishIn,
    RecommendationOut,
    RejectOut,
    ReloadOut,
    RespondIn,
    RespondOut,
    ShiftOut,
    SkipIn,
    SpanOut,
    UnskipIn,
)
from app.api.service import (
    CascadeStep,
    DecisionState,
    MatchingService,
    excluded_by_rule,
    ranking_features,
    rounded_contributions,
)
from app.llm.extraction import FIELD_KEYS
from app.models import Offer, Shift
from app.rules import RULE_TEXTS

router = APIRouter()
_bearer = HTTPBearer(auto_error=False)
COORDINATOR_ROLES = ("coordinator", "admin")


def get_service(request: Request) -> MatchingService:
    return request.app.state.service


def current_profile(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> Profile:
    """Quem chama. O JWT prova a identidade; o perfil, relido a cada chamada, dá o papel."""
    if credentials is None:
        raise ApiError(401, "token_ausente", "Faça login para continuar.")
    user_id = request.app.state.verifier.user_id(credentials.credentials)
    profile = request.app.state.repository.profile(user_id)
    if profile is None:
        raise ApiError(403, "sem_perfil", "Este login ainda não tem acesso.")
    return profile


def coordinator(profile: Annotated[Profile, Depends(current_profile)]) -> Profile:
    if profile.role not in COORDINATOR_ROLES:
        raise ApiError(403, "so_coordenador", "Só o coordenador faz isso.")
    return profile


def doctor(profile: Annotated[Profile, Depends(current_profile)]) -> Profile:
    if profile.role != "doctor":
        raise ApiError(403, "so_medico", "Só o médico faz isso.")
    return profile


def internal_secret(
    request: Request, x_internal_secret: Annotated[str | None, Header()] = None
) -> None:
    expected = request.app.state.webhook_secret.encode("utf-8")
    if not hmac.compare_digest((x_internal_secret or "").encode("utf-8"), expected):
        raise ApiError(401, "segredo_invalido", "Chamada interna não autorizada.")


Service = Annotated[MatchingService, Depends(get_service)]
Coordinator = Annotated[Profile, Depends(coordinator)]
Doctor = Annotated[Profile, Depends(doctor)]


def _offer_out(offer: Offer) -> OfferOut:
    return OfferOut(
        id=offer.id,
        shift_id=offer.shift_id,
        doctor_id=offer.doctor_id,
        sequence_no=offer.sequence_no,
        sent_at=offer.sent_at,
        ttl_minutes=offer.ttl_minutes,
        expires_at=offer.sent_at + timedelta(minutes=offer.ttl_minutes),
        response=offer.response,
        responded_at=offer.responded_at,
    )


def _step_out(step: CascadeStep) -> AdvanceOut:
    return AdvanceOut(
        shift_id=step.shift_id,
        action=step.action,
        shift_status=step.shift_status,
        offer=_offer_out(step.offer) if step.offer else None,
        skipped=[
            ExclusionOut(doctor_id=doctor_id, rule_code=code, rule_text=RULE_TEXTS.get(code, ""))
            for doctor_id, code in step.skipped
        ],
    )


def _shift_out(shift: Shift, flags: list[str]) -> ShiftOut:
    return ShiftOut(
        id=shift.id,
        unit_id=shift.unit_id,
        specialty=shift.specialty,
        starts_at=shift.starts_at,
        ends_at=shift.ends_at,
        period=shift.period,
        is_weekend=shift.is_weekend,
        urgency=shift.urgency,
        status=shift.status,
        published_at=shift.published_at,
        flags=flags,
    )


@router.get("/health", response_model=HealthOut)
def health(service: Service) -> HealthOut:
    """Sem login e sem dado: serve à verificação do Compose e do Traefik."""
    return HealthOut(model_version=service.model_version)


@router.get("/me", response_model=ProfileOut)
def me(profile: Annotated[Profile, Depends(current_profile)]) -> ProfileOut:
    return ProfileOut(
        user_id=profile.user_id,
        role=profile.role,
        organization_id=profile.organization_id,
        doctor_id=profile.doctor_id,
    )


@router.post("/shifts/extract", response_model=ExtractOut)
def extract_shift(body: ExtractIn, profile: Coordinator, service: Service) -> ExtractOut:
    """Tela 1: o texto vira campos para o coordenador conferir. Nada é gravado."""
    result = service.extract(profile, body.text)
    fields = result.fields
    return ExtractOut(
        extracted=ExtractedFields(
            unit_id=fields.unit_id,
            specialty=fields.specialty,
            starts_at=fields.starts_at,
            ends_at=fields.ends_at,
            urgency=fields.urgency,
        ),
        readings=[
            FieldReadingOut(
                key=key,
                origin=result.readings[key].origin,
                span=SpanOut(start=span[0], end=span[1])
                if (span := result.readings[key].span)
                else None,
            )
            for key in FIELD_KEYS
            if key in result.readings
        ],
        missing_required=fields.missing_required(),
        source=result.source,
        flags=list(result.flags),
        llm_error=result.llm_error,
    )


@router.post("/shifts", response_model=ShiftOut, status_code=201)
def publish_shift(body: PublishIn, profile: Coordinator, service: Service) -> ShiftOut:
    """O coordenador conferiu os campos: a vaga é publicada, ainda sem ninguém chamado."""
    shift, flags = service.publish(
        profile,
        text=body.text,
        unit_id=str(body.unit_id),
        specialty=body.specialty,
        starts_at=body.starts_at,
        ends_at=body.ends_at,
        urgency=body.urgency,
    )
    return _shift_out(shift, flags)


@router.post(
    "/shifts/{shift_id}/recommendations", response_model=RecommendationOut, status_code=201
)
def recommend_shift(shift_id: UUID, profile: Coordinator, service: Service) -> RecommendationOut:
    """Telas 2 e 3: top 5 com o motivo e os excluídos com a regra. Nenhuma oferta sai daqui."""
    outcome = service.recommend(profile, str(shift_id))
    result = outcome.result
    return RecommendationOut(
        shift_id=str(shift_id),
        model_version=result.model_version,
        generated_at=outcome.generated_at,
        pool_size=result.pool_size,
        eligible_count=result.eligible_count,
        candidates=[
            CandidateOut(
                rank=candidate.rank,
                doctor_id=candidate.doctor_id,
                score=candidate.score,
                features=ranking_features(candidate.features),
                contributions=rounded_contributions(candidate.contributions),
                alerts=list(candidate.alerts),
                explanation=ExplanationOut(
                    text=candidate.explanation.text,
                    factors_cited=list(candidate.explanation.factors_cited),
                    source=candidate.explanation.source,
                ),
                explanation_fallback=candidate.explanation_fallback,
            )
            for candidate in result.candidates
        ],
        exclusions=[
            ExclusionOut(
                doctor_id=exclusion.doctor_id,
                rule_code=exclusion.rule_code,
                rule_text=exclusion.rule_text,
                evidence=outcome.evidence.get(exclusion.doctor_id),
            )
            for exclusion in result.exclusions
        ],
        excluded_by_rule=excluded_by_rule(result),
    )


@router.post("/shifts/{shift_id}/approve", response_model=AdvanceOut)
def approve_shift(
    shift_id: UUID,
    body: ApproveIn,
    profile: Coordinator,
    service: Service,
    request: Request,
    tasks: BackgroundTasks,
) -> AdvanceOut:
    """O clique do coordenador. É a única forma de uma oferta nascer.

    Se uma oferta saiu, o n8n é avisado depois da resposta, para o clique não esperar por ele. O
    aviso é um só: daí em diante, o n8n pergunta à API quanto esperar (ADR 0013).
    """
    step = service.approve(
        profile, str(shift_id), [str(i) for i in body.doctor_ids], body.justification
    )
    notifier = request.app.state.notifier
    if notifier is not None and step.action == "oferta_enviada":
        tasks.add_task(notifier.cascade_started, step.shift_id)
    return _step_out(step)


def _decision_out(shift_id: str, state: DecisionState) -> DecisionOut:
    exception = state.exception
    return DecisionOut(
        shift_id=shift_id,
        approved_doctor_ids=state.approved_ids,
        decided_by=state.decided_by,
        decided_at=state.decided_at,
        exception=ExceptionOut(
            alerts=exception["alertas"], justification=exception["justificativa"]
        )
        if exception
        else None,
        skipped=state.skipped,
    )


@router.get("/shifts/{shift_id}/decision", response_model=DecisionOut)
def decision_state(shift_id: UUID, profile: Coordinator, service: Service) -> DecisionOut:
    """A decisão já tomada e os nomes pulados, para a tela voltar igual depois de recarregar."""
    return _decision_out(str(shift_id), service.decision_state(profile, str(shift_id)))


@router.post("/shifts/{shift_id}/skip", response_model=DecisionOut)
def skip_candidate(
    shift_id: UUID, body: SkipIn, profile: Coordinator, service: Service
) -> DecisionOut:
    """Tira um nome desta decisão, sem cancelar a vaga. Pular de novo não grava outra linha."""
    service.skip(profile, str(shift_id), str(body.doctor_id), body.reason)
    return _decision_out(str(shift_id), service.decision_state(profile, str(shift_id)))


@router.post("/shifts/{shift_id}/unskip", response_model=DecisionOut)
def unskip_candidate(
    shift_id: UUID, body: UnskipIn, profile: Coordinator, service: Service
) -> DecisionOut:
    """Desfaz o pulo enquanto a vaga espera a decisão. A trilha guarda as duas linhas."""
    service.unskip(profile, str(shift_id), str(body.doctor_id))
    return _decision_out(str(shift_id), service.decision_state(profile, str(shift_id)))


@router.post("/shifts/{shift_id}/feedback", response_model=FeedbackOut, status_code=201)
def explanation_feedback(
    shift_id: UUID, body: FeedbackIn, profile: Coordinator, service: Service
) -> FeedbackOut:
    """ "Esta explicação ajudou?". Vai para a trilha; não treina o modelo."""
    service.feedback(profile, str(shift_id), str(body.doctor_id), body.helpful, body.comment)
    return FeedbackOut()


@router.get("/policy", response_model=PolicyOut)
def organization_policy(profile: Coordinator, service: Service) -> PolicyOut:
    """Os limites que o filtro de regras usa na organização de quem pede."""
    policy = service.policy(profile)
    return PolicyOut(
        max_continuous_hours=policy.max_continuous_hours,
        min_rest_hours=policy.min_rest_hours,
        default_radius_km=policy.default_radius_km,
        offer_ttl_minutes=policy.offer_ttl_minutes,
        top_k=policy.top_k,
        allow_secondary_specialty=policy.allow_secondary_specialty,
    )


@router.get("/model-card", response_model=ModelCardOut)
def model_card(profile: Coordinator, service: Service) -> ModelCardOut:
    """A ficha do modelo ativo, a mesma que a tela mostra no modo de demonstração."""
    return ModelCardOut(**service.model_card())


@router.post("/shifts/{shift_id}/reject", response_model=RejectOut)
def reject_shift(shift_id: UUID, profile: Coordinator, service: Service) -> RejectOut:
    shift = service.reject(profile, str(shift_id))
    return RejectOut(shift_id=shift.id, shift_status=shift.status)


@router.post("/offers/{offer_id}/respond", response_model=RespondOut)
def respond_offer(offer_id: UUID, body: RespondIn, profile: Doctor, service: Service) -> RespondOut:
    """Tela 4: o médico aceita ou recusa a própria oferta. A recusa chama o próximo aprovado."""
    offer, status, step = service.respond(
        profile, str(offer_id), body.response, body.decline_reason
    )
    return RespondOut(
        offer=_offer_out(offer), shift_status=status, next=_step_out(step) if step else None
    )


@router.post(
    "/internal/cascade/{shift_id}/advance",
    response_model=AdvanceOut,
    dependencies=[Depends(internal_secret)],
)
def advance_cascade(shift_id: UUID, service: Service) -> AdvanceOut:
    """O n8n chama quando o prazo acaba. Sem oferta vencida, responde `aguardar`."""
    return _step_out(service.advance(str(shift_id)))


@router.post("/internal/reload", response_model=ReloadOut, dependencies=[Depends(internal_secret)])
def reload_world(request: Request) -> ReloadOut:
    """Relê os dados do motor depois de uma mudança feita fora da API."""
    world = request.app.state.world
    world.load()
    return ReloadOut(counts=world.counts())
