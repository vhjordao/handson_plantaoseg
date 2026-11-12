# LGPD: o que a lei diz e o que o PlantãoSeguro faz

Resposta ao feedback da Entrega 3: *"seria legal aprofundar a análise da LGPD"*. O documento da Entrega 3 dizia que o texto da lei **ainda não havia sido lido pelo grupo**. Em 11/11/2026 lemos o texto compilado da Lei 13.709/2018 no [Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709compilado.htm) e o confrontamos com o sistema que existe hoje.

> **Isto não é parecer jurídico.** É leitura de engenharia e produto, com a lei na mão. Cada ponto que depende de interpretação está marcado *validar com jurídico*. Os artigos são citados por número, com trechos curtos; o texto completo está no link acima. Das normas da ANPD, só consultamos os resumos oficiais (marcados), e o texto vigente deve ser conferido antes de qualquer decisão.

## 1. Quem trata o quê: papéis (art. 5º, VI, VII e IX)

| Agente | Quem é | Por quê |
| --- | --- | --- |
| **Titulares** | Os médicos plantonistas e os coordenadores de escala (pessoas naturais). **Pacientes não são titulares: nenhum dado de paciente entra no sistema** | O sistema trata cadastro, disponibilidade, ofertas e respostas de médicos e as ações dos coordenadores |
| **Controlador** | O hospital | É a quem "competem as decisões referentes ao tratamento" (art. 5º, VI): quem contrata os médicos, define a política de jornada e aprova as ofertas |
| **Operador** | A plataforma (nós) | Trata os dados "em nome do controlador" (art. 5º, VII) e deve seguir as instruções dele (art. 39) |
| **Subprocessadores** | Supabase (banco e login, região de São Paulo), Hostinger (servidor da API e do n8n), Vercel (a web), Google (Gemini) | Cada um recebe parte dos dados; o contrato com o hospital precisa listá-los |
| **Encarregado** | Do hospital (art. 41), com contato público | Recebe as reclamações dos titulares e fala com a ANPD |

**Um ponto de atenção sobre o papel de operador.** Se a plataforma usar os dados de um hospital para **treinar um modelo que serve a outros hospitais**, ela passa a decidir sobre o tratamento para finalidade própria e deixa de ser só operadora (o art. 42, §1º, I, equipara o operador ao controlador quando ele descumpre as instruções do controlador). A saída mais segura para o piloto é **um modelo por hospital**, treinado só com os dados dele; um modelo compartilhado exige base legal própria e contrato específico. *Validar com jurídico.*

## 2. Que dados existem e se são sensíveis

Dado sensível é o que o art. 5º, II lista: origem racial ou étnica, convicção religiosa, opinião política, filiação sindical ou a organização religiosa, filosófica ou política, **"dado referente à saúde ou à vida sexual"**, genético ou biométrico. O sistema **não coleta nenhum desses dados como tal**, mas há três pontos de atenção.

| Dado | Pessoal? | Sensível? | Finalidade | Onde fica |
| --- | --- | --- | --- | --- |
| Nome, CRM, telefone | Sim | Não | Identificar o médico e chamá-lo | Banco (Supabase, São Paulo); **nunca vai ao LLM** |
| Localização de moradia e raio | Sim | Não | Calcular a distância até o hospital (o endereço não é exibido) | Banco; nunca vai ao LLM |
| Disponibilidade e preferência de período | Sim | Não | Saber quando o médico pode ser chamado | Banco |
| Ofertas, respostas e comparecimento | Sim | Não | Histórico que alimenta o ranking (taxa de aceite e de comparecimento) | Banco |
| Horas desde o último plantão e carga recente | Sim | **Atenção:** é dado de trabalho, mas pode sugerir cansaço | Respeitar o descanso mínimo e alertar o coordenador | Banco |
| Motivo da recusa (distância, cansaço, agenda, outro) | Sim | **Atenção:** "cansaço" é declarado pelo médico, sem texto livre | Entender a recusa; a escolha de não ter texto livre foi proposital (D4) | Banco |
| Texto da contestação | Sim | **Atenção:** texto livre pode trazer dado de saúde ou de terceiros | Permitir a contestação | Banco; o navegador tira telefone e CRM antes de enviar |
| Gênero, faixa etária e zona | Sim | Não | **Só auditoria de viés**; nunca ordenam ninguém | Banco; fora do ranking e do LLM |
| Valor do plantão | Sim | Não | Financeiro; **fora do ranking** (Res. CFM 2.460) | Tabela separada |
| Trilha de auditoria | Só IDs pseudônimos | Não | Prestação de contas; cadeia de hash, só inserção | Banco |
| Texto do pedido da vaga | Pode conter dado digitado | Não deveria | Extrair os campos | Banco; vai ao LLM **como entrada não confiável, depois de limpo** |

Na demonstração de 17/11 **todos os dados pessoais são sintéticos**, e a lei só passa a valer para o sistema quando houver dado real.

## 3. Base legal para cada tratamento (art. 7º e 10)

A lei dá dez hipóteses (art. 7º, I a X). As que servem aqui:

| Tratamento | Base proposta | Por quê |
| --- | --- | --- |
| Cadastro, disponibilidade e envio das ofertas | **Execução de contrato ou de procedimentos preliminares** (art. 7º, V), quando o médico tem vínculo com o hospital; senão, **legítimo interesse** (art. 7º, IX) | O hospital precisa cobrir os plantões; o médico pede para receber ofertas |
| Histórico, ranking e rodízio | **Legítimo interesse** (art. 7º, IX), com **teste de balanceamento** documentado | Interesse legítimo do hospital em cobrir vagas, com impacto moderado no médico (acesso a plantões) |
| Gênero, idade e zona para auditoria de viés | **Cumprimento de obrigação regulatória** (art. 7º, II): o Anexo III, II da Res. CFM 2.454 exige monitorar vieses com resultados estratificados | Sem isso, não há como cumprir a norma. A contagem pode ser agregada e a identificação separada |
| Trilha de auditoria | Obrigação regulatória (art. 7º, II) e exercício regular de direitos (art. 7º, VI) | Prestação de contas à Comissão de IA e defesa em disputas |
| Aviso por canal externo (por exemplo, mensagem no celular) | **Consentimento** (art. 7º, I), só para esse item, e revogável | É um recurso opcional |

**O consentimento não é a base principal, de propósito.** Entre um hospital e o médico que depende de plantões, o consentimento dificilmente seria livre. Quando a base é o legítimo interesse, a lei exige que se use só o "estritamente necessário" (art. 10, §1º), que se dê **transparência** (art. 10, §2º) e que se registre o tratamento (art. 37); a ANPD pode pedir o relatório de impacto (art. 10, §3º; art. 38). *O teste de balanceamento e a escolha final da base são do hospital e do jurídico.*

## 4. Os princípios do art. 6º, um por um

| Princípio | Como o sistema atende hoje | O que falta |
| --- | --- | --- |
| I Finalidade | Finalidades declaradas na tabela acima | Texto de aviso ao médico com elas |
| II Adequação | Os dados servem só à escala | — |
| III Necessidade | Sete variáveis no ranking, lista fechada, com teste de neutralidade na CI; distância calculada e endereço não exibido | Revisar a necessidade da carga recente e de "horas desde o último plantão" (regra de jornada) |
| IV Livre acesso | A tela **Minha conta** mostra o que o sistema usa e não usa sobre o médico | Prazo e duração do tratamento; canal para pedir cópia |
| V Qualidade | O médico mantém a própria disponibilidade; o comparecimento é contestável | Fluxo de correção do cadastro pelo hospital |
| VI Transparência | Explicação por recomendação, ficha do modelo, "Por que você" | Aviso de privacidade completo, com controlador, encarregado e subprocessadores |
| VII Segurança | RLS com testes, trilha só de inserção, segredos fora do Git, limite de requisições | Teste de invasão; recuperação (backup) |
| VIII Prevenção | Monitoramento de vieses e rodízio | Rotina periódica de revisão |
| IX Não discriminação | Gênero, idade e zona fora do ranking; equidade medida e exibida; **a exclusão por zona não está resolvida** ([experimento](../resultados/metricas-zona.md)) | Decisão do hospital sobre o custo de reduzir a exclusão regional |
| X Responsabilização | Trilha encadeada, ADRs, rastreabilidade, testes | Registro das operações de tratamento (art. 37) |

## 5. Direitos do titular (art. 18) e o acesso facilitado (art. 9º)

| Direito | Hoje | Lacuna e proposta |
| --- | --- | --- |
| I Confirmação do tratamento | **Minha conta** diz que o sistema trata os dados | — |
| II Acesso aos dados | O médico vê as próprias ofertas, respostas e contestações (RLS) | **Baixar os meus dados**: botão em Minha conta que entrega as ofertas e contestações do médico em arquivo (feito junto deste documento) |
| III Correção | Pelo cadastro do hospital | Fluxo de pedido de correção em Minha conta, dirigido ao encarregado |
| IV Anonimização, bloqueio ou eliminação | Não existe | Procedimento do hospital, com o prazo de retenção (seção 7) |
| V Portabilidade | O arquivo do item II é em formato aberto | Regulamentação da ANPD a acompanhar |
| VII Com quem os dados foram compartilhados | Não existe na tela | Lista de subprocessadores no aviso de privacidade |
| IX Revogação do consentimento | Só se aplica ao canal externo opcional | Controle no perfil quando o canal existir |

## 6. Decisão automatizada (art. 20)

O art. 20 dá ao titular o direito de **solicitar a revisão de decisões "tomadas unicamente com base em tratamento automatizado"** que afetem seus interesses, e obriga o controlador a fornecer, quando solicitado, "informações claras e adequadas a respeito dos critérios e dos procedimentos utilizados" (§1º).

- **O PlantãoSeguro não toma decisão unicamente automatizada**: sem a aprovação do coordenador, nenhuma oferta sai, e o médico aceita ou recusa. O art. 20 provavelmente não se aplica; *validar com jurídico*.
- **Mesmo assim, o sistema atende o §1º:** o médico vê os fatores do ranking e o "Por que você", e a ficha do modelo mostra os pesos. A contestação (Res. CFM 2.454, Anexo I, XX) já está construída: o médico contesta, o coordenador responde, tudo fica na trilha.
- **Isso é um risco, se mudar:** o desenho de "uso assistido" (meses 4 a 6) pode ser trocado, no futuro, por oferta automática. Nesse caso, o art. 20 passa a valer e a classificação de risco sobe (ver [classificação de risco](classificacao-de-risco.md)).

## 7. Retenção e a trilha que não se apaga (art. 15 e 16)

O tratamento termina quando a finalidade é alcançada, no fim do período ou por pedido do titular (art. 15), e os dados devem então ser eliminados, com quatro exceções para conservar (art. 16): cumprimento de obrigação legal ou regulatória, estudo por órgão de pesquisa, transferência a terceiro, ou uso exclusivo do controlador, **anonimizado**.

**A tensão:** a trilha de auditoria é só de inserção e encadeada por hash, justamente para não poder ser apagada. Ela guarda **pseudônimos**, e a tabela que liga o pseudônimo ao nome está no cadastro. Proposta:

1. A trilha é conservada pelo prazo que o hospital e o jurídico definirem, com base no art. 16, I (obrigação regulatória: a Res. CFM 2.454 pede acesso de órgãos de controle).
2. Quando um médico sai ou pede eliminação, **o cadastro é apagado ou anonimizado**, e a trilha fica só com o pseudônimo, que deixa de ser identificável. Pelo art. 12, o dado anonimizado deixa de ser pessoal, "salvo" se a anonimização puder ser revertida com "esforços razoáveis", então o vínculo não pode sobreviver em outro lugar.
3. Os dados de treino saem junto com o cadastro; o modelo é retreinado.

O prazo de retenção **ainda não foi definido** e depende do hospital e do jurídico.

## 8. Segurança, incidentes, operadores e envio ao exterior

| Tema | O que a lei e as normas pedem | Situação |
| --- | --- | --- |
| Segurança (art. 46 e 49) | Medidas técnicas e administrativas aptas a proteger os dados; sistemas estruturados para isso | RLS, trilha, segredos, limite de requisições, injeção de prompt testada. Falta teste de invasão |
| Incidentes (art. 48) | Comunicar à ANPD e ao titular incidente que possa causar "risco ou dano relevante". Pela Res. CD/ANPD 15/2024, em **3 dias úteis**, com registro por no mínimo 5 anos (resumo oficial) | Não há plano de resposta escrito. **Precisa de um antes do piloto** |
| Operador (art. 39) | Tratar conforme as instruções do controlador | Contrato com o hospital, com a lista de subprocessadores |
| Responsabilidade (art. 42) | Controlador e operador reparam o dano; o operador responde solidariamente se descumprir a lei ou as instruções | Seguro e contrato a avaliar |
| Transferência internacional (art. 33) | Só nas hipóteses da lei: país adequado, cláusulas contratuais, consentimento específico, entre outras. Pela Res. CD/ANPD 19/2024, quem usa cláusulas contratuais para isso deve adotar as **cláusulas-padrão da ANPD**, sem alteração, e o prazo de adaptação já venceu (resumo oficial) | Ver abaixo |
| Encarregado (art. 41) | Indicado pelo controlador, com contato público | Do hospital; precisa constar no aviso |
| Sanções (art. 52) | Advertência, multa de até 2% do faturamento, limitada a R$ 50 milhões por infração, bloqueio ou eliminação dos dados, suspensão do tratamento | Risco do hospital e do operador |

**Sobre o envio ao Gemini:** ao Google vai só o **texto do pedido da vaga**, depois de remover nome, CRM e telefone. Se a limpeza funcionar, **não há dado pessoal de médico indo ao exterior**, e o art. 33 pode nem se aplicar. O risco residual é o coordenador digitar um dado pessoal em texto livre que o filtro não pegue; por isso o texto é tratado como entrada hostil e a camada **paga** do Gemini é obrigatória em produção (a gratuita, segundo a página de preços de 11/11/2026, usa o conteúdo para melhorar os produtos). *O enquadramento final é do jurídico.*

Dois outros envios merecem atenção: a **Vercel** serve a web e pode registrar o endereço IP de quem acessa (dado pessoal, fora do Brasil), e o **servidor** fica num provedor cujo local não foi conferido no painel. Ambos entram na lista de subprocessadores.

## 9. Relatório de impacto simplificado (art. 38)

A ANPD pode determinar ao controlador um relatório de impacto, que "deverá conter, no mínimo, a descrição dos tipos de dados coletados, a metodologia utilizada para a coleta e para a garantia da segurança das informações e a análise do controlador com relação a medidas, salvaguardas e mecanismos de mitigação de risco adotados" (parágrafo único). Esboço, a completar com o hospital:

| Item | Conteúdo |
| --- | --- |
| **Tipos de dados** | Seção 2 deste documento |
| **Coleta** | Cadastro feito pelo hospital e pelo médico; disponibilidade declarada pelo médico; ofertas e respostas geradas pela própria plataforma; texto do pedido digitado pelo coordenador. Detalhe em [dados em produção](../dados/dados-em-producao.md) |
| **Segurança** | Login por e-mail e senha; acesso por papel com RLS (testado na CI); trilha de auditoria só de inserção; segredos fora do Git; limite de requisições; filtro de dado pessoal antes do LLM; teste contra injeção de prompt |
| **Riscos para os titulares** | (1) Exclusão regional de médicos, **medida e não resolvida**; (2) concentração das ofertas, **reduzida pelo rodízio**; (3) vazamento; (4) inferência indevida a partir de recusas ou de descanso; (5) confiança excessiva na lista por parte do coordenador; (6) retenção sem prazo |
| **Mitigações** | Decisão humana obrigatória; explicação e contestação; rodízio entre equivalentes; auditoria e equidade na tela; neutralidade econômica por teste; minimização |
| **Risco residual** | Os itens 1 e 6 acima, mais o que só aparece com dado real |
| **Quem revisa** | Encarregado, diretor técnico e Comissão de IA do hospital, a cada versão do modelo e ao menos a cada semestre |

## 10. O que falta antes de qualquer dado real

1. **Papéis e contrato:** hospital controlador e plataforma operadora, com a lista de subprocessadores e o acordo de tratamento de dados. Decisão sobre **um modelo por hospital**.
2. **Bases legais** definidas pelo hospital, com o **teste de balanceamento** do legítimo interesse.
3. **Aviso de privacidade** com finalidades, controlador, encarregado, subprocessadores, direitos e prazo de retenção.
4. **Prazo de retenção** e o procedimento de eliminação ou anonimização.
5. **Plano de resposta a incidentes** (comunicação em 3 dias úteis).
6. **Registro das operações de tratamento** (art. 37) e o relatório de impacto completo.
7. **Teste de invasão** e cláusulas do Gemini pago e dos demais subprocessadores.
8. **Parecer jurídico** sobre tudo o que está marcado "validar", inclusive se o art. 20 se aplica e a classificação de risco. O custo desses itens está em [custo e preço](../resultados/metricas-custos.md).

Do que é do produto, o que pôde ser feito já foi: a tela **Minha conta** passou a trazer o nível de risco, quem é o controlador, como pedir revisão humana e o botão **Baixar os meus dados**.
