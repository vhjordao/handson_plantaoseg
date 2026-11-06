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
from app.privacy import MAX_FREE_TEXT

# O mesmo limite de `shift_requests.raw_text`. O motor só usa os primeiros 500 caracteres.
MAX_RAW_TEXT = 5000
MAX_SHIFT_HOURS = 24
MAX_APPROVED = 20

Specialty = Literal["clinica_medica", "pediatria"]
Urgency = Literal["low", "medium", "high"]
DeclineReason = Literal["distance", "fatigue", "schedule", "other"]
FieldKey = Literal["unit_id", "specialty", "starts_at", "ends_at", "urgency"]


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


class SpanOut(ApiModel):
    """Posição no texto original, em unidades UTF-16 (como `String.slice` na tela)."""

    start: int
    end: int


class FieldReadingOut(ApiModel):
    """De onde veio cada campo: escrito no texto, deduzido ou ausente. Sem percentual."""

    key: FieldKey
    origin: Literal["found", "inferred", "missing"]
    span: SpanOut | None


class ExtractOut(ApiModel):
    """O que a máquina entendeu do texto. O coordenador confere antes de publicar."""

    extracted: ExtractedFields
    readings: list[FieldReadingOut]
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
    # Contribuição de cada variável em relação à média dos elegíveis: o "Ver motivos" da tela.
    contributions: dict[str, float]
    alerts: list[str]
    explanation: ExplanationOut
    # Código do guardrail quando a reescrita da IA foi tentada e não valeu; senão, nulo.
    explanation_fallback: str | None


class ExclusionOut(ApiModel):
    doctor_id: str
    rule_code: str
    rule_text: str
    # A evidência numérica ("Mora a 18,2 km; o raio declarado é 15 km."), quando calculável.
    evidence: str | None = None


class RecommendationOut(ApiModel):
    """Só recomenda: nenhuma oferta sai daqui. A oferta depende da aprovação do coordenador."""

    shift_id: str
    model_version: str
    generated_at: datetime
    pool_size: int
    eligible_count: int
    candidates: list[CandidateOut]
    exclusions: list[ExclusionOut]
    excluded_by_rule: dict[str, int]
    simulacao: Literal[True] = True


class ApproveIn(ApiModel):
    """Quem o coordenador aprovou, na ordem em que devem ser chamados."""

    doctor_ids: list[UUID] = Field(min_length=1, max_length=MAX_APPROVED)
    # Obrigatória quando algum aprovado tem alerta de jornada (exceção humana, D2).
    justification: str | None = Field(default=None, max_length=MAX_FREE_TEXT)

    @field_validator("doctor_ids")
    @classmethod
    def _no_repeats(cls, value: list[UUID]) -> list[UUID]:
        if len(set(value)) != len(value):
            raise ValueError("o mesmo médico aparece mais de uma vez")
        return value


class SkipIn(ApiModel):
    """Tirar um nome desta decisão. O motivo é opcional e vai para a trilha sem dado pessoal."""

    doctor_id: UUID
    reason: str | None = Field(default=None, max_length=MAX_FREE_TEXT)


class UnskipIn(ApiModel):
    doctor_id: UUID


class FeedbackIn(ApiModel):
    """ "Esta explicação ajudou?". Fica na trilha e não treina nada."""

    doctor_id: UUID
    helpful: bool
    comment: str | None = Field(default=None, max_length=MAX_FREE_TEXT)


class FeedbackOut(ApiModel):
    recorded: Literal[True] = True


class ExceptionOut(ApiModel):
    alerts: list[str]
    justification: str


class DecisionOut(ApiModel):
    """A decisão gravada na trilha (ou nenhuma ainda) e quem está pulado agora."""

    shift_id: str
    approved_doctor_ids: list[str] | None
    decided_by: str | None
    decided_at: datetime | None
    exception: ExceptionOut | None
    skipped: list[str]


class PolicyOut(ApiModel):
    """`policy_config` da organização: configuração do projeto, não norma verificada."""

    max_continuous_hours: float
    min_rest_hours: float
    default_radius_km: float
    offer_ttl_minutes: int
    top_k: int
    allow_secondary_specialty: bool
    simulacao: Literal[True] = True


class FeatureWeightOut(ApiModel):
    feature: str
    weight: float


class FeatureNotUsedOut(ApiModel):
    name: str
    reason: str


class MetricOut(ApiModel):
    name: str
    value: str


class RiskClassOut(ApiModel):
    preliminary: str
    note: str


class ModelCardOut(ApiModel):
    """A ficha do modelo ativo. Os textos ficam em português, como a tela os mostra."""

    version: str
    type: str
    trained_on: str
    features_used: list[FeatureWeightOut]
    features_not_used: list[FeatureNotUsedOut]
    metrics: list[MetricOut]
    risk_class: RiskClassOut
    limits: list[str]
    simulacao: Literal[True] = True


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
