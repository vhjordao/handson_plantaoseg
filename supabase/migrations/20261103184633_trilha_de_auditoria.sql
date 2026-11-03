-- Trilha de auditoria somente de inserção, encadeada por hash, como em app/audit.py.
-- O gatilho define seq, occurred_at, prev_hash e hash: quem insere não escolhe nenhum deles.

create schema private;
revoke all on schema private from public;

create type public.actor_role as enum ('coordinator', 'doctor', 'system');
create type public.audit_action as enum (
  'shift_published', 'extraction_confirmed', 'recommendation_generated',
  'explanation_generated', 'recommendation_approved', 'recommendation_rejected'
);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  seq bigint not null unique,
  occurred_at timestamptz not null,
  organization_id uuid references public.organizations (id),
  actor_role public.actor_role not null,
  actor_pseudo_id text not null,
  action public.audit_action not null,
  entity_type text not null,
  entity_id text not null,
  model_version text,
  details jsonb not null default '{}' check (jsonb_typeof(details) = 'object'),
  prev_hash text not null,
  hash text not null unique
);
create index audit_log_organization_id_seq_idx on public.audit_log (organization_id, seq);
create index audit_log_entity_idx on public.audit_log (entity_type, entity_id);
comment on table public.audit_log is 'Somente inserção. Só IDs pseudônimos: details não aceita dado pessoal.';

create function private.audit_log_hash(entry public.audit_log)
returns text
language sql
stable
set search_path = ''
as $$
  select encode(sha256(convert_to(jsonb_build_object(
    'seq', entry.seq,
    'occurred_at', to_char(entry.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'organization_id', entry.organization_id,
    'actor_role', entry.actor_role,
    'actor_pseudo_id', entry.actor_pseudo_id,
    'action', entry.action,
    'entity_type', entry.entity_type,
    'entity_id', entry.entity_id,
    'model_version', entry.model_version,
    'details', entry.details,
    'prev_hash', entry.prev_hash
  )::text, 'UTF8')), 'hex');
$$;

-- security definer: o gatilho lê o último registro e calcula o hash com os privilégios do dono,
-- e a única entrada é o INSERT, que só a chave de serviço pode fazer.
create function private.audit_log_chain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  last_seq bigint;
  last_hash text;
begin
  if new.details::text ~* '"(name|name_sim|crm|crm_sim|phone|phone_sim|email|cpf)"\s*:' then
    raise exception 'a trilha de auditoria não aceita dado pessoal' using errcode = '23514';
  end if;

  -- Uma inserção por vez, para a cadeia nunca bifurcar.
  perform pg_advisory_xact_lock(hashtextextended('public.audit_log', 0));

  select a.seq, a.hash into last_seq, last_hash
  from public.audit_log a
  order by a.seq desc
  limit 1;

  new.seq := coalesce(last_seq, 0) + 1;
  new.occurred_at := clock_timestamp();
  new.prev_hash := coalesce(last_hash, repeat('0', 64));
  new.hash := private.audit_log_hash(new);
  return new;
end;
$$;

create function private.audit_log_is_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log é somente de inserção: % não é permitido', tg_op using errcode = '42501';
end;
$$;

create trigger audit_log_chain
  before insert on public.audit_log
  for each row execute function private.audit_log_chain();

create trigger audit_log_append_only
  before update or delete or truncate on public.audit_log
  for each statement execute function private.audit_log_is_append_only();

-- Confere a cadeia inteira. Alterar ou apagar um registro do meio a quebra; apagar os últimos,
-- não: para isso existe a cópia externa prevista em docs/seguranca-ameacas.md.
create function public.verify_audit_chain()
returns table (is_valid boolean, checked bigint, first_broken_seq bigint)
language plpgsql
stable
set search_path = ''
as $$
declare
  entry public.audit_log;
  previous text := repeat('0', 64);
begin
  checked := 0;
  for entry in select * from public.audit_log order by seq loop
    checked := checked + 1;
    if entry.seq <> checked
      or entry.prev_hash <> previous
      or entry.hash <> private.audit_log_hash(entry)
    then
      is_valid := false;
      first_broken_seq := checked;
      return next;
      return;
    end if;
    previous := entry.hash;
  end loop;
  is_valid := true;
  first_broken_seq := null;
  return next;
end;
$$;
