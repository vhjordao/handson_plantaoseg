# Diário de bordo

Decisões e mudanças do dia, para os seis integrantes acompanharem. Registra também o uso de IA no planejamento do projeto (Gestão de Projetos com IA). Mais recente no topo.

> **Nota de 31/10/2026 (Victor).** O trabalho deste projeto foi feito **em conjunto** entre o Victor e o Claude Code, e nem tudo foi feito pela IA: a sugestão dos dados partiu do Victor. As linhas de "Uso de IA" abaixo descrevem o apoio da IA em cada dia; não significam que tudo foi escrito por ela.

## 04/11/2026 (quarta): servidor na Hostinger

**Pedido do Victor:** "já quero usar a hostinger e tirar tudo da local", e depois: "vou usar só para apresentar o protótipo. Depois vou parar tudo". Ele escolheu a KVM 1 e criou o servidor com o modelo de n8n em modo fila.

**O que foi feito**

- Inspecionamos o servidor sem mudar nada. O [ADR 0009](adr/0009-servidor-so-para-a-apresentacao.md) registra as decisões, e a [ficha](../infra/README.md) tem como entrar, testes e limites.
- O modelo trazia 3 workers, fuso de Berlim, firewall desligado, editor aberto na internet e segredos escritos no arquivo do Compose. Agora são 1 worker, fuso de São Paulo, versões fixas, editor só por túnel SSH e segredos no `.env` do servidor.
- O Compose foi para `infra/`, sem segredos e sem IP, e o `make up` local saiu. Um teste de contrato barra porta nova, versão solta e segredo no arquivo.
- O n8n avisou que não suporta o Postgres 15 do modelo. Levamos o banco para o 17 enquanto só havia a conta de administrador, e as contagens bateram.
- A proteção do sistema (login só por chave, firewall e swap) está em um script que o próprio Victor roda.

**No servidor real:** um webhook temporário passou pela fila e foi executado pelo worker, em 0,14 s, e foi apagado depois. De fora, das 7 portas testadas, só 22, 80 e 443 respondem, e o endereço público do n8n devolve 404. A carga com 1 vCPU ainda não foi medida.

**Uso de IA:** o Claude Code inspecionou, escreveu os arquivos e aplicou o Compose com o ok do Victor. A recomendação dele mudou no caminho: KVM 2, depois aceitar a KVM 1, depois o n8n simples, e de volta ao modo fila ao ver o que o servidor já tinha. A migração do Postgres não estava no plano aprovado e saiu do aviso do n8n.

## 04/11/2026 (quarta): carga dos dados sintéticos no banco

**Pedido do Victor:** carregar os dados sintéticos no projeto.

**O que foi feito**

- `python -m app.cli seed-db` gera um arquivo SQL com os 12 meses simulados, fora do Git. As datas andam 6 semanas, e o histórico termina em 12/11, cinco dias antes da apresentação, com os mesmos dias da semana.
- O gabarito do simulador fica de fora. O arquivo recusa um banco que já tenha dados e confere as contagens no fim.
- A avaliação refeita com as datas deslocadas bateu com as métricas publicadas: nenhuma mudou.
- A CI carrega os 12 meses pelo mesmo caminho do projeto real e repete os testes de RLS com os dados.

**No projeto real:** o Victor aprovou, e a carga entrou depois de a CI ficar verde. Pela API, todas as contagens bateram (16.547 linhas), e a tabela do gabarito não existe. De fora, com a chave pública, ler, gravar e chamar funções continuou recusado. O histórico vai até 12/11, então parte dos registros tem data no futuro até esse dia.

**Uso de IA:** o Claude Code escreveu o gerador, os testes e a conferência; a revisão é do Victor, no PR.

## 03/11/2026 (terça): banco no Supabase

**Pedido do Victor:** começar o banco. Ele também avisou que a Hostinger ainda não foi comprada: quando for preciso, o Claude Code avisa, e os dois criam juntos o servidor e o n8n.

**O que foi feito**

- [Migrações](../supabase/README.md) com as tabelas do dicionário (v0.4), a trilha só de inserção com hash encadeado e as regras de acesso por organização e papel. O navegador só lê, e as colunas restritas ficam sem permissão.
- 100 testes em pgTAP, 9 de contrato em Python e um job novo na CI, que também carrega a amostra sintética e roda os alertas do Supabase.
- [ADR 0008](adr/0008-banco-no-supabase.md), com as decisões: regras em Python e papel e organização vindos do perfil, e não do JWT.

**O que a medição mostrou**

- Os dados gerados couberam em todas as restrições, mas o limite de 500 caracteres no texto da vaga caiu: o ataque `oversize` chega a 3.314.
- Desde 30/10 o Supabase não expõe tabelas novas automaticamente, então cada permissão é explícita.

**Uso de IA:** o Claude Code propôs as decisões e escreveu o SQL e os testes; a revisão é do Victor, no PR. Como tudo passou de primeira, abrimos 14 buracos de propósito para ver se os testes acusavam. Treze foram acusados, e o outro revelou um teste que faltava.

**No projeto real:** o Victor aprovou aplicar, e as migrações entraram. Com a chave pública, todas as tentativas de ler, gravar e chamar funções foram recusadas. Os alertas do Supabase apontaram uma função criada pelo painel, `rls_auto_enable`, com execução aberta a todos, que a CI não tinha como ver. A chamada de fora já falhava, mas a permissão foi fechada com uma quarta migração.

**Pendência:** carregar os dados, com o ok do Victor.

## 03/11/2026 (terça): contas novas e primeira página na Vercel

**Pedido do Victor:** conectar as contas novas de Supabase e Vercel, arrumar a Vercel "para ele funcionar" e criar a primeira página.

**Decisões do Victor**

- Criou as contas de Supabase e Vercel e o projeto `plantaoseguro`, em São Paulo. A Hostinger fica para depois.
- Preferiu arrumar a Vercel a pausá-la.
- Aprovou criar a primeira página. Novas telas, API, banco e n8n continuam esperando o ok dele ([ADR 0007](adr/0007-web-sai-do-adiamento.md)).

**O que foi feito**

- Clone fora do OneDrive e `.env` local, ignorado pelo Git, com os valores colados pelo Victor. A conferência das contas só fez leituras e não imprimiu nenhum valor. O token do Supabase enxerga só o projeto `plantaoseguro`, a senha do banco confere e o token da Vercel enxerga só o projeto `handson-plantaoseg`.
- A importação na Vercel tinha ficado com Python e `services/matching-api`, e cada push marcava falha no GitHub. O projeto passou para Next.js, `apps/web` e um Ignored Build Step. Os commits `6bb61e6` e `d3c8ff6` passaram de falha para `success`.
- [`apps/web`](../apps/web/README.md): Next.js 16.4.4 e Tailwind 4, com uma página provisória sem dados nem chaves. Entraram também um job de CI da web e os padrões de token da Vercel e do Supabase na varredura de segredos.

**Uso de IA**

- O Claude Code encontrou a causa da falha e primeiro recomendou pausar as implantações. O Victor pediu para fazer funcionar, e a recomendação mudou depois de ler a documentação oficial, porque pausar só esconderia o erro.
- O texto e o visual da página foram propostos pelo Claude Code e aguardam a revisão do Victor no PR. Uma animação da fita de obra saiu depois da conferência no navegador, porque podia aparecer pela metade.

**Pendências:** Hostinger, chave do Gemini e o ok para cada novo pedaço do protótipo. As prévias de PR pedem login na Vercel.

## 03/11/2026 (terça): exemplo do dicionário e dados em produção

**Pedido do Victor:** escrever a tabela do dicionário e o documento de dados em produção, respondendo aos dois outros pontos do feedback da Entrega 2.

**O que foi feito**

- [Exemplo concreto do dicionário](dados/dicionario-exemplo.md) (`app/datadict.py`, `make dicionario`): 18 variáveis com nome, tipo, papel, descrição, valores possíveis e o que aparece nos dados. A última coluna é calculada, e um teste regenera tudo a partir do gerador. O dicionário completo passou à v0.3, sem mudança de coluna.
- [Dados em produção](dados/dados-em-producao.md): de onde vem cada dado, como entra no piloto e depois, com que frequência se atualiza, a regra de qualidade, o responsável e o cuidado com dados pessoais; as integrações com CFM e CNES, lidas na fonte; o caminho do dado até o modelo; e as fases de implantação, com o limite do modo sombra.

**Rastreabilidade:** FB2-2 e FB2-3 viraram "feito", com o arquivo apontado. FB2-1 segue em andamento, porque depende das entrevistas.

**Ponto a validar:** o serviço do CFM só atende o usuário final, sem empresa intermediária. O contrato talvez precise ser do hospital, não da plataforma. Fica para o jurídico.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) gerou a tabela, redigiu o desenho e conferiu as fontes; a revisão do desenho e das fases fica com o Victor e o grupo.

## 03/11/2026 (terça): teste de premissas e simulação de lançamento

**Pedido do Victor:** colocar no repositório, com testes, o teste de premissas e a simulação de lançamento, que vieram da medição exploratória feita para o feedback da Entrega 2.

**O que foi feito:** `app/robustness.py`, `app/public_data.py` e `make robustez`, com resultado em [docs/resultados/metricas-robustez.md](resultados/metricas-robustez.md). A base continua idêntica: os checksums dos dados e as métricas publicadas não mudaram.

**O que os números dizem (simulação, 17 cenários):**

- O modelo supera o baseline nos 17, de +2,1 a +6,4 pontos no top-5. Essa conclusão resiste.
- A meta de reduzir 50% o tempo se sustenta em 14 dos 17 (de 42% a 63%). Essa depende das premissas.
- A concentração piora nos 17: precisa de mitigação, com qualquer premissa.
- O estudo Demografia Médica 2025 confirma a premissa de pediatras (44,7% contra 45%), mas mostra dois erros do simulador: 76,8% de mulheres na pediatria (usamos 50%) e 26,8% de médicos com 55 anos ou mais (usamos 15%). Pesam na auditoria de equidade, não no ranking.

**Correção em relação à medição exploratória:** na exploração, o modelo já parecia vencer no dia 7 (+2,2 pontos). Ela treinava com ofertas cujo resultado ainda não se saberia naquele dia. Com a regra certa, só ofertas de plantão já terminado, o modelo **perde** no dia 7 (114 ofertas, 2,5 pontos atrás) e vence a partir do dia 14 (252 ofertas). Isso reforça começar o lançamento pelo baseline. A avaliação principal tem a mesma folga na fronteira, em 75 de 6.259 ofertas, e o efeito é desprezível (AUC de 0,7623 para 0,7624): está nos limites do relatório, e os números publicados não mudaram.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) transformou a exploração em módulo testado, encontrou e corrigiu o vazamento do rótulo na curva e conferiu os agregados no PDF oficial do estudo.

## 03/11/2026 (terça): kit de entrevistas e revisão às cegas

**Pedido do Victor:** aplicar a proposta para os pontos do feedback da Entrega 2, sem tocar no protótipo. Esta é a parte mais urgente: os colegas precisam do roteiro para começar a entrevistar.

**O que foi feito**

- [Kit do entrevistador](entrevistas/LEIAME.md): convite, regras, termo, roteiros de coordenador e de plantonista, ficha de registro e a tabela que liga cada resposta à premissa que ela testa. Os números citados têm teste de sincronia com os resultados.
- Revisão às cegas (`app/blind_review.py`, `make kit-entrevistas`): 10 vagas simuladas, cada uma com a lista do modelo e a do baseline em ordem sorteada, sem nome nem CRM. É a forma mais barata de medir a meta da Entrega 1 de 60% de recomendações aceitas.
- O conversor de documentos ganhou dois marcadores: `<!-- bloco -->`, que não deixa um caso se dividir entre páginas, e `<!-- grande -->`, para as telas ficarem legíveis. Agora ele também resolve os links relativos a partir da pasta de cada documento.

**Por que a pergunta central é "quantos médicos você chama até alguém aceitar":** na simulação, o ganho de tempo do modelo é de 57% contra um coordenador que não confere a agenda, 27% contra quem já chama só quem pode ir e 7% contra quem já escolhe tão bem quanto o baseline. É a premissa que mais pesa, e só as entrevistas a resolvem.

**Ponto aberto, para o Victor:** confirmar com o professor, antes da primeira entrevista, que as conversas podem seguir como atividade da disciplina. A Res. CNS 510/2016 dispensa do sistema CEP/Conep a atividade de ensino sem finalidade de pesquisa, mas exclui dessa dispensa TCC, monografias e similares. A classificação não cabe ao grupo (seção 3 do kit; validar com jurídico).

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) escreveu roteiros, código e testes a partir da proposta aprovada pelo Victor e conferiu a norma na fonte. A revisão dos roteiros e as conversas ficam com o grupo.

## 03/11/2026 (terça): feedback da Entrega 2 e pedido da Etapa 3

**Pedido do Victor:** registrar o feedback da Entrega 2 e a aula de hoje, e responder como resolver os pontos de melhoria.

**O que o professor disse:** gostou da estrutura no GitHub, de os dados sintéticos não serem apresentados como reais, do dicionário, das fontes em produção, do cuidado com qualidade e vazamento e do viés de seleção declarado. Deixou três "pontos a se pensar": a ausência de dados reais limita demonstrar que os padrões representam hospitais e médicos; falta um exemplo concreto do dicionário (nome, tipo, descrição e valores possíveis); e vale explorar como os dados seriam coletados, atualizados e integrados. O texto comenta só a parte de dados.

**O que a Aula 4 pede:** documento de 8 a 12 páginas em seis áreas (resultado técnico, resultado para o negócio, experiência, segurança e ética, implantação e critérios de sucesso no centro), com métricas numéricas e sem achismos. A pergunta central é "como saberemos, depois de 6 meses, se esse projeto deu certo?".

**O que foi feito:** [feedback na íntegra](feedback/2026-11-03-etapa-2.md); rastreabilidade com FB2-1 a FB2-4 e A4-1 a A4-12; [plano](plano-etapa-3.md) ajustado às seis áreas. Até este registro, nada do protótipo tinha sido construído: ele esperava as contas novas.

**Leitura adotada para o FB2-1:** a regra "só dados sintéticos" continua valendo. A evidência do mundo real vem de agregados públicos, entrevistas com números e revisão por coordenadores, sem nenhum registro individual; a análise de sensibilidade mostra o quanto as conclusões dependem das premissas; e o piloto em modo sombra é o caminho para dados reais na implantação. A medição exploratória foi feita fora do repositório e só entra com código e teste.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (Opus 5.5) registrou o feedback, leu a aula, mediu de forma exploratória e propôs o caminho; a decisão é do Victor.

## 02/11/2026 (segunda): plano do protótipo e da Etapa 3

**Pedido do Victor:** iniciar a continuação do projeto. Depois de ver a proposta, aprovou o plano e pediu para só publicá-lo, sem construir nada até passar as contas novas.

**Decisões do Victor**

- Contas novas de Supabase, Vercel e Hostinger, só deste projeto; contas de outros projetos não são usadas nem tocadas.
- Nada é construído antes de as contas chegarem: até lá, continua valendo o [ADR 0004](adr/0004-prototipo-adiado.md).

**O que foi feito:** o [plano](plano-etapa-3.md), com arquitetura, marcos M0 a M4, frentes da Etapa 3, o que depende do Victor, custos, verificação e riscos. Só documentação: nenhuma migração, API, tela, clone novo ou instalação.

**O que o levantamento mostrou**

- `apps/web`, `supabase/migrations` e `n8n/workflows` só têm `.gitkeep`; o motor da PoC é o que se reaproveita.
- A máquina local segue sem Docker, WSL e Supabase CLI, e o disco está apertado. Por isso o plano não usa Docker local: o banco fica na nuvem e a CI do GitHub roda o Supabase CLI.
- Só o Victor tem acesso ao repositório hoje; os convites aos colegas ainda não viraram acesso. Na Etapa 3, as entrevistas dependem deles.

**Uso de IA:** o trabalho segue em conjunto. O Claude Code (a partir de hoje, modelo Opus 5.5) levantou o estado do projeto e redigiu o plano; as decisões foram do Victor.

## 31/10/2026 (sábado), versão 2 do documento da Entrega 2

**Pedido do Victor:** conferir o que o feedback do professor pediu e se o documento é coerente com o pedido da Entrega 2; depois, melhorar muito o documento, preparar a nova versão para a entrega de hoje e deixar descrito que a sugestão dos dados foi dele e que o trabalho foi feito em conjunto.

**O que o batimento achou**

- **Metas:** das seis metas da Entrega 1, duas (antecedência e aceitação pelo coordenador) tinham sumido da tabela; a linha de base da jornada estava "n/d" apesar de medida (1,3%); o recall estava "Reformulada" sem dizer para quê.
- **Dica 1 do professor:** o documento não citava nenhuma das quatro dores da Entrega 1 (a rastreabilidade dizia que sim).
- **Ética:** só duas das quatro perguntas de Direito e Ética estavam respondidas de forma explícita, e faltava dizer que diagnóstico e prontuário ficam fora.
- **Normas:** faltavam, no PDF, a vigência de cada uma e a lista de pendências para o jurídico.
- **Concentração:** o documento só comparava o modelo com o baseline heurístico (61,2%); o processo manual simulado tem 31,1%. O modelo concentra mais.
- **Afirmações sem lastro:** "LightGBM e scikit-learn não mostraram ganho" (nunca foram testados); "71,2% com e sem a carga recente" (o código diz 71,2% sem e 71,3% com); a legenda da figura do fluxo dizia que só as etapas 2 a 6 rodam (rodam as 8).

**O que foi feito**

- `app/flow.py` e `make flow`: o fluxo recomendado contra o processo manual simulado (tempo, ofertas, antecedência e concentração), com as mesmas premissas de tempo do gerador, testes (176 no total) e uma etapa na CI. Resultado em simulação: tempo médio de 110 para 47 min (57% a menos), com 72% do ganho vindo do filtro de regras; antecedência +4,1 pontos (a meta de +20 é inalcançável sem prever vagas); concentração **piora** (31,1% para 50,7%, e até 82% se a cascata seguir a ordem).
- Documento reescrito, com 7 páginas: resumo e cartões de resultado, quatro dores, mapa do feedback, variáveis, "da análise à decisão", "por que IA e onde não" com o que se mediu, normas com vigência, quatro perguntas de ética, metas com linha de base e autoria em conjunto. O conversor ganhou cartões, caixas de destaque, figuras lado a lado e rodapé com páginas.
- Corrigidas as afirmações sem lastro, em `docs/03`, `docs/solucao-ia.md` e na ficha do componente. Novas linhas de rastreabilidade (`PI-`) para o que o professor valoriza nas aulas de 06/10 e 20/10.

**Uso de IA:** o trabalho foi feito em conjunto. O Victor pediu o batimento e definiu o rumo (melhorar o documento e deixar clara a autoria); a sugestão dos dados partiu dele. O Claude Code mediu, testou, redigiu e corrigiu. Os números novos saem de `docs/resultados/metricas-fluxo.json`.

## 30/10/2026 (sexta), merge dos PRs e tag `etapa-2`

**Pedido do Victor:** "Merge e tag": mergear os PRs #1, #2 e #3, nessa ordem, com commit de merge (não squash), conferindo a CI de cada um, e criar a tag `etapa-2` na `main`.

**O que foi feito**

- PR #1 (`518a230`), PR #2 (`4129c58`) e PR #3 (`9bfb67a`) mergeados, cada um com a CI verde antes do merge (4, 4 e 5 verificações).
- Tag anotada `etapa-2` no commit `9bfb67a`. A árvore da `main` é idêntica à da branch do PR #3, que passou nos 5 checks.
- Este PR (`f2/status-pos-merge`) só corrige o texto de status que ficou desatualizado: `CLAUDE.md`, plano da Etapa 2 e guia de postagem.

**CI da `main`:** estava na fila logo após o merge; conferida depois, as três execuções (`518a230`, `4129c58` e `9bfb67a`) terminaram com sucesso.

**Pendências do Victor:** envio no Moodle; aceite dos 3 convites e convite dos 2 colegas restantes; proteção da `main` (só com o ok dele); validação jurídica das normas; teste do Gemini com chave; vídeo da aula não transcrito.

**Uso de IA:** o Claude Code (Sonnet 5.5) executou os merges e a tag a pedido explícito do Victor, conferindo a CI antes de cada merge.

## 30/10/2026 (sexta), execução: PoC mínima e documento da Etapa 2

**Pedido do Victor:** "faça os dois, execute e documente tudo para postagem da etapa 2" (PoC mínima executável e o material da opção sem executável).

**O que foi feito**

- PoC mínima em Python de biblioteca padrão: gerador de dados, regras de jornada, variáveis sem vazamento, baseline e regressão logística, explicação, extração com guardrails, trilha com hash e CLI (ADR 0005). Testes e lint passam; a CI roda a PoC em Linux e reproduz os checksums dos dados da máquina do autor.
- Material de especificação: solução de IA, exemplo trabalhado, wireframes, ameaças e ficha de risco, plano do teste manual do Gemini.
- Documento da Etapa 2 em Markdown e PDF de 6 páginas, com guia de postagem.
- Dicionário de dados passou a v0.2 (ajustado ao que foi construído).

**Resultados (simulação):** o modelo ganha 3,5 pontos percentuais sobre o baseline no top-5 (71,2% contra 67,7%; oráculo 75,8%); os 10% mais recomendados ocupam 50,7% dos lugares; zonas distantes quase não são recomendadas.

**Achados que mudaram decisões**

- A primeira simulação não tinha violações de jornada no histórico manual; foram acrescentadas as "dobras" e a taxa medida foi de 1,3%.
- O modelo dava peso positivo à carga recente (confundimento) e a explicação citava "fez 9 plantões" a favor do candidato. Experimento: sem a variável o top-5 não muda (71,2%). Ela virou alerta de jornada.
- O texto ambíguo do gerador errava o período; a extração não reconhecia "ter" como terça-feira.
- **Normas:** o texto oficial da Res. 2.462 traz aviso de suspensão judicial integral (a Entrega 1 a trata como em vigor); a Res. 2.460 cita plataformas digitais; a classificação de risco da 2.454 deve ser reavaliada de baixo para médio. Tudo a validar com jurídico.

**Pendências:** merge dos PRs #1 a #3 e tag `etapa-2` (Victor); envio no Moodle; teste do Gemini com chave; vídeo da aula não transcrito; convites dos colegas ainda pendentes.

**Uso de IA:** o Claude Code (Sonnet 5.5) escreveu código, testes e documentos; as decisões de escopo foram do Victor. O Gemini não foi exercitado.

## 30/10/2026 (sexta): segmento ajustado para pronto-socorro de hospitais privados

**Decisão do Victor:** o segmento da PoC passa de "UPA e pronto-socorro" para **pronto-socorro de hospitais privados**; seguem plantão noturno de 12 h, fim de semana, clínica médica e pediatria.

**O que mudou:** [ADR 0001](adr/0001-segmento-inicial.md), `CLAUDE.md`, plano da Etapa 2, rastreabilidade (FB-1), subagente `engenheiro-dados` e o [dicionário de dados](dados/dicionario-de-dados.md), que passa a v0.1 (rede de hospitais privados, unidades `PS` com `ownership = privado`, nomes e exemplo fictícios).

**Correção de honestidade:** o ADR dizia que noite e fim de semana "são os que mais ficam descobertos"; não há dado para afirmar isso. Passou a **hipótese a validar nas entrevistas**.

**A lembrar no `docs/03`:** a evidência pública da Entrega 1 (Canoas) é de unidade municipal; para hospitais privados a evidência é a da Flexzo (alegação da empresa) e as entrevistas, ainda por fazer. A contratação de médicos em hospital privado é ponto sensível: validar com jurídico.

**Estado do GitHub em 30/10:** PRs #1 e #2 abertos com a CI verde, `main` só com a Entrega 1, 3 convites pendentes de aceite. Não há decisão registrada para os portões G1 (dicionário) e G-P (forma da PoC) do plano.

**Uso de IA:** o Claude aplicou a troca nos documentos e apontou a frase sem base; o Victor decide.

## 28/10/2026 (quarta), G0 aprovado

**Decisão do Victor:** aprovou o plano v2 e os ADRs 0001 a 0004 (segmento inicial, escopo da PoC, Gemini e protótipo adiado) e pediu o dicionário de dados v0 na branch `f1/dicionario-dados`.

**Ainda pendente do G0 (ações do Victor):** merge do PR #1, convites aos colegas, proteção da `main`, usuários do GitHub e donos das frentes A1 a A5, chave do Gemini. Eu não faço merge nem mexo em configurações do GitHub sem o ok explícito.

**Feito:** [dicionário de dados v0](dados/dicionario-de-dados.md) na branch `f1/dicionario-dados`, aguardando o G1. Define 11 tabelas do núcleo, o papel de cada coluna (ranking, auditoria de viés, restrito econômico, dado pessoal simulado), as 9 variáveis do ranking idênticas ao `features.py`, as premissas do simulador, as regras de qualidade e 8 decisões para o Victor.

**Convites no GitHub (28/10):** 3 pendentes de aceite e 2 colegas ainda sem convite.

**Uso de IA:** o Claude redigiu o dicionário a partir de `docs/02`, do ADR 0001 e do `features.py`; os parâmetros do simulador são premissas dele, sem fonte, e o Victor decide no G1.

## 28/10/2026 (quarta), mais tarde: LLM vira Gemini e protótipo adiado (plano v2)

**Decisões do Victor**

- O LLM **do produto** passa a ser o **Gemini**, não o Claude ([ADR 0003](adr/0003-llm-do-produto-gemini.md)). O Claude Code segue como ferramenta de desenvolvimento do grupo.
- O **protótipo não será construído ainda** ([ADR 0004](adr/0004-prototipo-adiado.md)). A Etapa 2 começa por Dados, Análise e Solução de IA; a forma da PoC é decidida no portão G-P.

**O que foi feito**

- Modelos, preços, saída estruturada, SDK e termos de dados do Gemini conferidos nas páginas oficiais do Google (28/10/2026). Achado importante: na camada **gratuita** o Google usa o conteúdo para melhorar produtos e revisores humanos podem lê-lo; como a plateia digita texto livre na demo, a demo usa a camada **paga**.
- Atualizados `docs/02` (ferramentas, custo de US$ 36–42 para US$ 34–41, riscos, plano de construção), README, `.env.example` (`GEMINI_API_KEY` e IDs dos modelos), subagente `engenheiro-ia`, `CLAUDE.md` (regra "protótipo adiado" para os Claude Codes dos colegas), guia da equipe, rastreabilidade e a CI (padrão de chave `AIza...`).
- Plano da Etapa 2 reescrito (versão 2): frentes A1 a A5, portão G-P e três opções de PoC.

**Risco registrado:** a PoC é um dos 4 entregáveis do professor; sem artefato executável até 31/10 a nota da Etapa 2 sofre.

**Uso de IA:** o Claude conferiu a documentação do Gemini e redigiu os ADRs e o plano v2; o Victor decide. A leitura das páginas do Google foi feita por uma ferramenta de busca e resumo, então IDs e preços devem ser reconferidos ao implementar.

## 28/10/2026 (quarta), à noite: documentação contínua, equipe e plano da Etapa 2

**Pedido do Victor:** documentar tudo enquanto se faz (código, como foi feito, ferramentas), explicar cada passo antes de executar para ele aprovar, preparar a entrada dos 5 colegas (cada um com Claude Code) e montar o plano da Etapa 2.

**O que foi feito**

- A CI do PR #1 passou nas 4 verificações no GitHub (segredos, ruff e pytest, neutralidade econômica e Compose): é a primeira evidência real de pytest, ruff e `docker compose config`.
- Política de documentação contínua no `CLAUDE.md`, com ficha do componente ([modelo](templates/ficha-componente.md)) e itens novos no modelo de PR.
- [Guia de entrada da equipe](CONTRIBUINDO.md) e [plano da Etapa 2](plano-etapa-2.md) com 6 frentes, portões de aprovação (G0 a G4) e metas com linha de base. Plano é **proposta**, aguardando o Victor.
- Nome de branch passou de "uma por fase" para "uma por tarefa com prefixo da fase" (`f1/...`), porque seis pessoas trabalham em paralelo e o Git não aceita `fase-1` e `fase-1/x` juntos.
- Correção: o dia 28/10/2026 é quarta-feira (a entrada abaixo dizia terça).

**Estado do repositório no GitHub:** público; `main` sem proteção; só o Victor é colaborador. Pendências do Victor: convidar os colegas e proteger a `main`.

**Uso de IA:** o Claude redigiu o guia, o plano e a política de documentação; o Victor aprova ou ajusta.

## 28/10/2026 (quarta): Fase 0, base do repositório

**Quem fez:** Victor, com o Claude Code (modelo Sonnet 5.5) como parceiro de engenharia.

**O que aconteceu**

- Repositório clonado em `handson_plantaoseg`; branch `fase-0-base` aberta a partir da `main` (commit `d38ff27`).
- Lidos: README, Entrega 1, arquitetura, slides das aulas de 20/10 e 27/10, o prompt inicial e o kickoff.
- Feedback do professor sobre a Entrega 1 salvo na íntegra e transformado em linhas de rastreabilidade (FB-1 a FB-5), mais as exigências dos slides de 27/10 (A3-1 a A3-13).
- Criadas as decisões [ADR 0001](adr/0001-segmento-inicial.md) (segmento inicial) e [ADR 0002](adr/0002-escopo-da-poc.md) (escopo da PoC); ambas aguardam confirmação do grupo.

**Descobertas**

- O professor pede quatro entregáveis na Etapa 2: **Dados, Análise, Solução de IA e PoC**. O prompt inicial não previa "Análise" como seção própria; foi incluída.
- O professor exige uma seção curta de **Cybersecurity** (dados, dados pessoais, onde ficam, quem acessa, ameaças e proteções).
- Ambiente da máquina do Victor: sem Docker, Node, make, Supabase CLI e ffmpeg; o Python de `C:\Python312` está incompleto (sem biblioteca padrão nem pip). Nada disso pôde ser executado hoje. A CI do GitHub passa a ser a evidência de testes até o ambiente local ser instalado.
- O vídeo da aula de 27/10 não foi processado por falta de ferramentas.
- A Entrega 1 (seção 15) ficou com o marcador `[preencher papéis do grupo]` sem preencher; não alteramos o documento já entregue.

**Uso de IA no planejamento:** o Claude propôs o recorte do segmento (ADR 0001) e a divisão núcleo/apoio/evolução (ADR 0002) a partir do feedback; o grupo confirma ou ajusta.

**Pendências para o grupo**

- Confirmar os ADRs 0001 e 0002.
- Instalar Docker Desktop, Node LTS, Python 3.12, Supabase CLI e make (ver `make doctor`).
- Colar as anotações da aula de 27/10, ou liberar a instalação de ffmpeg e Python para transcrever o vídeo.
