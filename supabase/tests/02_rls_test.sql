-- Quem enxerga o quê: isolamento entre hospitais e entre médicos.
--
-- Cenário: organizações A e B, cada uma com um hospital.
--   D1 recebeu oferta em A; D2 recebeu oferta em B.
--   D3 foi recomendado em A, mas o coordenador ainda não aprovou: não há oferta.
--   D4 foi excluído pelas regras nas duas organizações.
begin;
create extension if not exists pgtap with schema extensions;
select plan(49);

insert into public.organizations (id, name, kind) values
  ('a0000000-0000-4000-8000-00000000000a', 'Rede A', 'rede_hospitais_privados'),
  ('a0000000-0000-4000-8000-00000000000b', 'Rede B', 'controle_rls');
insert into public.units (id, organization_id, name, zone, lat, lon) values
  ('b0000000-0000-4000-8000-00000000000a', 'a0000000-0000-4000-8000-00000000000a', 'Hospital A', 'centro', -10, -50),
  ('b0000000-0000-4000-8000-00000000000b', 'a0000000-0000-4000-8000-00000000000b', 'Hospital B', 'norte', -10, -50);
insert into public.doctors
  (id, name_sim, crm_sim, phone_sim, crm_status, specialty, home_lat, home_lon, max_radius_km,
   preferred_period, home_zone, gender, age_band) values
  ('d0000000-0000-4000-8000-000000000001', 'D1', 'SIM-TT-000001', '+55 00 00000-0001', 'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'F', '35-44'),
  ('d0000000-0000-4000-8000-000000000002', 'D2', 'SIM-TT-000002', '+55 00 00000-0002', 'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'M', '45-54'),
  ('d0000000-0000-4000-8000-000000000003', 'D3', 'SIM-TT-000003', '+55 00 00000-0003', 'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'F', '25-34'),
  ('d0000000-0000-4000-8000-000000000004', 'D4', 'SIM-TT-000004', '+55 00 00000-0004', 'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'M', '55+');
insert into public.doctor_availability (id, doctor_id, kind, weekday, start_time, end_time, valid_from) values
  ('c0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'available', 4, '19:00', '07:00', '2026-11-01'),
  ('c0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'available', 4, '19:00', '07:00', '2026-11-01');
insert into public.policy_config (organization_id, default_radius_km, offer_ttl_minutes, effective_from) values
  ('a0000000-0000-4000-8000-00000000000a', 15, 60, '2026-11-01'),
  ('a0000000-0000-4000-8000-00000000000b', 15, 60, '2026-11-01');
insert into public.shift_requests (id, unit_id, coordinator_pseudo_id, raw_text) values
  ('90000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000a', 'c1000000-0000-4000-8000-00000000000a', 'Preciso de pediatra em A'),
  ('90000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000b', 'c1000000-0000-4000-8000-00000000000b', 'Preciso de pediatra em B');
insert into public.shifts (id, unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency) values
  ('e0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000a', 'pediatria', '2026-11-20 19:00-03', '2026-11-21 07:00-03', 'night', false, 'high'),
  ('e0000000-0000-4000-8000-00000000000c', 'b0000000-0000-4000-8000-00000000000a', 'pediatria', '2026-11-21 19:00-03', '2026-11-22 07:00-03', 'night', true, 'low'),
  ('e0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000b', 'pediatria', '2026-11-20 19:00-03', '2026-11-21 07:00-03', 'night', false, 'high');
insert into public.shift_compensation (shift_id, amount_brl_sim) values
  ('e0000000-0000-4000-8000-00000000000a', 1500),
  ('e0000000-0000-4000-8000-00000000000b', 1500);
insert into public.offers (id, shift_id, doctor_id, sequence_no, selection_source, ttl_minutes) values
  ('f0000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 1, 'system_recommendation', 60),
  ('f0000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000002', 1, 'system_recommendation', 60);
insert into public.model_registry (model_version, kind, trained_at, features) values
  ('modelo-teste', 'logistic_regression', now(), array['distance_km']);
insert into public.recommendations (id, shift_id, doctor_id, rank, score, model_version, features) values
  ('70000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 1, 0.7, 'modelo-teste', '{"distance_km": 1}'),
  ('70000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000003', 2, 0.6, 'modelo-teste', '{"distance_km": 2}'),
  ('70000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000002', 1, 0.7, 'modelo-teste', '{"distance_km": 1}');
insert into public.recommendation_exclusions (id, shift_id, doctor_id, rule_code, rule_text) values
  ('60000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000004', 'outside_radius', 'Fora do raio'),
  ('60000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000004', 'outside_radius', 'Fora do raio');
insert into public.explanations (id, recommendation_id, text, source) values
  ('50000000-0000-4000-8000-000000000001', '70000000-0000-4000-8000-000000000001', 'Mora perto', 'template'),
  ('50000000-0000-4000-8000-000000000003', '70000000-0000-4000-8000-000000000003', 'Mora perto', 'template'),
  ('50000000-0000-4000-8000-000000000002', '70000000-0000-4000-8000-000000000002', 'Mora perto', 'template');
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'coordenador.a@exemplo.invalid'),
  ('10000000-0000-4000-8000-00000000000b', 'coordenador.b@exemplo.invalid'),
  ('20000000-0000-4000-8000-00000000000a', 'admin.a@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000001', 'medico.1@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000002', 'medico.2@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000003', 'medico.3@exemplo.invalid'),
  ('40000000-0000-4000-8000-000000000000', 'sem.perfil@exemplo.invalid');
insert into public.profiles (id, role, organization_id, doctor_id) values
  ('10000000-0000-4000-8000-00000000000a', 'coordinator', 'a0000000-0000-4000-8000-00000000000a', null),
  ('10000000-0000-4000-8000-00000000000b', 'coordinator', 'a0000000-0000-4000-8000-00000000000b', null),
  ('20000000-0000-4000-8000-00000000000a', 'admin', 'a0000000-0000-4000-8000-00000000000a', null),
  ('30000000-0000-4000-8000-000000000001', 'doctor', null, 'd0000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', 'doctor', null, 'd0000000-0000-4000-8000-000000000002'),
  ('30000000-0000-4000-8000-000000000003', 'doctor', null, 'd0000000-0000-4000-8000-000000000003');
insert into public.audit_log (organization_id, actor_role, actor_pseudo_id, action, entity_type, entity_id) values
  ('a0000000-0000-4000-8000-00000000000a', 'coordinator', 'c1000000', 'shift_published', 'shift', 'e0000000'),
  ('a0000000-0000-4000-8000-00000000000b', 'coordinator', 'c2000000', 'shift_published', 'shift', 'e0000001');

-- Coordenador da organização A

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "10000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

select set_eq('select id from public.profiles', array['10000000-0000-4000-8000-00000000000a'::uuid], 'coordenador lê só o próprio perfil');
select set_eq('select id from public.organizations', array['a0000000-0000-4000-8000-00000000000a'::uuid], 'coordenador lê só a própria organização');
select set_eq('select id from public.units', array['b0000000-0000-4000-8000-00000000000a'::uuid], 'hospital A não lê o hospital B');
select set_eq('select id from public.shifts', array['e0000000-0000-4000-8000-00000000000a'::uuid, 'e0000000-0000-4000-8000-00000000000c'::uuid], 'coordenador lê só as vagas da organização');
select set_eq('select id from public.shift_requests', array['90000000-0000-4000-8000-00000000000a'::uuid], 'coordenador lê só os pedidos da organização');
select set_eq('select id from public.offers', array['f0000000-0000-4000-8000-00000000000a'::uuid], 'coordenador lê só as ofertas da organização');
select set_eq('select id from public.recommendations', array['70000000-0000-4000-8000-000000000001'::uuid, '70000000-0000-4000-8000-000000000003'::uuid], 'coordenador lê só as recomendações da organização');
select set_eq('select id from public.explanations', array['50000000-0000-4000-8000-000000000001'::uuid, '50000000-0000-4000-8000-000000000003'::uuid], 'coordenador lê só as explicações da organização');
select set_eq('select id from public.recommendation_exclusions', array['60000000-0000-4000-8000-00000000000a'::uuid], 'coordenador lê só as exclusões da organização');
select set_eq('select id from public.doctors', array['d0000000-0000-4000-8000-000000000001'::uuid, 'd0000000-0000-4000-8000-000000000003'::uuid], 'coordenador vê só candidatos das próprias vagas, sem o cadastro de quem foi excluído');
select set_eq('select action::text from public.audit_log', array['shift_published'], 'coordenador lê a trilha da organização');
select is((select count(*) from public.audit_log), 1::bigint, 'coordenador não lê a trilha de outra organização');
select is_empty('select effective_from from public.policy_config', 'política de jornada é só do administrador');
select is_empty('select model_version from public.model_registry', 'registro de modelos é só do administrador');
select is_empty('select id from public.doctor_availability', 'coordenador não lê a disponibilidade dos médicos');

select throws_ok('select shift_id from public.shift_compensation', '42501', null, 'coordenador não lê o valor do plantão');
select throws_ok('select home_lat from public.doctors', '42501', null, 'coordenador não lê a residência do médico');
select throws_ok('select gender from public.doctors', '42501', null, 'coordenador não lê atributo protegido');
select throws_ok('select phone_sim from public.doctors', '42501', null, 'coordenador não lê o telefone do médico');
select throws_ok('select gt_unit_id from public.shift_requests', '42501', null, 'coordenador não lê o gabarito do simulador');
select throws_ok('select y_success from public.offers', '42501', null, 'coordenador não lê o rótulo do modelo');

select throws_ok(
  $$ insert into public.offers (shift_id, doctor_id, sequence_no, selection_source, ttl_minutes)
     values ('e0000000-0000-4000-8000-00000000000c', 'd0000000-0000-4000-8000-000000000001', 1, 'system_recommendation', 60) $$,
  '42501', null, 'o navegador não cria oferta: sem aprovação pela API, não há oferta'
);
select throws_ok(
  $$ update public.profiles set organization_id = 'a0000000-0000-4000-8000-00000000000b' $$,
  '42501', null, 'ninguém muda de organização pelo navegador'
);
select throws_ok(
  $$ update public.profiles set role = 'admin' $$,
  '42501', null, 'ninguém muda o próprio papel pelo navegador'
);
select throws_ok(
  $$ delete from public.shifts $$,
  '42501', null, 'o navegador não apaga vaga'
);

reset role;

-- Coordenador da organização B

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "10000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);

select set_eq('select id from public.shifts', array['e0000000-0000-4000-8000-00000000000b'::uuid], 'hospital B não lê as vagas do hospital A');
select set_eq('select id from public.doctors', array['d0000000-0000-4000-8000-000000000002'::uuid], 'hospital B não lê os candidatos do hospital A');

reset role;

-- Administrador da organização A

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "20000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);

select set_eq('select organization_id from public.policy_config', array['a0000000-0000-4000-8000-00000000000a'::uuid], 'administrador lê só a política da própria organização');
select set_eq($$ select model_version from public.model_registry where model_version = 'modelo-teste' $$, array['modelo-teste'], 'administrador lê o registro de modelos');

reset role;

-- Médico D1, que recebeu oferta

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);

select set_eq('select id from public.offers', array['f0000000-0000-4000-8000-00000000000a'::uuid], 'médico só vê as próprias ofertas');
select set_eq('select id from public.doctors', array['d0000000-0000-4000-8000-000000000001'::uuid], 'médico só vê o próprio cadastro');
select set_eq('select id from public.doctor_availability', array['c0000000-0000-4000-8000-000000000001'::uuid], 'médico só vê a própria disponibilidade');
select set_eq('select id from public.shifts', array['e0000000-0000-4000-8000-00000000000a'::uuid], 'médico só vê as vagas em que foi chamado');
select set_eq('select id from public.units', array['b0000000-0000-4000-8000-00000000000a'::uuid], 'médico só vê os hospitais em que foi chamado');
select set_eq('select id from public.recommendations', array['70000000-0000-4000-8000-000000000001'::uuid], 'médico vê a própria recomendação depois da oferta');
select set_eq('select id from public.explanations', array['50000000-0000-4000-8000-000000000001'::uuid], 'médico vê o motivo da própria oferta');
select is_empty('select id from public.organizations', 'médico não lê organizações');
select is_empty('select id from public.shift_requests', 'médico não lê os pedidos em texto livre');
select is_empty('select id from public.recommendation_exclusions', 'médico não lê exclusões');
select is_empty('select seq from public.audit_log', 'médico não lê a trilha da organização');
select is_empty('select effective_from from public.policy_config', 'médico não lê a política de jornada');

reset role;

-- Médico D3: recomendado, mas sem aprovação do coordenador

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-4000-8000-000000000003", "role": "authenticated"}', true);

select is_empty('select id from public.recommendations', 'sem o clique do coordenador, o médico não vê a recomendação');
select is_empty('select id from public.explanations', 'sem o clique do coordenador, o médico não vê a explicação');
select is_empty('select id from public.shifts', 'sem o clique do coordenador, o médico não vê a vaga');

reset role;

-- Usuário autenticado sem perfil, como um login anônimo antes de receber a persona

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);

select is_empty(
  $$ select 'organizations' from public.organizations
     union all select 'units' from public.units
     union all select 'doctors' from public.doctors
     union all select 'shifts' from public.shifts
     union all select 'offers' from public.offers
     union all select 'recommendations' from public.recommendations
     union all select 'audit_log' from public.audit_log
     union all select 'profiles' from public.profiles $$,
  'sem perfil não se enxerga nada'
);

reset role;

-- Sem login

set local role anon;
select set_config('request.jwt.claims', '', true);

select throws_ok('select id from public.organizations', '42501', null, 'sem login não se lê organização');
select throws_ok('select id from public.doctors', '42501', null, 'sem login não se lê médico');
select throws_ok('select seq from public.audit_log', '42501', null, 'sem login não se lê a trilha');

reset role;

-- Chave de serviço, só no servidor

set local role service_role;

select ok((select count(*) from public.shift_compensation) >= 2, 'a chave de serviço lê tudo, e por isso fica só no servidor');

reset role;

select * from finish();
rollback;
