# Classificação de risco (Res. CFM 2.454/2026)

Resposta ao feedback da Entrega 3: *"validar a classificação de risco da solução"*. A Entrega 1 propôs **baixo risco**; a leitura do texto, em 30/10/2026, sugeriu **médio**; aqui o texto da resolução foi relido em 11/11/2026 (cópia do DOU hospedada pela [Fiocruz](https://observatoriohospitalar.fiocruz.br/sites/default/files/biblioteca/RESOLU%C3%87%C3%83O_2.454.pdf), com o aviso de que não substitui a versão certificada) e cada fator foi confrontado com o sistema.

> **Isto não é parecer jurídico, e a classificação formal não é nossa.** O art. 12 manda **as instituições médicas** fazerem a avaliação preliminar. O que entregamos é a ficha, para o hospital e o jurídico validarem.

## 1. O que a resolução pede

- **Art. 12:** a avaliação preliminar leva em conta "o potencial impacto nos direitos fundamentais e na saúde dos pacientes, a criticidade do contexto de uso, a complexidade e grau de autonomia do modelo, a finalidade pretendida e as finalidades potenciais, o nível de intervenção humana no resultado, e a quantidade e sensibilidade dos dados utilizados".
- **Art. 13:** quatro níveis (baixo, médio, alto, inaceitável), conforme o Anexo II, e o nível "deverá ser informado ao usuário".
- **Anexo II:**
  - **Baixo:** potencial de consequência negativa "mínimo ou inexistente", sem "influência decisória direta em diagnósticos ou tratamentos", em "funções administrativas, operacionais ou de apoio de baixo impacto". Exemplos: agendamento de consultas e gestão logística de insumos.
  - **Médio:** "sistemas que apoiam decisões clínicas ou operacionais importantes, mas não as executam de forma autônoma", com o erro detectável e corrigível pelo profissional antes de causar dano.
  - **Alto:** sistemas que "influenciam diretamente decisões médicas críticas ou executam ações automatizadas com consequências clínicas relevantes", em especial com pacientes vulneráveis ou em questões de vida ou morte.
- **§ 2º do Anexo II (médio):** controles proporcionais, com "monitoramento regular" e "avaliação de desempenho/bias em intervalos apropriados", e reavaliação se a autonomia ou a sensibilidade do contexto aumentar.

## 2. Os fatores do art. 12 aplicados ao PlantãoSeguro

| Fator | O que o sistema faz | Empurra para |
| --- | --- | --- |
| Impacto nos direitos fundamentais e na saúde | **Médicos:** o ranking afeta o acesso a plantões, e portanto a renda. **Pacientes:** só indiretamente, pela cobertura da escala. Nenhuma decisão clínica | **Médio**: o impacto nos médicos não é "mínimo ou inexistente" |
| Criticidade do contexto | Pronto-socorro e plantões essenciais: uma vaga descoberta pesa na segurança dos pacientes | Médio |
| Complexidade e autonomia | Regressão logística com sete variáveis e regras determinísticas; **nenhuma ação autônoma**: sem a aprovação do coordenador, nenhuma oferta sai | Baixo |
| Finalidade | Apoio administrativo e operacional à gestão de escalas; não é ato médico | Baixo |
| Intervenção humana | O coordenador aprova, o médico aceita ou recusa, e há contestação | Baixo |
| Quantidade e sensibilidade dos dados | Dados pessoais de trabalho de centenas ou milhares de médicos; **nenhum dado de paciente**; nenhum dado sensível como tal (ver a [análise da LGPD](lgpd.md), seção 2) | Baixo a médio |

## 3. Enquadramento

**Médio risco (preliminar).** Por que não baixo: o baixo pede consequência negativa "mínima ou inexistente", e um sistema que **ranqueia pessoas e define quem recebe uma oferta de plantão** tem impacto real na renda delas e na cobertura dos pacientes; é uma decisão operacional importante, que a resolução trata como médio. Por que não alto: ele **não executa nada sozinho**, não toca em decisão clínica, não usa dado de paciente e nenhum erro dele atinge a vida de alguém sem passar por um humano.

**Pesa a favor do médio:** os exemplos do baixo (agendamento de consultas, logística de insumos) tratam de coisas, e não de pessoas que competem por trabalho.

## 4. O que faria o risco subir (gatilhos de reclassificação)

O Anexo II manda reavaliar quando a autonomia ou o contexto mudam. Para o PlantãoSeguro, os gatilhos são:

1. **Oferta automática, sem aprovação do coordenador.** É o gatilho principal: passa a "executar ações", e o art. 20 da LGPD passa a valer ([análise](lgpd.md), seção 6).
2. **Uso do ranking para punir ou premiar médicos**, impor metas ou decidir vínculo, em vez de ordenar ofertas.
3. **Entrada de dado de paciente ou dado clínico** no sistema.
4. **Uso em escalas críticas com poucos reservas** (por exemplo, UTI) sem revisão humana da lista.
5. **Viés que não possa ser eliminado.** O Anexo III, II manda adotar medidas corretivas imediatas e, "em casos graves", descontinuar o sistema. A exclusão regional de médicos é hoje o risco que mais se aproxima disso: foi medida e **não está resolvida** ([experimento](../resultados/metricas-zona.md)).

Cada versão do modelo, de variáveis ou de segmento reabre a avaliação; no mínimo, a cada semestre.

## 5. Os controles do médio risco: o que existe e o que falta

| Exigência | Onde está no sistema | Falta |
| --- | --- | --- |
| Supervisão humana obrigatória (art. 15, parágrafo único) | Aprovação do coordenador; testes | — |
| Monitoramento regular e avaliação de viés (Anexo II, §2; Anexo III, II) | Tela de equidade (concentração e disparidade por grupo), rodízio de 10 pontos, `model_registry` | **Uma rotina escrita**: quem olha, com que frequência (a Entrega 3 propõe painel semanal e revisão mensal) e o que fazer se um limite for atingido |
| Transparência (Anexo III, I) | Explicação por recomendação, ficha do modelo, resultados publicados | Relatório regular em linguagem clara para o hospital |
| Responsável interno (Anexo III, III) | — | **O Diretor Técnico do hospital** assume; deve constar no contrato |
| Ciclo de vida do produto (Anexo III, VI) | ADRs, CI, rastreabilidade, versão do modelo em cada decisão | Rotina de revisão em produção |
| Acesso de órgãos de controle (Anexo III, VIII) | Trilha exportável em CSV, verificação da cadeia | Procedimento para atender um pedido |
| Contestabilidade (Anexo I, XX) | **Construída:** o médico contesta, o coordenador responde, tudo na trilha | Prazo de resposta |
| Comissão de IA e Telemedicina (art. 14, parágrafo único) | — | **Do hospital**, quando adota sistemas próprios; a documentação serve de insumo |
| Nível de risco informado ao usuário (art. 13) | **A tela "Minha conta" e a ajuda mostram "médio (preliminar)"** | O hospital confirma ou troca o nível |

## 6. Dois pontos a validar com jurídico

1. **O art. 11** ("qualquer utilização de IA deverá ser comunicada e explicada aos pacientes") fala de pacientes. O sistema não lida com dado nem com decisão sobre pacientes, então a comunicação provavelmente **não se aplica**; se o hospital entender que a escala faz parte do cuidado, aplica-se.
2. **A aplicação da resolução** a uma plataforma de gestão de escalas: o Anexo I cita "plataformas de IA utilizadas na gestão em saúde" e "apoio administrativo", o que a inclui; quem responde, o hospital, o desenvolvedor ou ambos, **é pergunta do jurídico** ([conformidade](README.md), seção 5).

**Conclusão.** A classificação de **médio risco** se sustenta nos fatores do art. 12 e no texto do Anexo II. O baixo risco da Entrega 1 não: ele ignora o impacto sobre quem é ranqueado. A classificação formal continua sendo do hospital.
