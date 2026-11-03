-- Quem lê o quê. O navegador só lê: toda escrita com regra passa pela API, com a chave de serviço.
-- O papel e a organização vêm de public.profiles; quem não tem perfil não enxerga nada.
-- Cada tabela tem uma única política de leitura, e as colunas restritas não têm permissão.

revoke all on all tables in schema public from anon, authenticated, service_role;

grant usage on schema private to authenticated, service_role;

-- A API usa a chave de serviço, que ignora a RLS. Mesmo assim ela não altera nem apaga a trilha.
grant select, insert, update, delete on all tables in schema public to service_role;
revoke update, delete on public.audit_log from service_role;

-- Ajudantes das políticas. Rodam com os privilégios do dono para evitar recursão entre políticas,
-- e cada um só devolve o que pertence ao usuário da sessão. O schema private não é exposto pela API.
create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create function private.current_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.organization_id from public.profiles p where p.id = (select auth.uid());
$$;

create function private.current_doctor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.doctor_id from public.profiles p where p.id = (select auth.uid());
$$;

create function private.organization_unit_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
  from public.units u
  where u.organization_id = (select private.current_organization_id());
$$;

create function private.organization_shift_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.shifts s
  join public.units u on u.id = s.unit_id
  where u.organization_id = (select private.current_organization_id());
$$;

-- Candidatos da organização: recomendados ou chamados para as vagas dela. Os excluídos pelas
-- regras ficam de fora: a tela 3 mostra só o ID e a evidência, sem abrir o cadastro.
create function private.organization_candidate_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.doctor_id
  from public.recommendations r
  join public.shifts s on s.id = r.shift_id
  join public.units u on u.id = s.unit_id
  where u.organization_id = (select private.current_organization_id())
  union
  select o.doctor_id
  from public.offers o
  join public.shifts s on s.id = o.shift_id
  join public.units u on u.id = s.unit_id
  where u.organization_id = (select private.current_organization_id());
$$;

create function private.offered_shift_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.shift_id
  from public.offers o
  where o.doctor_id = (select private.current_doctor_id());
$$;

create function private.offered_unit_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.unit_id
  from public.offers o
  join public.shifts s on s.id = o.shift_id
  where o.doctor_id = (select private.current_doctor_id());
$$;

revoke execute on function private.current_app_role() from public, anon, service_role;
revoke execute on function private.current_organization_id() from public, anon, service_role;
revoke execute on function private.current_doctor_id() from public, anon, service_role;
revoke execute on function private.organization_unit_ids() from public, anon, service_role;
revoke execute on function private.organization_shift_ids() from public, anon, service_role;
revoke execute on function private.organization_candidate_ids() from public, anon, service_role;
revoke execute on function private.offered_shift_ids() from public, anon, service_role;
revoke execute on function private.offered_unit_ids() from public, anon, service_role;

grant execute on function private.current_app_role() to authenticated;
grant execute on function private.current_organization_id() to authenticated;
grant execute on function private.current_doctor_id() to authenticated;
grant execute on function private.organization_unit_ids() to authenticated;
grant execute on function private.organization_shift_ids() to authenticated;
grant execute on function private.organization_candidate_ids() to authenticated;
grant execute on function private.offered_shift_ids() to authenticated;
grant execute on function private.offered_unit_ids() to authenticated;

revoke execute on function private.audit_log_hash(public.audit_log) from public, anon, authenticated;
revoke execute on function private.audit_log_chain() from public, anon, authenticated, service_role;
revoke execute on function private.audit_log_is_append_only() from public, anon, authenticated, service_role;
revoke execute on function public.verify_audit_chain() from public, anon, authenticated;
grant execute on function private.audit_log_hash(public.audit_log) to service_role;
grant execute on function public.verify_audit_chain() to service_role;

alter table public.organizations enable row level security;
alter table public.units enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.policy_config enable row level security;
alter table public.shift_requests enable row level security;
alter table public.shifts enable row level security;
alter table public.shift_compensation enable row level security;
alter table public.offers enable row level security;
alter table public.model_registry enable row level security;
alter table public.recommendations enable row level security;
alter table public.recommendation_exclusions enable row level security;
alter table public.explanations enable row level security;
alter table public.profiles enable row level security;
alter table public.audit_log enable row level security;

-- shift_compensation não tem nenhuma permissão nem política: o navegador nunca a lê.

grant select (id, role, organization_id, doctor_id, created_at) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

grant select (id, name, kind, created_at) on public.organizations to authenticated;
create policy organizations_select_own on public.organizations
  for select to authenticated
  using (id = (select private.current_organization_id()));

grant select (id, organization_id, name, kind, ownership, zone, lat, lon) on public.units to authenticated;
create policy units_select_related on public.units
  for select to authenticated
  using (
    organization_id = (select private.current_organization_id())
    or id in (select private.offered_unit_ids())
  );

-- Sem phone_sim, home_lat, home_lon, home_zone, gender, age_band e registered_at.
grant select (
  id, name_sim, crm_sim, crm_status, specialty, secondary_specialty, max_radius_km, preferred_period
) on public.doctors to authenticated;
create policy doctors_select_self_or_candidate on public.doctors
  for select to authenticated
  using (
    id = (select private.current_doctor_id())
    or id in (select private.organization_candidate_ids())
  );

grant select (
  id, doctor_id, kind, weekday, on_date, start_time, end_time, valid_from, valid_to
) on public.doctor_availability to authenticated;
create policy doctor_availability_select_own on public.doctor_availability
  for select to authenticated
  using (doctor_id = (select private.current_doctor_id()));

grant select (
  organization_id, max_continuous_hours, min_rest_hours, allow_secondary_specialty,
  min_overlap_ratio, default_radius_km, offer_ttl_minutes, top_k, effective_from
) on public.policy_config to authenticated;
create policy policy_config_select_admin on public.policy_config
  for select to authenticated
  using (
    (select private.current_app_role()) = 'admin'
    and organization_id = (select private.current_organization_id())
  );

-- Sem style, gt_*, is_adversarial e attack_type, que são gabarito e controle do simulador.
grant select (id, unit_id, coordinator_pseudo_id, created_at, raw_text) on public.shift_requests to authenticated;
create policy shift_requests_select_organization on public.shift_requests
  for select to authenticated
  using (unit_id in (select private.organization_unit_ids()));

grant select (
  id, unit_id, source_request_id, specialty, starts_at, ends_at, period, is_weekend,
  urgency, status, published_at, filled_at
) on public.shifts to authenticated;
create policy shifts_select_related on public.shifts
  for select to authenticated
  using (
    unit_id in (select private.organization_unit_ids())
    or id in (select private.offered_shift_ids())
  );

-- Sem selection_source, y_success e injected_violation, que são controle e rótulo do modelo.
grant select (
  id, shift_id, doctor_id, sequence_no, sent_at, ttl_minutes, responded_at, response,
  decline_reason, accepted, attended
) on public.offers to authenticated;
create policy offers_select_parties on public.offers
  for select to authenticated
  using (
    doctor_id = (select private.current_doctor_id())
    or shift_id in (select private.organization_shift_ids())
  );

grant select (
  model_version, kind, trained_at, train_period, test_period, features, metrics, label, status
) on public.model_registry to authenticated;
create policy model_registry_select_admin on public.model_registry
  for select to authenticated
  using ((select private.current_app_role()) = 'admin');

-- O médico só vê a própria recomendação depois de receber a oferta: sem o clique do coordenador,
-- nada aparece para ele.
grant select (
  id, shift_id, doctor_id, rank, score, model_version, features, alerts, created_at
) on public.recommendations to authenticated;
create policy recommendations_select_parties on public.recommendations
  for select to authenticated
  using (
    shift_id in (select private.organization_shift_ids())
    or (
      doctor_id = (select private.current_doctor_id())
      and shift_id in (select private.offered_shift_ids())
    )
  );

grant select (id, shift_id, doctor_id, rule_code, rule_text, created_at) on public.recommendation_exclusions to authenticated;
create policy recommendation_exclusions_select_organization on public.recommendation_exclusions
  for select to authenticated
  using (shift_id in (select private.organization_shift_ids()));

grant select (
  id, recommendation_id, text, factors_cited, source, llm_model, prompt_version, validated, created_at
) on public.explanations to authenticated;
create policy explanations_select_via_recommendation on public.explanations
  for select to authenticated
  using (recommendation_id in (select r.id from public.recommendations r));

grant select (
  id, seq, occurred_at, organization_id, actor_role, actor_pseudo_id, action, entity_type,
  entity_id, model_version, details, prev_hash, hash
) on public.audit_log to authenticated;
create policy audit_log_select_organization on public.audit_log
  for select to authenticated
  using (organization_id = (select private.current_organization_id()));
