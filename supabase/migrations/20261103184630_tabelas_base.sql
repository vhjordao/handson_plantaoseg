-- PlantãoSeguro: tabelas do dicionário de dados (docs/dados/dicionario-de-dados.md, v0.4).
-- Tudo é simulação: nenhum dado real de médico, paciente ou hospital.
-- `doctors_latent`, o gabarito do simulador, não entra no banco.
-- Decisões em docs/adr/0008-banco-no-supabase.md.

-- Nada novo fica acessível sem uma permissão explícita (ver a migração acesso_e_rls).
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role;

create type public.organization_kind as enum ('rede_hospitais_privados', 'controle_rls');
create type public.unit_kind as enum ('PS');
create type public.unit_ownership as enum ('privado');
create type public.city_zone as enum ('centro', 'norte', 'sul', 'leste', 'oeste');
create type public.crm_status as enum ('active', 'suspended', 'expired');
create type public.specialty as enum ('clinica_medica', 'pediatria');
create type public.preferred_period as enum ('night', 'day', 'weekend', 'any');
create type public.simulated_gender as enum ('F', 'M');
create type public.age_band as enum ('25-34', '35-44', '45-54', '55+');
create type public.availability_kind as enum ('available', 'blocked');
create type public.shift_period as enum ('night', 'day');
create type public.urgency as enum ('low', 'medium', 'high');
create type public.shift_status as enum ('open', 'offered', 'filled', 'uncovered', 'cancelled');
create type public.request_style as enum ('formal', 'abreviado', 'com_erros', 'ambiguo', 'adversarial');
create type public.attack_type as enum (
  'ignore_rules', 'leak_secret', 'inject_payment', 'forge_fields', 'oversize',
  'control_chars', 'language_switch', 'role_play', 'pii_exfiltration', 'prompt_leak'
);
create type public.selection_source as enum ('manual_history', 'system_recommendation');
create type public.offer_response as enum ('pending', 'accepted', 'declined', 'expired');
create type public.decline_reason as enum ('distance', 'fatigue', 'schedule', 'other');
create type public.exclusion_rule as enum (
  'crm_inactive', 'specialty_mismatch', 'outside_radius', 'unavailable',
  'schedule_conflict', 'continuous_hours_exceeded', 'rest_violation'
);
create type public.explanation_source as enum ('llm', 'template');
create type public.model_kind as enum ('baseline', 'logistic_regression', 'lightgbm');
create type public.model_status as enum ('candidate', 'active', 'retired');
create type public.app_role as enum ('coordinator', 'doctor', 'admin');

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind public.organization_kind not null,
  created_at timestamptz not null default now()
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  name text not null,
  kind public.unit_kind not null default 'PS',
  ownership public.unit_ownership not null default 'privado',
  zone public.city_zone not null,
  lat double precision not null check (lat between -90 and 90),
  lon double precision not null check (lon between -180 and 180)
);
create index units_organization_id_idx on public.units (organization_id);
comment on column public.units.lat is 'Coordenada fictícia, numa cidade imaginária; nunca endereço real.';

-- Colunas de papel pii-sim e auditoria ficam sem permissão para o navegador (acesso_e_rls).
create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  name_sim text not null,
  crm_sim text not null unique check (crm_sim ~ '^SIM-[A-Z]{2}-[0-9]{6}$'),
  phone_sim text not null check (phone_sim ~ '^\+55 00 [0-9]{5}-[0-9]{4}$'),
  crm_status public.crm_status not null,
  specialty public.specialty not null,
  secondary_specialty public.specialty check (secondary_specialty <> specialty),
  home_lat double precision not null check (home_lat between -90 and 90),
  home_lon double precision not null check (home_lon between -180 and 180),
  max_radius_km double precision not null check (max_radius_km > 0),
  preferred_period public.preferred_period not null,
  home_zone public.city_zone not null,
  gender public.simulated_gender not null,
  age_band public.age_band not null,
  registered_at timestamptz not null default now()
);
comment on table public.doctors is 'Médicos simulados. O prefixo SIM do CRM impede confusão com CRM real.';
comment on column public.doctors.id is 'ID pseudônimo: o único identificador do médico que pode ir ao LLM.';
comment on column public.doctors.home_zone is 'Papel auditoria: proxy geográfico; nunca entra no ranking nem no LLM.';
comment on column public.doctors.gender is 'Papel auditoria: nunca entra no ranking nem no LLM.';
comment on column public.doctors.age_band is 'Papel auditoria: nunca entra no ranking nem no LLM.';

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id),
  kind public.availability_kind not null,
  weekday smallint check (weekday between 0 and 6),
  on_date date,
  start_time time not null,
  end_time time not null,
  valid_from date not null,
  valid_to date,
  check (num_nonnulls(weekday, on_date) = 1),
  check (valid_to is null or valid_to >= valid_from)
);
create index doctor_availability_doctor_id_idx on public.doctor_availability (doctor_id);
comment on column public.doctor_availability.weekday is '0 = segunda a 6 = domingo. Se end_time < start_time, a janela cruza a meia-noite.';

create table public.policy_config (
  organization_id uuid not null references public.organizations (id),
  max_continuous_hours integer not null default 24 check (max_continuous_hours > 0),
  min_rest_hours integer not null default 11 check (min_rest_hours >= 0),
  allow_secondary_specialty boolean not null default true,
  min_overlap_ratio double precision not null default 1 check (min_overlap_ratio between 0 and 1),
  default_radius_km double precision not null check (default_radius_km > 0),
  offer_ttl_minutes integer not null check (offer_ttl_minutes > 0),
  top_k integer not null default 5 check (top_k > 0),
  effective_from date not null,
  primary key (organization_id, effective_from)
);

-- raw_text é entrada hostil. Os campos gt_* são gabarito do simulador: nulos nos pedidos reais
-- da execução e nunca visíveis ao navegador nem ao LLM. O limite existe porque o ataque
-- `oversize` faz parte dos dados; a API corta o texto antes de usá-lo.
create table public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id),
  coordinator_pseudo_id uuid not null,
  created_at timestamptz not null default now(),
  raw_text text not null check (char_length(raw_text) <= 5000),
  style public.request_style,
  gt_unit_id uuid references public.units (id),
  gt_specialty public.specialty,
  gt_starts_at timestamptz,
  gt_ends_at timestamptz,
  gt_urgency public.urgency,
  is_adversarial boolean not null default false,
  attack_type public.attack_type,
  check ((attack_type is not null) = is_adversarial)
);
create index shift_requests_unit_id_idx on public.shift_requests (unit_id);
create index shift_requests_gt_unit_id_idx on public.shift_requests (gt_unit_id);

-- Sem nenhum campo de valor ou pagamento: isso fica em shift_compensation (Res. CFM 2.460/2026,
-- validar com jurídico).
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units (id),
  source_request_id uuid references public.shift_requests (id),
  specialty public.specialty not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  period public.shift_period not null,
  is_weekend boolean not null,
  urgency public.urgency not null,
  status public.shift_status not null default 'open',
  published_at timestamptz not null default now(),
  filled_at timestamptz,
  check (ends_at > starts_at),
  check (filled_at is null or filled_at >= published_at),
  check ((status = 'filled') = (filled_at is not null))
);
create index shifts_unit_id_idx on public.shifts (unit_id);
create index shifts_source_request_id_idx on public.shifts (source_request_id);
create index shifts_starts_at_idx on public.shifts (starts_at);

create table public.shift_compensation (
  shift_id uuid primary key references public.shifts (id),
  amount_brl_sim numeric(12, 2) not null check (amount_brl_sim >= 0)
);
comment on table public.shift_compensation is 'Restrita: valor simulado do plantão. Fora do ranking e do LLM, e sem nenhum acesso do navegador.';

-- accepted e y_success são derivados, para nunca ficarem incoerentes com a resposta.
create table public.offers (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  doctor_id uuid not null references public.doctors (id),
  sequence_no integer not null check (sequence_no > 0),
  selection_source public.selection_source not null,
  sent_at timestamptz not null default now(),
  ttl_minutes integer not null check (ttl_minutes > 0),
  responded_at timestamptz,
  response public.offer_response not null default 'pending',
  decline_reason public.decline_reason,
  accepted boolean not null generated always as (response = 'accepted') stored,
  attended boolean,
  y_success boolean not null generated always as (response = 'accepted' and coalesce(attended, false)) stored,
  injected_violation boolean not null default false,
  unique (shift_id, doctor_id),
  unique (shift_id, sequence_no),
  check (responded_at >= sent_at),
  check ((responded_at is null) = (response in ('pending', 'expired'))),
  check (decline_reason is null or response = 'declined'),
  check (attended is null or response = 'accepted')
);
create index offers_doctor_id_idx on public.offers (doctor_id);
comment on column public.offers.y_success is 'Alvo do ranking: aceitou e compareceu. Papel rótulo.';

create table public.model_registry (
  model_version text primary key,
  kind public.model_kind not null,
  trained_at timestamptz not null,
  train_period text,
  test_period text,
  features text[] not null check (features <@ array[
    'specialty_match', 'distance_km', 'availability_overlap_hours', 'acceptance_rate_90d',
    'attendance_rate_90d', 'hours_since_last_shift', 'night_shift_preference_match'
  ]::text[]),
  metrics jsonb not null default '{}',
  label text not null default 'simulacao' check (label = 'simulacao'),
  status public.model_status not null default 'candidate'
);

-- A lista fechada de variáveis repete RANKING_FEATURES (features.py): pagamento, valor e atributo
-- protegido não cabem aqui. tests/test_contrato_banco.py confere que as duas listas são iguais.
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  doctor_id uuid not null references public.doctors (id),
  rank integer not null check (rank > 0),
  score double precision not null check (score between 0 and 1),
  model_version text not null references public.model_registry (model_version),
  features jsonb not null check (
    jsonb_typeof(features) = 'object'
    and features - array[
      'specialty_match', 'distance_km', 'availability_overlap_hours', 'acceptance_rate_90d',
      'attendance_rate_90d', 'hours_since_last_shift', 'night_shift_preference_match'
    ]::text[] = '{}'::jsonb
  ),
  alerts jsonb not null default '[]' check (jsonb_typeof(alerts) = 'array'),
  created_at timestamptz not null default now()
);
create index recommendations_shift_id_rank_idx on public.recommendations (shift_id, rank);
create index recommendations_doctor_id_idx on public.recommendations (doctor_id);
create index recommendations_model_version_idx on public.recommendations (model_version);

create table public.recommendation_exclusions (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references public.shifts (id),
  doctor_id uuid not null references public.doctors (id),
  rule_code public.exclusion_rule not null,
  rule_text text not null,
  created_at timestamptz not null default now()
);
create index recommendation_exclusions_shift_id_idx on public.recommendation_exclusions (shift_id);
create index recommendation_exclusions_doctor_id_idx on public.recommendation_exclusions (doctor_id);

create table public.explanations (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null unique references public.recommendations (id),
  text text not null,
  factors_cited text[] not null default '{}',
  source public.explanation_source not null,
  llm_model text,
  prompt_version text,
  validated boolean not null default false,
  created_at timestamptz not null default now()
);

-- Um médico não pertence a uma organização; coordenador e administrador pertencem a uma só.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  organization_id uuid references public.organizations (id),
  doctor_id uuid unique references public.doctors (id),
  created_at timestamptz not null default now(),
  check (
    (role = 'doctor' and doctor_id is not null and organization_id is null)
    or (role in ('coordinator', 'admin') and organization_id is not null and doctor_id is null)
  )
);
create index profiles_organization_id_idx on public.profiles (organization_id);
comment on table public.profiles is 'Papel e organização de cada usuário. A RLS consulta esta tabela; o navegador não a altera.';
