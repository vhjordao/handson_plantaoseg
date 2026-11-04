-- Trilha de auditoria: somente inserção, sem dado pessoal e com adulteração detectada.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

set local role service_role;

select lives_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id, details)
     values ('system', 'api', 'shift_published', 'shift', 's-1', '{"origem": "teste"}') $$,
  'a chave de serviço grava na trilha'
);

select results_eq(
  'select seq, prev_hash from public.audit_log',
  $$ values (1::bigint, repeat('0', 64)) $$,
  'o primeiro registro parte do hash inicial, como em app/audit.py'
);

select matches((select hash from public.audit_log where seq = 1), '^[0-9a-f]{64}$', 'o hash é um SHA-256 em hexadecimal');

select lives_ok(
  $$ insert into public.audit_log
       (seq, occurred_at, prev_hash, hash, actor_role, actor_pseudo_id, action, entity_type, entity_id)
     values (99, '2000-01-01', 'inventado', 'inventado', 'coordinator', 'c-1', 'recommendation_approved', 'shift', 's-1') $$,
  'quem insere pode tentar escolher sequência, data e hash'
);

select results_eq(
  $$ select seq, occurred_at > '2020-01-01'::timestamptz, prev_hash = (select hash from public.audit_log where seq = 1)
     from public.audit_log where actor_pseudo_id = 'c-1' $$,
  $$ values (2::bigint, true, true) $$,
  'mas o gatilho define sequência, data e encadeamento'
);

select lives_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id)
     values ('system', 'api', 'recommendation_generated', 'shift', 's-2'),
            ('system', 'api', 'explanation_generated', 'shift', 's-2') $$,
  'várias linhas no mesmo comando também entram na cadeia'
);

select results_eq(
  'select is_valid, checked, first_broken_seq from public.verify_audit_chain()',
  $$ values (true, 4::bigint, null::bigint) $$,
  'a cadeia íntegra é confirmada'
);

-- Dado pessoal

select throws_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id, details)
     values ('system', 'api', 'shift_published', 'shift', 's-3', '{"name_sim": "Fulano"}') $$,
  '23514', null, 'a trilha recusa nome'
);
select throws_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id, details)
     values ('system', 'api', 'shift_published', 'shift', 's-3', '{"CRM": "SIM-TT-000001"}') $$,
  '23514', null, 'a trilha recusa CRM, em maiúsculas ou não'
);
select throws_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id, details)
     values ('system', 'api', 'shift_published', 'shift', 's-3', '{"medico": {"phone": "x"}}') $$,
  '23514', null, 'a trilha recusa dado pessoal aninhado'
);
select lives_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id, details)
     values ('system', 'api', 'shift_published', 'shift', 's-3', '{"campo": "name"}') $$,
  'a palavra como valor comum não é dado pessoal'
);
select throws_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id)
     values ('system', 'api', 'acao_inventada', 'shift', 's-3') $$,
  '22P02', null, 'ação fora da lista é recusada'
);

-- Somente inserção, mesmo para a chave de serviço e para o dono da tabela

select throws_ok(
  $$ update public.audit_log set entity_id = 'outro' $$,
  '42501', null, 'a chave de serviço não altera a trilha'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', null, 'a chave de serviço não apaga a trilha'
);

reset role;

select throws_ok(
  $$ update public.audit_log set entity_id = 'outro' $$,
  '42501', 'audit_log é somente de inserção: UPDATE não é permitido', 'o dono da tabela não altera a trilha'
);
select throws_ok(
  $$ delete from public.audit_log $$,
  '42501', 'audit_log é somente de inserção: DELETE não é permitido', 'o dono da tabela não apaga a trilha'
);
select throws_ok(
  $$ truncate public.audit_log $$,
  '42501', 'audit_log é somente de inserção: TRUNCATE não é permitido', 'o dono da tabela não esvazia a trilha'
);

select is((select count(*) from public.audit_log), 5::bigint, 'nada mudou depois das tentativas');

-- Adulteração, simulando quem desliga o gatilho

savepoint antes_de_adulterar;
alter table public.audit_log disable trigger audit_log_append_only;
update public.audit_log set details = '{"origem": "adulterado"}' where seq = 2;
select results_eq(
  'select is_valid, first_broken_seq from public.verify_audit_chain()',
  $$ values (false, 2::bigint) $$,
  'alterar um registro quebra a cadeia nele'
);
rollback to savepoint antes_de_adulterar;

savepoint antes_de_apagar;
alter table public.audit_log disable trigger audit_log_append_only;
delete from public.audit_log where seq = 3;
select results_eq(
  'select is_valid, first_broken_seq from public.verify_audit_chain()',
  $$ values (false, 3::bigint) $$,
  'apagar um registro do meio quebra a cadeia no ponto do buraco'
);
rollback to savepoint antes_de_apagar;

select results_eq(
  'select is_valid, checked from public.verify_audit_chain()',
  $$ values (true, 5::bigint) $$,
  'desfeita a adulteração, a cadeia volta a fechar'
);

-- O navegador só lê

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "40000000-0000-4000-8000-000000000000", "role": "authenticated"}', true);
select throws_ok(
  $$ insert into public.audit_log (actor_role, actor_pseudo_id, action, entity_type, entity_id)
     values ('coordinator', 'falso', 'recommendation_approved', 'shift', 's-4') $$,
  '42501', null, 'o navegador não grava na trilha'
);
reset role;

select * from finish();
rollback;
