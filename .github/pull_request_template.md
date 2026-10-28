## O que mudou

<!-- Fase e resumo em poucas linhas. Branch por fase: fase-N-nome. -->

## Como rodar

<!-- Comandos para reproduzir (make up, make seed, make test...). -->

## Testes e resultado

<!-- Diga o que rodou e o que passou. Se algo não pôde rodar localmente, diga e aponte a CI. -->

- [ ] `make test` / pytest:
- [ ] `make lint`:
- [ ] CI verde (segredos, lint e testes, neutralidade econômica, Compose):

## Rastreabilidade do professor

<!-- IDs de docs/rastreabilidade-professor.md tocados por este PR e o novo status. -->

## Checklist de conformidade (revisão obrigatória)

- [ ] Só dados sintéticos; nada real de médico, paciente ou hospital
- [ ] Decisão humana preservada; ações relevantes vão para o `audit_log`
- [ ] Pagamento e valor do plantão fora do ranking (teste de neutralidade passa)
- [ ] Nome, CRM e telefone fora do LLM; saída do LLM validada por esquema
- [ ] Sem segredos no código; `.env.example` atualizado se houve variável nova
- [ ] Afirmações legais citam a fonte e dizem "validar com jurídico"
- [ ] Métricas em dados sintéticos rotuladas como simulação, com baseline
- [ ] Documentos atualizados no mesmo PR (`docs/02`, `CLAUDE.md`, diário de bordo) se uma decisão mudou

## Riscos e pendências

<!-- Risco para o prazo e o que ficou para depois. -->
