# Dados em produção: coleta, atualização e integração

- **Status:** desenho, escrito em 03/11/2026. **Nada disto roda hoje:** o trabalho usa só dados sintéticos e não envia dado de pessoa a nenhum serviço.
- **Responde a:** o feedback da Etapa 2 pediu para explorar como os dados seriam coletados, atualizados e integrados em um ambiente real ([FB2-3](../rastreabilidade-professor.md)).
- **Cuidado legal:** tudo que toca a LGPD e as resoluções do CFM aqui é proposta, a validar com jurídico.

> [!NOTE]
> **Em uma frase:** quase tudo de que o modelo precisa nasce dentro da própria plataforma. O dado real que substitui o sintético é o registro de ofertas e respostas. De fora vêm só a situação do CRM e o cadastro do hospital.

## 1. De onde vem cada dado

| Dado (tabelas) | Quem produz | Como entra no piloto | Como entra depois | Atualização |
| --- | --- | --- | --- | --- |
| Hospital e unidades (`organizations`, `units`) | Hospital | Cadastro na implantação, conferido na API do CNES | Igual | Na implantação; conferência mensal |
| Médico e CRM (`doctors`) | Médico; situação do CRM vem do CFM | Cadastro pelo médico, com o CRM conferido no serviço do CFM | Importação do credenciamento do hospital | CRM: conferência diária, e a oferta usa a situação do dia. Perfil: quando o médico mudar |
| Disponibilidade (`doctor_availability`) | Médico | Agenda no celular: janelas semanais e dias bloqueados | Igual | Quando mudar; lembrete depois de 30 dias sem revisão |
| Vagas (`shift_requests`, `shifts`) | Coordenador | Texto livre, conferido na tela; o Gemini só extrai os campos | Webhook do sistema de escala, se o hospital tiver | A cada vaga, em tempo real |
| Ofertas e respostas (`offers`) | A própria plataforma | Registro de cada oferta, no modo sombra e depois na cascata | Igual | Em tempo real |
| Comparecimento (`offers.attended`) | Coordenador | Confirmação em até 24 h depois do plantão | Check-in ou sistema de ponto | A cada plantão |
| Regras de jornada (`policy_config`) | Hospital | Configuração na implantação, com data de vigência | Igual | Quando a regra mudar: nova versão, sem apagar a antiga |
| Valor do plantão (`shift_compensation`) | Financeiro | Só se o hospital quiser, em tabela separada | Integração com o financeiro | A cada plantão |
| Trilha e modelo (`audit_log`, `model_registry`) | Plataforma | Automático | Igual | A cada decisão; a cada novo treino |

## 2. Qualidade, responsável e dados pessoais

As regras que hoje conferem o dado sintético ([seção 7 do dicionário](dicionario-de-dados.md#7-regras-de-qualidade-a-a1-reporta-o-resultado-de-cada-uma)) passam a rodar na entrada: registro inválido não entra e vai para uma fila de correção. A regra "sem dado real" se inverte e vira "nenhum dado de paciente no texto livre".

| Dado | Regra na entrada | Responsável | Dados pessoais |
| --- | --- | --- | --- |
| Hospital e unidades | CNES existe e pertence ao hospital; coordenadas válidas | Gestor do hospital | Não há |
| Médico e CRM | CRM ativo na UF, especialidade confere com a registrada, cadastro único | Médico e credenciamento | Sim. Nome, CRM e telefone nunca vão ao LLM |
| Disponibilidade | Início antes do fim, validade preenchida, sem sobreposição | Médico | Sim. Só o hospital onde o médico atende vê |
| Vagas | Campos obrigatórios conferidos pelo humano; texto tratado como entrada hostil | Coordenador | Não deveria haver: aviso e filtro contra dado de paciente |
| Ofertas e respostas | Par vaga e médico único, resposta depois da oferta, coerência entre aceite, comparecimento e sucesso | Plataforma | Sim. O treino usa só o ID pseudônimo |
| Comparecimento | Só existe se houve aceite; prazo de confirmação; contestável | Coordenador | Sim. Afeta o histórico do médico, por isso precisa de contestação |
| Regras de jornada | Limites dentro de faixas aceitas; nova vigência não reescreve o passado | Diretor técnico | Não há |
| Valor do plantão | Sem acesso do ranking e do LLM; teste de neutralidade na CI | Financeiro | Restrito, por causa da Res. CFM 2.460/2026 |
| Trilha e modelo | Só inserção, cadeia de hash, versão do modelo em cada decisão | Plataforma; auditoria pela Comissão de IA do hospital | Registro mínimo, com retenção a definir |

Antes de qualquer dado real: base legal, papéis de controlador e operador, termo de uso, relatório de impacto e prazo de retenção, como a [Entrega 1](../01-entrega-1-descoberta.md) já previu. Todos a validar com jurídico.

## 3. Integrações externas

| Serviço | O que traz | Como | Custo | Cuidado |
| --- | --- | --- | --- | --- |
| [CFM, consulta de médicos](https://sis.cfm.org.br/listamedicos/informacoes) (Res. CFM 2.309/2022) | Nome, número do CRM, UF, tipo e situação da inscrição, especialidade registrada. Não traz CPF, endereço, telefone nem e-mail | Webservice ou arquivo em lote, com atualização diária | R$ 948 por ano para empresa particular; sem custo para entidade pública | O acesso é direto pelo usuário final, sem empresa intermediária: o contrato talvez precise ser do hospital. Validar com jurídico |
| [CNES, dados abertos do Ministério da Saúde](https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?limit=1) | Código CNES, tipo de unidade, natureza jurídica, coordenadas, turno e atendimento hospitalar | API pública em JSON | Sem custo | É cadastro de estabelecimentos; o hospital confere o resultado |
| Sistema de escala do hospital | Vagas, escala fixa e ponto | API ou webhook, se houver; senão, planilha | Depende do fornecedor | As entrevistas dizem quais sistemas existem (pergunta 7 do coordenador) |
| Gemini | Extrai campos do texto da vaga e reescreve o motivo | API, com esquema fechado e sem ferramentas | Camada paga, porque a gratuita pode usar o conteúdo para melhorar produtos | Sem nome, CRM nem telefone; com falha, cai nas regras |

Fontes lidas em 03/11/2026. Preços e condições podem mudar: reconferir na contratação.

## 4. Do dado ao modelo

1. **Entrada:** cada evento chega pela API, autenticado, com hora e origem.
2. **Validação:** as regras da seção 2. O que falha vai para correção e não contamina o histórico.
3. **Variáveis no instante da oferta:** o mesmo cálculo da PoC (`FeatureStore`), que só enxerga o que já se sabia naquele momento.
4. **Rótulo com atraso:** o sucesso só existe depois do plantão. O treino usa só ofertas de plantão já terminado.
5. **Treino mensal e teste temporal:** treina no passado e testa na janela seguinte, contra o baseline e contra o modelo em uso.
6. **Portão:** o modelo novo só entra se ganhar dos dois sem piorar a concentração de ofertas além do limite combinado. A versão vai para `model_registry` e `audit_log`. O coordenador continua decidindo.
7. **Monitoramento semanal:** taxa de aceite, ofertas por vaga, tempo até preencher, concentração, comparecimento e mudança nas distribuições das variáveis. Se piorar, a recomendação volta ao baseline até a causa ser entendida.

**Como começar sem histórico:** pelo baseline. Na [simulação de lançamento](../resultados/metricas-robustez.md#simulação-de-lançamento), o modelo perde do baseline com 114 ofertas de resultado conhecido e passa a ganhar a partir de 252. Com 3 hospitais simulados, isso ocorre entre o dia 7 e o dia 14; um hospital sozinho levaria cerca de três vezes mais. É simulação: o critério real é o portão acima, não um número fixo.

## 5. Fases de implantação

| Fase | O que acontece | Dados reais? | Portão para avançar |
| --- | --- | --- | --- |
| 0. Hoje | Dados sintéticos e entrevistas | Não | Entrevistas e revisão às cegas confirmam a dor e as premissas |
| 1. Piloto em paralelo, 90 dias | O coordenador trabalha como sempre e registra vagas e chamadas. O sistema calcula a recomendação, mas ninguém recebe oferta por ela | Sim, com a base legal da seção 2 | Ofertas por vaga e tempo reais medidos; recomendação melhor que o baseline no teste temporal |
| 2. Uso assistido | O coordenador aprova as ofertas na ferramenta, com cascata e trilha | Sim | Metas de 6 meses da Etapa 3 |
| 3. Integração | API ou webhook com escala, ponto e financeiro | Sim | Volume e hospital justificam o custo |

**Volume do piloto:** na escala dos 3 hospitais simulados, 90 dias dão cerca de 1.788 ofertas com resultado conhecido, mais do que o modelo precisou na simulação.

**Limite do modo sombra:** ele só vê a resposta de quem o coordenador de fato chamou. Comparar com a ordem do modelo tem o mesmo viés de seleção que a Etapa 2 declarou: quem o coordenador nunca chama não tem histórico. Por isso o piloto mede também a revisão às cegas e guarda quem o modelo teria chamado, para a fase 2 poder testar com oferta real, sempre com aprovação humana.

## 6. O que muda no código

- **Não muda:** regras, variáveis, modelo, explicação e auditoria. O motor recebe um `Dataset`, venha de onde vier.
- **Muda:** a origem do `Dataset`, que passa a ser uma camada de repositório sobre o banco ([plano](../plano-etapa-3.md)). Essa construção segue aguardando as contas novas.
- **Continua:** o gerador sintético, para testes, CI e demonstração.

## 7. Limites

- É um desenho: nada foi validado com hospital, e as entrevistas podem mudar as fases, sobretudo a integração com sistemas de escala.
- Os responsáveis são os papéis prováveis; cada hospital define os seus.
- As afirmações sobre CFM, CNES, LGPD e resoluções citam o que foi lido em 03/11/2026 e não substituem parecer jurídico.
