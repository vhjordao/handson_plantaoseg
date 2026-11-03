-- Carrega a amostra sintética nas tabelas do banco e desfaz tudo no fim. A CI roda este arquivo
-- para provar que os dados gerados cabem nas regras das migrações e que as colunas derivadas de
-- `offers` batem com o CSV. Rode com psql, a partir da raiz do repositório.
\set ON_ERROR_STOP on

begin;
set local timezone = 'America/Sao_Paulo';

\copy public.organizations (id, name, kind, created_at) from 'data/synthetic/sample/organizations.csv' csv header
\copy public.units (id, organization_id, name, kind, ownership, zone, lat, lon) from 'data/synthetic/sample/units.csv' csv header
\copy public.doctors (id, name_sim, crm_sim, phone_sim, crm_status, specialty, secondary_specialty, home_lat, home_lon, max_radius_km, preferred_period, home_zone, gender, age_band, registered_at) from 'data/synthetic/sample/doctors.csv' csv header
\copy public.doctor_availability (id, doctor_id, kind, weekday, on_date, start_time, end_time, valid_from, valid_to) from 'data/synthetic/sample/doctor_availability.csv' csv header
\copy public.policy_config (organization_id, max_continuous_hours, min_rest_hours, allow_secondary_specialty, min_overlap_ratio, default_radius_km, offer_ttl_minutes, top_k, effective_from) from 'data/synthetic/sample/policy_config.csv' csv header
\copy public.shift_requests (id, unit_id, coordinator_pseudo_id, created_at, raw_text, style, gt_unit_id, gt_specialty, gt_starts_at, gt_ends_at, gt_urgency, is_adversarial, attack_type) from 'data/synthetic/sample/shift_requests.csv' csv header
\copy public.shifts (id, unit_id, source_request_id, specialty, starts_at, ends_at, period, is_weekend, urgency, status, published_at, filled_at) from 'data/synthetic/sample/shifts.csv' csv header
\copy public.shift_compensation (shift_id, amount_brl_sim) from 'data/synthetic/sample/shift_compensation.csv' csv header

create temp table offers_csv (
  id uuid, shift_id uuid, doctor_id uuid, sequence_no integer,
  selection_source public.selection_source, sent_at timestamptz, ttl_minutes integer,
  responded_at timestamptz, response public.offer_response, decline_reason public.decline_reason,
  accepted boolean, attended boolean, y_success boolean, injected_violation boolean
) on commit drop;
\copy offers_csv from 'data/synthetic/sample/offers.csv' csv header

insert into public.offers (
  id, shift_id, doctor_id, sequence_no, selection_source, sent_at, ttl_minutes, responded_at,
  response, decline_reason, attended, injected_violation
)
select
  id, shift_id, doctor_id, sequence_no, selection_source, sent_at, ttl_minutes, responded_at,
  response, decline_reason, attended, injected_violation
from offers_csv;

do $$
declare
  different bigint;
begin
  select count(*) into different
  from public.offers o
  join offers_csv c using (id)
  where o.accepted is distinct from c.accepted or o.y_success is distinct from c.y_success;
  if different > 0 then
    raise exception '% ofertas com accepted ou y_success diferentes do CSV', different;
  end if;
end;
$$;

select
  (select count(*) from public.doctors) as doctors,
  (select count(*) from public.shifts) as shifts,
  (select count(*) from public.offers) as offers;

rollback;
