# Wireframes das telas (baixa fidelidade, não funcionais)

Quatro telas desenhadas para a jornada do coordenador e do médico. **Não são um protótipo funcional**: o ADR 0004 adiou a interface, e a PoC roda por linha de comando. Servem para validar o fluxo com usuários antes de construir e para o documento da Etapa 2. Todos os nomes, CRM e números são fictícios (simulação).

| Tela | Para quem | O que mostra | Princípio de IA responsável |
| --- | --- | --- | --- |
| [1. Nova vaga](01-nova-vaga.svg) | Coordenador | Texto livre, campos extraídos e confirmação | O humano **confere** o que a IA extraiu; texto suspeito é sinalizado |
| [2. Recomendação](02-recomendacao.svg) | Coordenador | Top 5 com motivo, score e alertas de jornada, e aprovação | A IA recomenda, o humano decide; motivo legível |
| [3. Excluídos](03-excluidos.svg) | Coordenador | Quantos foram barrados por regra e exemplos com a evidência | Explicabilidade: a regra que barrou, com números |
| [4. Oferta e contestação](04-medico-oferta-e-contestacao.svg) | Médico | Oferta com o motivo, aceitar ou recusar e contestar | Contestabilidade e transparência para quem é ranqueado |

## Estados que a versão funcional precisa tratar

Carregando; erro do LLM (cai nas regras, com aviso discreto); nenhum elegível; campo obrigatório em branco (a tela 1 não deixa seguir); texto com sinal de injeção; explicação em texto fixo (fallback); aprovação sem seleção (botão desabilitado).

## Roteiro de teste de usabilidade (3 a 5 pessoas)

1. Peça a um coordenador de escala para descrever uma vaga na tela 1 com as próprias palavras. Mede: quantas vezes corrige os campos extraídos.
2. Pergunte, na tela 2, **por que** o primeiro candidato foi recomendado, sem apontar o texto. Mede: se o motivo foi compreendido.
3. Pergunte, na tela 3, por que determinado médico não apareceu. Mede: se a regra e a evidência bastam.
4. Peça a um médico, na tela 4, que explique por que recebeu a oferta e como contestar. Mede: se contestar é descoberto sem ajuda.
5. Registre tempo, erros e frases ditas. Critério de aceite sugerido: 4 em 5 entendem o motivo e a regra sem ajuda.

Acessibilidade a conferir na versão funcional (WCAG AA): contraste, foco visível, rótulos, alvos de toque, uso por teclado e textos em português do Brasil.
