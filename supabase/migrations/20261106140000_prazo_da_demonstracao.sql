-- D6 do ADR 0015: na rede simulada, que a demonstração mostra, cada oferta vale 2 minutos, para a
-- cascata andar durante a apresentação. A simulação e as métricas publicadas continuam com 60
-- minutos (`data/synthetic/params.json`): isto muda só o sistema no ar.
--
-- Num banco sem dados (a CI), não muda nada. Se a carga sintética for refeita depois desta
-- migração, ela volta a gravar 60: repita este comando, ou rode a migração de novo à mão.
update public.policy_config
set offer_ttl_minutes = 2
where organization_id in (
  select id from public.organizations where kind = 'rede_hospitais_privados'
);
