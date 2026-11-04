-- A cascata de ofertas entra na trilha: quem recebeu, quem respondeu e quando a vaga ficou sem candidato.
-- As mesmas ações estão em ACTIONS, de services/matching-api/app/audit.py, e
-- tests/test_contrato_banco.py confere que as duas listas são iguais.
alter type public.audit_action add value if not exists 'offer_sent';
alter type public.audit_action add value if not exists 'offer_accepted';
alter type public.audit_action add value if not exists 'offer_declined';
alter type public.audit_action add value if not exists 'offer_expired';
alter type public.audit_action add value if not exists 'shift_uncovered';
