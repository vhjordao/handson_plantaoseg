"""Contrato da API em Pydantic. Campo a mais é recusado: o corpo da chamada também é entrada hostil.

Horas em hora local de São Paulo, sem fuso. Hora com fuso é aceita na entrada e convertida. Nenhuma
resposta traz nome, CRM, telefone nem valor de plantão: só IDs pseudônimos, e a web lê o cadastro
sob RLS.
"""

from datetime import datetime, timedelta
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.tempo import local_input

# O mesmo limite de `shift_requests.raw_text`. O motor só usa os primeiros 500 caracteres.
MAX_RAW_TEXT = 5000
MAX_SHIFT_HOURS = 24
MAX_APPROVED = 20

Specialty = Literal["clinica_medica", "pediatria"]
Urgency = Literal["low", "medium", "high"]
DeclineReason = Literal["distance", "fatigue", "schedule", "other"]


class ApiModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HealthOut(ApiModel):
    status: Literal["ok"] = "ok"
    model_version: str
    simulacao: Literal[True] = True


class ProfileOut(ApiModel):
    user_id: str
    role: Literal["coordinator", "doctor", "admin"]
    organization_id: str | None
    doctor_id: str | None


class ExtractIn(ApiModel):
    text: str = Field(min_length=1, max_length=MAX_RAW_TEXT)


class ExtractedFields(ApiModel):
    unit_id: str | None
    specialty: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    urgency: str | None


class ExtractOut(ApiModel):
    """O que a máquina entendeu do texto. O coordenador confere antes de publicar."""

    extracted: ExtractedFields
    missing_required: list[str]
    source: Literal["regras", "llm"]
    flags: list[str]
    llm_error: str | None
    simulacao: Literal[True] = True


class PublishIn(ApiModel):
    """Os campos já conferidos pelo coordenador, junto com o texto original."""

    text: str = Field(min_length=1, max_length=MAX_RAW_TEXT)
    unit_id: UUID
    specialty: Specialty
    starts_at: datetime
    ends_at: datetime
    urgency: Urgency

    @field_validator("starts_at", "ends_at")
    @classmethod
    def _to_local(cls, value: datetime) -> datetime:
        return local_input(value)

    @model_validator(mode="after")
    def _interval(self) -> "PublishIn":
        if self.ends_at <= self.starts_at:
            raise ValueError("o fim precisa ser depois do início")
        if self.ends_at - self.starts_at > timedelta(hours=MAX_SHIFT_HOURS):
            raise ValueError(f"a vaga não pode passar de {MAX_SHIFT_HOURS} h")
        return self


class ShiftOut(ApiModel):
    id: str
    unit_id: str
    specialty: str
    starts_at: datetime
    ends_at: datetime
    period: str
    is_weekend: bool
    urgency: str
    status: str
    published_at: datetime
    flags: list[str] = []
    simulacao: Literal[True] = True


class ExplanationOut(ApiModel):
    text: str
    factors_cited: list[str]
    source: Literal["template", "llm"]


class CandidateOut(ApiModel):
    rank: int
    doctor_id: str
    score: float
    features: dict[str, float]
    alerts: list[str]
    explanation: ExplanationOut


class ExclusionOut(ApiModel):
    doctor_id: str
    rule_code: str
    rule_text: str


class RecommendationOut(ApiModel):
    """Só recomenda: nenhuma oferta sai daqui. A oferta depende da aprovação do coordenador."""

    shift_id: str
    model_version: str
    pool_size: int
    eligible_count: int
    candidates: list[CandidateOut]
    exclusions: list[ExclusionOut]
    excluded_by_rule: dict[str, int]
    simulacao: Literal[True] = True


class ApproveIn(ApiModel):
    """Quem o coordenador aprovou, na ordem em que devem ser chamados."""

    doctor_ids: list[UUID] = Field(min_length=1, max_length=MAX_APPROVED)

    @field_validator("doctor_ids")
    @classmethod
    def _no_repeats(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("o mesmo médico aparece mais de uma vez")
        return value


class OfferOut(ApiModel):
    id: str
    shift_id: str
    doctor_id: str
    sequence_no: int
    sent_at: datetime
    ttl_minutes: int
    expires_at: datetime
    response: str
    responded_at: datetime | None


class AdvanceOut(ApiModel):
    """O que a cascata fez. O n8n só usa isto para saber quanto esperar: quem decide é a API."""

    shift_id: str
    action: Literal["aguardar", "oferta_enviada", "sem_candidatos", "nada_a_fazer"]
    shift_status: str
    offer: OfferOut | None = None
    skipped: list[ExclusionOut] = []


class RejectOut(ApiModel):
    shift_id: str
    shift_status: str


class RespondIn(ApiModel):
    response: Literal["accepted", "declined"]
    decline_reason: DeclineReason | None = None

    @model_validator(mode="after")
    def _reason_only_on_decline(self) -> "RespondIn":
        if self.decline_reason is not None and self.response != "declined":
            raise ValueError("motivo só vale para recusa")
        return self


class RespondOut(ApiModel):
    offer: OfferOut
    shift_status: str
    next: AdvanceOut | None = None


class ReloadOut(ApiModel):
    counts: dict[str, int]
