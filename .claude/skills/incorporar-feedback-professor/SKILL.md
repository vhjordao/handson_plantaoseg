---
name: incorporar-feedback-professor
description: Incorpora um novo feedback ou exigência do professor ao projeto PlantãoSeguro. Use quando Victor colar um bloco de feedback ou disser "novo feedback".
---

# Incorporar feedback do professor

Siga os passos na ordem. Não pule a rastreabilidade: ela é a prova de que nada foi ignorado.

1. **Salvar na íntegra** o texto em `docs/feedback/AAAA-MM-DD-etapa-N.md`, sem editar, com origem, data e quem colou.
2. **Extrair pedidos atômicos** (um por linha) e classificar cada um: **obrigatório**, **sugestão** ou **ambíguo**. "Recomendo" e "talvez seja legal" são sugestão; roteiro de entrega com "deve" ou "precisa" é obrigatório.
3. **Atualizar `docs/rastreabilidade-professor.md`** com ID, exigência, tipo, status, onde está no repositório e observação. Pontos positivos entram como "mantido".
4. **Virar tarefas**, executar pelas prioridades do `CLAUDE.md` (corte de baixo para cima; nunca cortar segurança nem regras) e rodar os testes.
5. **Perguntar só quando a ambiguidade mudar o que será construído.** Do contrário, escolha a leitura mais razoável e diga qual foi (na observação da tabela e no ADR, se mudar escopo).
6. **Conflito com princípio do projeto** (por exemplo, remover a decisão humana): não aplique em silêncio. Explique o conflito e proponha alternativa.
7. **Resumir em 5 linhas** o que mudou e o que ficou pendente, e registrar no `docs/diario-de-bordo.md`.

Ao concluir, o status de cada linha da rastreabilidade precisa bater com a evidência no repositório. Nunca marque "feito" sem apontar o arquivo.
