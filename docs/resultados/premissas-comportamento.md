# Premissas de comportamento contra fontes públicas

> **Simulação e fontes públicas.** Os números do simulador vêm de dados sintéticos. As fontes abaixo foram lidas em 06/11/2026; nenhuma é de hospital privado brasileiro, e algumas são alegações de empresas, marcadas como tal. Esta comparação substitui as entrevistas, que não aconteceram (decisão do Victor em 06/11/2026; [roteiro](../roteiro-ate-o-mvp.md), passo E.1).

## Por que esta tabela

A [comparação com dados públicos](metricas-robustez.md#comparação-com-dados-públicos) já confere a **composição** dos médicos contra o estudo *Demografia Médica no Brasil 2025*. Falta o **comportamento**: quanto se aceita, quanto demora, quanto fica descoberto. O estudo quase não traz números sobre plantão, então a busca foi por outras fontes publicadas.

## Premissa contra fonte

| Premissa | No simulador | Fonte pública | Leitura |
| --- | --- | --- | --- |
| Vagas que ninguém cobre, no processo manual | 5,4% das vagas ([fluxo](metricas-fluxo.md)) | **11,3%** dos turnos de médicos substitutos pedidos ficaram sem cobertura, em média, nos hospitais públicos da Inglaterra, de 2019 a 2021 (Grigoroglou e outros, *BMJ Open*, 2023) | **O simulador é otimista sobre o processo manual.** Contexto diferente (sistema público inglês, substitutos), mas é a única medida acadêmica encontrada. Se o real estiver mais perto de 11%, há mais vagas a evitar, e o caso de negócio melhora |
| Antecedência da publicação | A chance de aceite não depende de quanto antes a vaga sai; só a urgência alta aumenta o aceite | Publicar com mais de 60 dias de antecedência preenche cerca de 60% mais que publicar com menos de 5 dias (Locum's Nest, empresa do setor; **sem auditoria**) | **Possível divergência:** o simulador não premia publicar cedo. Fica declarada; nenhuma conclusão do documento depende dela |
| Tempo de resposta a uma oferta | Média de 20 min; uma oferta por vez, com prazo de 60 min | Primeira resposta em cerca de 2 min, com cerca de 3 respostas por vaga e 70% preenchidas, num aplicativo que avisa todos de uma vez (Stevenson Memorial Hospital, Canadá, piloto de um ano relatado em 2018; texto ligado ao fornecedor) | **Comparação imperfeita:** lá a vaga vai a todos; aqui, a um por vez. O [teste de premissas](metricas-robustez.md) já varia o prazo da oferta |
| Valor do plantão de 12 h | Mediana simulada de R$ 1.907 | **R$ 1.500** de referência (R$ 2.000 em feriados) no credenciamento da Fhemig, rede pública de Minas Gerais (Agência Minas, 02/01/2024); média de R$ 1.207, de R$ 500 a R$ 1.900 (Medway, página atualizada em 2026, sem fonte declarada) | **O simulador fica no topo da faixa pública.** O valor não entra no ranking (Res. CFM 2.460); só serve de ordem de grandeza no caso de negócio |
| Carga de trabalho | O aceite cai com plantões nos últimos 30 dias e com menos de 11 h de descanso | 75,5% dos médicos trabalhavam mais de 40 h por semana e comumente faziam plantão; só 22% tinham um único empregador, e 24,2% tinham quatro ou mais (*Demografia Médica* 2015, CFM, 30/11/2015) | **Coerente na direção:** com tanta carga, descanso e plantões recentes pesam. O tamanho do efeito não tem fonte |
| Distância | O aceite cai com a distância: 39,9% até 5 km e 17,4% a partir de 20 km ([análise](../analise/README.md)) | Nenhum número publicado encontrado | **Premissa declarada.** É a que mais pesa na equidade por zona; o teste de premissas varia o peso dela |
| Ofertas até alguém aceitar | 3,31 por vaga no processo manual | Nenhum número publicado encontrado | **Premissa declarada.** O teste de premissas mostra que o ganho de tempo depende sobretudo de como o coordenador real escolhe |

## O que isso muda

- **No caso de negócio:** a taxa de vagas descobertas da referência inglesa (11,3%) entra como cenário alternativo à do simulador (5,4%). Num hospital com 816 vagas por ano, seriam cerca de 92 vagas descobertas por ano, e não 44.
- **No valor de uma vaga descoberta (V):** as faixas de R$ 1.000 e R$ 2.000 usadas no ROI ficam na ordem de grandeza do plantão público (R$ 1.500). V não é o valor do plantão: é o que o hospital paga a mais ou deixa de atender quando ninguém cobre.
- **No que segue sem fonte:** a distância e o número de ofertas até alguém aceitar. São justamente as premissas que o teste de premissas mostra que mais pesam. Só um piloto em paralelo as resolve.

## Fontes

- Grigoroglou C, Walshe K, Kontopantelis E, Ferguson J, Stringer G, Ashcroft D, Allen T. *Use of locum doctors in NHS trusts in England: analysis of routinely collected workforce data 2019–2021*. BMJ Open, 13(6), e065803, 2023. [Resumo](https://research.birmingham.ac.uk/en/publications/use-of-locum-doctors-in-nhs-trusts-in-england-analysis-of-routine).
- Locum's Nest. *How a workforce system enhances the flexibility of bank shifts for NHS Trusts and healthcare professionals* (blog da empresa). [Página](https://www.locumsnest.co.uk/blog/2022/9/27/how-a-workforce-system-enhances-the-flexibility-of-bank-shifts-for-nhs-trusts-and-healthcare-professionals).
- Canadian Healthcare Technology. *ShiftLink app fills shifts at Stevenson hospital*, 05/12/2018. [Página](https://www.canhealth.com/?p=12064).
- Agência Minas. *Fhemig abre credenciamento de médicos em diversas cidades do estado*, 02/01/2024. [Notícia](https://www.agenciaminas.mg.gov.br/noticia/fhemig-abre-credenciamento-de-medicos-em-diversas-cidades-do-estado-120466).
- Medway. *Saiba quanto um médico ganha por plantão*, atualizada em 25/05/2026. [Página](https://www.medway.com.br/conteudos/saiba-quanto-um-medico-ganha-por-plantao/).
- Conselho Federal de Medicina. *Demografia Médica 2015: médicos sofrem com múltiplos vínculos e longas jornadas de trabalho e plantões*, 30/11/2015. [Notícia](https://portal.cfm.org.br/noticias/demografia-medica-2015-medicos-sofrem-com-multiplos-vinculos-e-longas-jornadas-de-trabalho-e-plantoes/).
