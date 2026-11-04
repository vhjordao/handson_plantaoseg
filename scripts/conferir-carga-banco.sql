-- Confere o banco com os 12 meses carregados: isolamento e tempo de resposta sob RLS, como o navegador
-- veria. Cria um coordenador e um médico de teste e desfaz tudo no fim. A CI roda este arquivo depois
-- da carga. Rode com psql, a partir da raiz do repositório.
\set ON_ERROR_STOP on

begin;

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000099', 'coordenador.carga@exemplo.invalid'),
  ('30000000-0000-4000-8000-000000000099', 'medico.carga@exemplo.invalid');

insert into public.profiles (id, role, organization_id)
select '10000000-0000-4000-8000-000000000099', 'coordinator', o.id
from public.organizations o
order by o.created_at
limit 1;

-- O médico com mais ofertas é o caso mais pesado para as políticas do lado do médico.
insert into public.profiles (id, role, doctor_id)
select '30000000-0000-4000-8000-000000000099', 'doctor', o.doctor_id
from public.offers o
group by o.doctor_id
order by count(*) desc, o.doctor_id
limit 1;

select set_config('carga.vagas', (select count(*)::text from public.shifts), true);
select set_config('carga.ofertas', (select count(*)::text from public.offers), true);
select set_config('carga.candidatos', (select count(distinct doctor_id)::text from public.offers), true);
select set_config('carga.ofertas_do_medico', (
  select count(*)::text from public.offers o
  join public.profiles p on p.doctor_id = o.doctor_id
  where p.id = '30000000-0000-4000-8000-000000000099'
), true);

\timing on

-- Coordenador da rede carregada

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "10000000-0000-4000-8000-000000000099", "role": "authenticated"}', true);

select count(*) as vagas_do_coordenador from public.shifts;
select count(*) as ofertas_do_coordenador from public.offers;
select count(*) as medicos_do_coordenador from public.doctors;

-- A consulta típica da tela: as próximas vagas, com o hospital e as ofertas de cada uma.
select s.starts_at, u.name, count(o.id) as ofertas
from public.shifts s
join public.units u on u.id = s.unit_id
left join public.offers o on o.shift_id = s.id
group by s.id, s.starts_at, u.name
order by s.starts_at desc
limit 5;

do $$
begin
  if (select count(*) from public.shifts) <> current_setting('carga.vagas')::bigint
    or (select count(*) from public.offers) <> current_setting('carga.ofertas')::bigint
    or (select count(*) from public.doctors) <> current_setting('carga.candidatos')::bigint
  then
    raise exception 'o coordenador não enxerga o que deveria';
  end if;
end;
$$;

reset role;

-- Médico

set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "30000000-0000-4000-8000-000000000099", "role": "authenticated"}', true);

select count(*) as ofertas_do_medico from public.offers;
select count(*) as vagas_do_medico from public.shifts;
select count(*) as medicos_que_o_medico_ve from public.doctors;

do $$
begin
  if (select count(*) from public.offers) <> current_setting('carga.ofertas_do_medico')::bigint
    or (select count(*) from public.shifts) <> current_setting('carga.ofertas_do_medico')::bigint
    or (select count(*) from public.doctors) <> 1
    or (select count(*) from public.organizations) <> 0
    or (select count(*) from public.shift_requests) <> 0
  then
    raise exception 'o médico enxerga mais do que deveria';
  end if;
end;
$$;

reset role;

\timing off

rollback;
