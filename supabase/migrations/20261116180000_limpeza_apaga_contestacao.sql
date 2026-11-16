-- A limpeza da demonstração (scripts/usuarios-de-teste.py limpar-demonstracao) apaga as vagas do
-- coordenador da demonstração e tudo o que depende delas, a começar pelas contestações (que apontam
-- para a oferta e a vaga). Sem esta permissão, o primeiro ensaio com contestação travava a limpeza
-- com 42501, e o rodízio seguia contando os ensaios.
--
-- Só a chave de serviço ganha o DELETE. O navegador continua sem apagar contestação (teste em
-- supabase/tests/03_contestacao_test.sql), e a trilha de auditoria, que é só de inserção, guarda a
-- abertura e a resposta de cada contestação apagada.
grant delete on public.contestations to service_role;
