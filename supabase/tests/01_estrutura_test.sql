-- Estrutura, permissões e regras de integridade do banco.
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

-- Tabelas e permissões

select tables_are(
  'public',
  array[
    'organizations', 'units', 'doctors', 'doctor_availability', 'policy_config', 'shift_requests',
    'shifts', 'shift_compensation', 'offers', 'model_registry', 'recommendations',
    'recommendation_exclusions', 'explanations', 'profiles', 'audit_log'
  ],
  'só existem as tabelas do dicionário; doctors_latent fica fora do banco'
);

select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' and not c.relrowsecurity $$,
  'toda tabela pública tem RLS ligada'
);

select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and (has_table_privilege('anon', c.oid, 'select,insert,update,delete,truncate,references,trigger')
            or has_any_column_privilege('anon', c.oid, 'select,insert,update,references')) $$,
  'anon não tem nenhuma permissão em tabela pública'
);

select is_empty(
  $$ select c.relname from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
       and (has_table_privilege('authenticated', c.oid, 'insert,update,delete,truncate,references,trigger')
            or has_any_column_privilege('authenticated', c.oid, 'insert,update,references')) $$,
  'o navegador não escreve em nenhuma tabela pública'
);

select ok(
  not has_any_column_privilege('authenticated', 'public.shift_compensation', 'select'),
  'o navegador não lê nenhuma coluna de shift_compensation'
);

select is_empty(
  $$ select t || '.' || c from (values
       ('doctors', 'phone_sim'), ('doctors', 'home_lat'), ('doctors', 'home_lon'),
       ('doctors', 'home_zone'), ('doctors', 'gender'), ('doctors', 'age_band'),
       ('doctors', 'registered_at'),
       ('shift_requests', 'style'), ('shift_requests', 'gt_unit_id'),
       ('shift_requests', 'gt_specialty'), ('shift_requests', 'gt_starts_at'),
       ('shift_requests', 'gt_ends_at'), ('shift_requests', 'gt_urgency'),
       ('shift_requests', 'is_adversarial'), ('shift_requests', 'attack_type'),
       ('offers', 'selection_source'), ('offers', 'y_success'), ('offers', 'injected_violation')
     ) as restricted (t, c)
     where has_column_privilege('authenticated', format('public.%I', t), c, 'select') $$,
  'o navegador não lê colunas de dado pessoal, auditoria, gabarito ou rótulo'
);

select ok(
  not has_table_privilege('service_role', 'public.audit_log', 'update,delete,truncate'),
  'a chave de serviço não tem permissão de alterar a trilha, além do gatilho que barra'
);

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p
     where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
       and has_function_privilege('anon', p.oid, 'execute') $$,
  'anon não executa nenhuma função de public ou private'
);

select ok(
  not has_function_privilege('authenticated', 'public.verify_audit_chain()', 'execute'),
  'só a chave de serviço confere a cadeia da trilha'
);

select is_empty(
  $$ select p.oid::regprocedure::text from pg_proc p
     where p.pronamespace in ('public'::regnamespace, 'private'::regnamespace)
       and not exists (
         select 1 from unnest(p.proconfig) as setting where setting like 'search_path=%'
       ) $$,
  'toda função de public e private fixa o search_path'
);

-- Regras de integridade (docs/dados/dicionario-de-dados.md, seção 7)

insert into public.organizations (id, name, kind) values
  ('a0000000-0000-4000-8000-000000000001', 'Rede de teste', 'rede_hospitais_privados');
insert into public.units (id, organization_id, name, zone, lat, lon) values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Hospital de teste', 'centro', -10, -50);
insert into public.doctors
  (id, name_sim, crm_sim, phone_sim, crm_status, specialty, home_lat, home_lon, max_radius_km,
   preferred_period, home_zone, gender, age_band) values
  ('d0000000-0000-4000-8000-000000000001', 'Médico de teste', 'SIM-TT-000001', '+55 00 00000-0001',
   'active', 'pediatria', -10, -50, 15, 'night', 'sul', 'F', '35-44');
insert into public.shifts (id, unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency) values
  ('e0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'pediatria',
   '2026-11-20 19:00-03', '2026-11-21 07:00-03', 'night', false, 'high');
insert into public.model_registry (model_version, kind, trained_at, features) values
  ('modelo-teste', 'logistic_regression', now(), array['distance_km']);

select throws_ok(
  $$ insert into public.doctors
       (name_sim, crm_sim, phone_sim, crm_status, specialty, home_lat, home_lon, max_radius_km,
        preferred_period, home_zone, gender, age_band)
     values ('Sem prefixo', 'CRM-SP-123456', '+55 00 00000-0002', 'active', 'pediatria', -10, -50, 15,
        'night', 'sul', 'F', '35-44') $$,
  '23514', null, 'CRM sem o prefixo SIM é recusado'
);

select throws_ok(
  $$ insert into public.doctors
       (name_sim, crm_sim, phone_sim, crm_status, specialty, home_lat, home_lon, max_radius_km,
        preferred_period, home_zone, gender, age_band)
     values ('Telefone real', 'SIM-TT-000002', '+55 11 91234-5678', 'active', 'pediatria', -10, -50, 15,
        'night', 'sul', 'F', '35-44') $$,
  '23514', null, 'telefone fora do DDD fictício 00 é recusado'
);

select throws_ok(
  $$ insert into public.doctors
       (name_sim, crm_sim, phone_sim, crm_status, specialty, home_lat, home_lon, max_radius_km,
        preferred_period, home_zone, gender, age_band)
     values ('Repetido', 'SIM-TT-000001', '+55 00 00000-0003', 'active', 'pediatria', -10, -50, 15,
        'night', 'sul', 'F', '35-44') $$,
  '23505', null, 'CRM simulado repetido é recusado'
);

select throws_ok(
  $$ insert into public.doctor_availability
       (doctor_id, kind, weekday, on_date, start_time, end_time, valid_from)
     values ('d0000000-0000-4000-8000-000000000001', 'available', 1, '2026-11-20', '19:00', '07:00', '2026-11-01') $$,
  '23514', null, 'janela precisa de dia da semana ou data, nunca os dois'
);

select throws_ok(
  $$ insert into public.shifts (unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency)
     values ('b0000000-0000-4000-8000-000000000001', 'pediatria', '2026-11-21 07:00-03', '2026-11-20 19:00-03',
        'night', false, 'high') $$,
  '23514', null, 'vaga que termina antes de começar é recusada'
);

select throws_ok(
  $$ insert into public.shifts (unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency, status)
     values ('b0000000-0000-4000-8000-000000000001', 'pediatria', '2026-11-20 19:00-03', '2026-11-21 07:00-03',
        'night', false, 'high', 'filled') $$,
  '23514', null, 'vaga preenchida precisa de filled_at'
);

select throws_ok(
  $$ insert into public.shifts (unit_id, specialty, starts_at, ends_at, period, is_weekend, urgency, status)
     values ('b0000000-0000-4000-8000-000000000001', 'cardiologia', '2026-11-20 19:00-03', '2026-11-21 07:00-03',
        'night', false, 'high', 'open') $$,
  '22P02', null, 'especialidade fora do domínio é recusada'
);

select lives_ok(
  $$ insert into public.offers (id, shift_id, doctor_id, sequence_no, selection_source, ttl_minutes)
     values ('f0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
        'd0000000-0000-4000-8000-000000000001', 1, 'system_recommendation', 60) $$,
  'oferta nova nasce pendente'
);

select results_eq(
  $$ select response::text, accepted, y_success from public.offers
     where id = 'f0000000-0000-4000-8000-000000000001' $$,
  $$ values ('pending', false, false) $$,
  'oferta pendente não conta como aceite nem como sucesso'
);

select throws_ok(
  $$ insert into public.offers (shift_id, doctor_id, sequence_no, selection_source, ttl_minutes)
     values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 2,
        'system_recommendation', 60) $$,
  '23505', null, 'o mesmo médico não recebe duas ofertas da mesma vaga'
);

select throws_ok(
  $$ update public.offers set response = 'accepted'
     where id = 'f0000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'resposta sem responded_at é recusada'
);

select throws_ok(
  $$ update public.offers set attended = true
     where id = 'f0000000-0000-4000-8000-000000000001' $$,
  '23514', null, 'comparecimento só existe em oferta aceita'
);

select throws_ok(
  $$ update public.offers set accepted = true
     where id = 'f0000000-0000-4000-8000-000000000001' $$,
  '428C9', null, 'accepted é derivado da resposta e não aceita escrita'
);

update public.offers
set response = 'accepted', responded_at = sent_at + interval '5 minutes', attended = true
where id = 'f0000000-0000-4000-8000-000000000001';

select results_eq(
  $$ select accepted, y_success from public.offers
     where id = 'f0000000-0000-4000-8000-000000000001' $$,
  $$ values (true, true) $$,
  'aceite com comparecimento é o sucesso do ranking'
);

-- Neutralidade econômica e rótulo de simulação também no banco

select throws_ok(
  $$ insert into public.recommendations (shift_id, doctor_id, rank, score, model_version, features)
     values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 0.5,
        'modelo-teste', '{"distance_km": 1, "amount_brl_sim": 900}') $$,
  '23514', null, 'valor do plantão não entra nas variáveis de uma recomendação'
);

select throws_ok(
  $$ insert into public.recommendations (shift_id, doctor_id, rank, score, model_version, features)
     values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 0.5,
        'modelo-teste', '{"distance_km": 1, "gender": "F"}') $$,
  '23514', null, 'atributo protegido não entra nas variáveis de uma recomendação'
);

select throws_ok(
  $$ insert into public.recommendations
       (shift_id, doctor_id, rank, score, model_version, features, contributions)
     values ('e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 1, 0.5,
        'modelo-teste', '{"distance_km": 1}', '{"distance_km": 0.1, "amount_brl_sim": 0.2}') $$,
  '23514', null, 'valor do plantão também não entra nas contribuições de uma recomendação'
);

select throws_ok(
  $$ insert into public.model_registry (model_version, kind, trained_at, features, label)
     values ('rotulo-real', 'baseline', now(), array['distance_km'], 'producao') $$,
  '23514', null, 'modelo sem o rótulo de simulação é recusado'
);

select throws_ok(
  $$ insert into public.model_registry (model_version, kind, trained_at, features)
     values ('com-valor', 'baseline', now(), array['distance_km', 'valor_plantao']) $$,
  '23514', null, 'modelo com variável fora da lista fechada é recusado'
);

select throws_ok(
  $$ insert into public.shift_compensation (shift_id, amount_brl_sim)
     values ('e0000000-0000-4000-8000-000000000001', -1) $$,
  '23514', null, 'valor simulado negativo é recusado'
);

select * from finish();
rollback;
