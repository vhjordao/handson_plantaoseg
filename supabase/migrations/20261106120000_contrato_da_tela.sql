-- Fase 2 do roteiro até o MVP (ADR 0015): a API completa o contrato da tela do coordenador.

-- Desfazer um pulo e o "Esta explicação ajudou?" entram na trilha (D3). As mesmas ações estão em
-- ACTIONS, de services/matching-api/app/audit.py, e tests/test_contrato_banco.py confere que as
-- duas listas são iguais.
alter type public.audit_action add value if not exists 'recommendation_restored';
alter type public.audit_action add value if not exists 'explanation_feedback';

-- A contribuição de cada variável, em relação à média dos elegíveis, fica gravada com a
-- recomendação, para a tela mostrar o mesmo "Ver motivos" depois de recarregar. A lista fechada é a
-- mesma de `features`: pagamento, valor e atributo protegido também não cabem aqui.
alter table public.recommendations
  add column contributions jsonb not null default '{}'::jsonb check (
    jsonb_typeof(contributions) = 'object'
    and contributions - array[
      'specialty_match', 'distance_km', 'availability_overlap_hours', 'acceptance_rate_90d',
      'attendance_rate_90d', 'hours_since_last_shift', 'night_shift_preference_match'
    ]::text[] = '{}'::jsonb
  );

-- A evidência numérica da exclusão ("Mora a 18,2 km; o raio declarado é 15 km."). Só números e o
-- texto da regra: nunca nome, CRM nem telefone.
alter table public.recommendation_exclusions
  add column evidence text check (char_length(evidence) <= 300);

grant select (contributions) on public.recommendations to authenticated;
grant select (evidence) on public.recommendation_exclusions to authenticated;
