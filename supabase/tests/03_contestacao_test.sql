-- Contestação: quem lê, quem não escreve e as regras da tabela.
--
-- Cenário: organizações A e B. D1 recebeu oferta em A e contestou; D2 recebeu oferta em B.
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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
  ('d0000000-0000-4000-8000-000000000002', 'D2', 'SIM-TT-000002', '+55 00 00000-0002', 'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'M', '45-54');
insert into public.shifts (id, unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency) values
  ('e0000000-0000-4000-8000-00000000000a', 'b0000000-0000-4000-8000-00000000000a', 'pediatria', '2026-11-20 19:00-03', '2026-11-21 07:00-03', 'night', false, 'high'),
  ('e0000000-0000-4000-8000-00000000000b', 'b0000000-0000-4000-8000-00000000000b', 'pediatria', '2026-11-20 19:00-03', '2026-11-21 07:00-03', 'night', false, 'high');
insert into public.offers (id, shift_id, doctor_id, sequence_no, selection_source, ttl_minutes) values
  ('f0000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 1, 'system_recommendation', 60),
  ('f0000000-0000-4000-8000-00000000000b', 'e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000002', 1, 'system_recommendation', 60);
insert into public.contestations (id, protocol, organization_id, offer_id, shift_id, doctor_id, reason, text) values
  ('c7000000-0000-4000-8000-00000000000a', 'CT-TESTE-A', 'a0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-00000000000a', 'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 'unfair_order', 'Moro mais perto do que diz a recomendação');
insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-00000000000a', 'coordenador.a@exemplo.invalid'),
  ('10000000-0000-4000-8000-00000000000b', 'coordenador.b@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000001', 'medico.1@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000002', 'medico.2@exemplo.invalid');
insert into public.profiles (id, role, organization_id, doctor_id) values
  ('10000000-0000-4000-8000-00000000000a', 'coordinator', 'a0000000-0000-4000-8000-00000000000a', null),
  ('10000000-0000-4000-8000-00000000000b', 'coordinator', 'a0000000-0000-4000-8000-00000000000b', null),
  ('30000000-0000-4000-8000-000000000001', 'doctor', null, 'd0000000-0000-4000-8000-000000000001'),
  ('30000000-0000-4000-8000-000000000002', 'doctor', null, 'd0000000-0000-4000-8000-000000000002');

-- Regras da tabela

select throws_ok(
  $$ insert into public.contestations (protocol, organization_id, offer_id, shift_id, doctor_id, reason, text)
     values ('CT-TESTE-B', 'a0000000-0000-4000-8000-00000000000a', 'f0000000-0000-4000-8000-00000000000a',
       'e0000000-0000-4000-8000-00000000000a', 'd0000000-0000-4000-8000-000000000001', 'other', 'De novo') $$,
  '23505', null, 'uma contestação por oferta'
);
select throws_ok(
  $$ update public.contestations set status = 'answered' where protocol = 'CT-TESTE-A' $$,
  '23514', null, 'respondida precisa de texto, autor e hora da resposta'
);

-- Médico D1, que contestou

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-4000-8000-000000000001", "role": "authenticated"}', true);
select set_eq('select protocol from public.contestations', array['CT-TESTE-A'], 'médico lê a própria contestação');
select throws_ok(
  $$ insert into public.contestations (protocol, organization_id, offer_id, shift_id, doctor_id, reason, text)
     values ('CT-TESTE-C', 'a0000000-0000-4000-8000-00000000000b', 'f0000000-0000-4000-8000-00000000000b',
       'e0000000-0000-4000-8000-00000000000b', 'd0000000-0000-4000-8000-000000000001', 'other', 'Pelo navegador') $$,
  '42501', null, 'o navegador não abre contestação: só a API'
);
reset role;

-- Médico D2, de outra organização

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-4000-8000-000000000002", "role": "authenticated"}', true);
select is_empty('select id from public.contestations', 'médico não lê a contestação de outro médico');
reset role;

-- Coordenador da organização A

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "10000000-0000-4000-8000-00000000000a", "role": "authenticated"}', true);
select set_eq('select protocol from public.contestations', array['CT-TESTE-A'], 'coordenador lê as contestações da organização');
select throws_ok(
  $$ update public.contestations set status = 'answered', answer_text = 'Pelo navegador',
       answered_by = 'x', answered_at = now() $$,
  '42501', null, 'o navegador não responde: só a API, com a trilha'
);
select throws_ok(
  $$ delete from public.contestations $$,
  '42501', null, 'ninguém apaga contestação pelo navegador'
);
reset role;

-- Coordenador da organização B

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "10000000-0000-4000-8000-00000000000b", "role": "authenticated"}', true);
select is_empty('select id from public.contestations', 'hospital B não lê a contestação do hospital A');
reset role;

-- Sem login e chave de serviço

set local role anon;
select set_config('request.jwt.claims', '', true);
select throws_ok('select id from public.contestations', '42501', null, 'sem login não se lê contestação');
reset role;

set local role service_role;
select lives_ok(
  $$ update public.contestations set status = 'answered', answer_text = 'Revisamos: a distância está certa.',
       answered_by = '10000000-0000-4000-8000-00000000000a', answered_at = now()
     where protocol = 'CT-TESTE-A' $$,
  'a API responde, com texto, autor e hora'
);
reset role;

select * from finish();
rollback;
