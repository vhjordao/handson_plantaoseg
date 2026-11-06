-- Contestação (D8 do ADR 0015): o médico contesta a recomendação que recebeu, e o coordenador
-- responde por escrito. Tudo fica na trilha. Escreve só a API, com a chave de serviço; o navegador
-- só lê, sob RLS: o médico, as próprias; o coordenador, as da organização.

-- As mesmas ações estão em ACTIONS, de services/matching-api/app/audit.py.
alter type public.audit_action add value if not exists 'contestation_opened';
alter type public.audit_action add value if not exists 'contestation_answered';

create type public.contestation_reason as enum (
  'wrong_data', 'explanation_unclear', 'unfair_order', 'other'
);

-- Uma contestação por oferta. O texto é do médico e a resposta, do coordenador: a API tira CRM,
-- telefone, e-mail e documento antes de gravar, e a tela, os nomes.
create table public.contestations (
  id uuid primary key default gen_random_uuid(),
  protocol text not null unique,
  organization_id uuid not null references public.organizations (id),
  offer_id uuid not null unique references public.offers (id),
  shift_id uuid not null references public.shifts (id),
  doctor_id uuid not null references public.doctors (id),
  reason public.contestation_reason not null,
  text text not null check (char_length(text) between 1 and 1000),
  status text not null default 'open' check (status in ('open', 'answered')),
  answer_text text check (char_length(answer_text) between 1 and 1000),
  answered_by text,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  check (
    (status = 'answered')
    = (answer_text is not null and answered_by is not null and answered_at is not null)
  )
);
create index contestations_organization_id_created_at_idx
  on public.contestations (organization_id, created_at);
create index contestations_doctor_id_idx on public.contestations (doctor_id);
create index contestations_shift_id_idx on public.contestations (shift_id);
comment on table public.contestations is
  'Contestação do médico e resposta do coordenador. Só dados sintéticos; escrita só pela API.';

alter table public.contestations enable row level security;

-- A API lê, abre e responde; ninguém apaga uma contestação.
grant select, insert, update on public.contestations to service_role;

grant select (
  id, protocol, organization_id, offer_id, shift_id, doctor_id, reason, text, status,
  answer_text, answered_by, created_at, answered_at
) on public.contestations to authenticated;
create policy contestations_select_parties on public.contestations
  for select to authenticated
  using (
    doctor_id = (select private.current_doctor_id())
    or (
      organization_id = (select private.current_organization_id())
      and (select private.current_app_role()) in ('coordinator', 'admin')
    )
  );
