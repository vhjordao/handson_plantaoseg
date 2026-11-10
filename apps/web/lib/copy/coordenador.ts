/** Os textos das telas do coordenador: nova vaga, ordem sugerida e decisão. */
import type { ChaveCampo } from "@/lib/api/types";
import { plural } from "@/lib/format/datas";

export const NOVA_VAGA = {
  titulo: "Nova vaga",
  apresentacao:
    "Escreva o pedido como escreveria numa mensagem. O sistema lê, você confere, e nada avança sem a sua confirmação.",
  tituloEscrever: "Descreva a vaga",
  rotuloTexto: "O pedido",
  exemplos: "Exemplos para testar",
  ler: "Ler a vaga",
  preencherAMao: "Preencher os campos à mão",
  simularFalha: "Simular falha da leitura",
  tituloConferir: "Confira o que foi lido",
  tituloPreencher: "Preencha os campos",
  leituraPorRegras: "Leitura por regras",
  leituraPelaIA: "Leitura pela IA",
  oQueFoiLido: "O texto lido, com os trechos que viraram campo",
  falhaDaLeitura: "Não conseguimos ler a vaga com a IA. Preencha os campos abaixo.",
  iaIndisponivel: "A IA não leu este texto. Os campos abaixo vieram das regras: confira com atenção.",
  textoMudou: "Você mudou o texto depois da leitura. Leia a vaga de novo para atualizar os campos.",
  confirmar: "Confirmar e ver as sugestões",
  semConfirmacao: "Sem a sua confirmação, nada avança.",
  naoInformada: "Não informada",
  continuandoRascunho: "Você está continuando um rascunho. Ao publicar, ele sai da lista de vagas.",
  corrigido: "Corrigido por você",
  preenchido: "Preenchido por você",
} as const;

/** O campo que falta vira pergunta: a tela pergunta em vez de assumir (HAX G10). */
export const PERGUNTA_DO_CAMPO: Record<ChaveCampo, string> = {
  unidade: "Em qual hospital é o plantão?",
  especialidade: "Qual é a especialidade?",
  inicio: "Quando o plantão começa?",
  fim: "Quando o plantão termina?",
  urgencia: "Qual é a urgência?",
};

export const ESCOLHA_DO_CAMPO = {
  unidade: "Escolha o hospital",
  especialidade: "Escolha a especialidade",
} as const;

export const ERROS_DA_VAGA = {
  textoVazio: "Escreva o pedido antes de ler a vaga.",
  textoMudou: "O texto mudou depois da leitura. Leia a vaga de novo.",
  unidade: "Escolha o hospital.",
  especialidade: "Escolha a especialidade.",
  inicio: "Informe quando o plantão começa.",
  fim: "Informe quando o plantão termina.",
  fimAntesDoInicio: "O fim do plantão precisa ser depois do início.",
  urgencia: "Escolha a urgência.",
  publicarFalhou: "Não foi possível publicar a vaga. Tente de novo.",
} as const;

export const SINAIS_NO_TEXTO = {
  titulo: "Este texto traz instruções para o sistema",
  explicacao:
    "O sistema não obedece a instruções escritas no pedido. Só as regras leram o texto, e a IA não o recebeu. Confira os campos.",
  encontrado: "O que encontramos:",
} as const;

/** Os códigos de `guardrails.detect_injection`, em linguagem de quem usa a tela. */
export const ROTULO_SINAL: Record<string, string> = {
  texto_longo: "o texto passa de 500 caracteres, e só o começo foi lido",
  caracteres_controle: "há caracteres invisíveis no texto",
  ignorar_instrucoes: "pede para ignorar as regras",
  vazar_segredo: "pede chaves ou senhas",
  pagamento: "fala de valor ou pagamento, que nunca entra na ordem sugerida",
  forjar_campos: "tenta preencher os campos por fora",
  papel_falso: "pede para o sistema agir como outra pessoa",
  sem_revisao: "pede para aprovar sem revisão",
  dados_pessoais: "pede nome, CRM ou telefone",
  vazar_prompt: "pede as instruções internas do sistema",
  idioma_trocado: "traz instruções em outro idioma",
};

export const VAGA = {
  voltar: "Voltar para as vagas",
  pedidoOriginal: "Pedido original",
  jaExistia: "Esta janela já tinha uma vaga. Abrimos a que existe, sem criar outra.",
  naoEncontradaTitulo: "Não encontramos esta vaga",
  naoEncontrada: "Ela pode ter ficado em outra sessão da demonstração. Volte à lista de vagas.",
  erroTitulo: "Não foi possível carregar esta vaga",
  erro: "Tente de novo. Se continuar, volte à lista de vagas.",
  tentarDeNovo: "Tentar de novo",
  carregando: "Carregando a vaga…",
  rascunhoTitulo: "Esta vaga ainda é um rascunho",
  rascunho: "Faltam campos para ver as sugestões. Continue de onde parou.",
  continuar: "Continuar a vaga",
  semCoberturaTitulo: "Nenhum médico passou nas regras",
  semCobertura:
    "Não há o que decidir nesta janela: as regras barraram todos. Na demonstração, a disponibilidade diurna só existe em fim de semana. Tente outro horário.",
  publicarOutra: "Publicar outra vaga",
} as const;

export const ORDEM = {
  titulo: (mostrados: number, elegiveis: number) => `Ordem sugerida: ${mostrados} de ${elegiveis} elegíveis`,
  modelo: (versao: string) => `Modelo ${versao}, em simulação. A IA sugere, você decide.`,
  parecidas: (menor: string, maior: string) =>
    `Chances parecidas (${menor} a ${maior}): trate a ordem entre estes nomes como sugestão fraca.`,
  incluir: "Incluir na oferta",
  verMotivos: "Ver motivos",
  esconderMotivos: "Esconder motivos",
  pular: "Pular",
  pulado: "Você pulou este nome.",
  desfazer: "Desfazer",
  aprovar: "Aprovar e oferecer",
  marqueUm: "Marque pelo menos um nome para aprovar.",
  todosPulados: "Você pulou todos os nomes. Desfaça um pulo para aprovar.",
  escolhidos: (quantos: number) =>
    `${plural(quantos, "nome escolhido", "nomes escolhidos")}. A oferta segue esta ordem.`,
  neutralidade: "O valor do plantão e o pagamento não entram nesta ordem. Nomes e CRM são fictícios.",
  motivoPorRegra: "Motivo montado por regra",
  motivoPelaIA: "Motivo reescrito pela IA",
  motivoFallback: "A reescrita da IA não passou na checagem, então vale o texto montado por regra.",
  rodizio: (posicaoDoModelo: number, indicacoes: number) =>
    `Rodízio: só pelo modelo, seria o ${posicaoDoModelo}º. Entre chances a até 10 pontos, vai antes quem foi menos indicado nos últimos 7 dias (${plural(indicacoes, "indicação", "indicações")}).`,
  aprovado: "Aprovado",
  aprovadoNaOrdem: (lugar: number) => `Aprovado, ${lugar}º a receber a oferta`,
  naoRecebe: "Não recebe a oferta",
  puladoDepois: "Pulado",
  excecaoTitulo: "Exceção registrada",
  excecaoAlerta: "Alerta:",
  excecaoJustificativa: "Justificativa:",
  acaoFalhou: "Esta ação não foi registrada. Tente de novo.",
  ofertaEmAndamentoTitulo: "Oferta em andamento",
  ofertaEmAndamento:
    "A decisão está na trilha de auditoria. A cascata de ofertas aparece logo abaixo e se atualiza sozinha.",
  preenchida: (nome: string, minutos: number | null) =>
    `Aceita por ${nome}${minutos ? ` em ${minutos} min` : ""} (simulado).`,
} as const;

export const ALERTA_JORNADA = {
  titulo: "Alerta de jornada",
  exigeJustificativa: "Aprovar este nome exige uma justificativa escrita.",
} as const;

export const DIALOGO_DE_DECISAO = {
  titulo: "Confira antes de aprovar",
  descricao: "Nenhuma oferta sai antes de você confirmar.",
  vaga: "Vaga",
  quemRecebe: "Quem recebe a oferta, nesta ordem",
  alterar: "Alterar",
  justificativa: "Justificativa da exceção",
  ajudaJustificativa: "Diga por que aprova mesmo com o alerta. Fica registrado na trilha de auditoria.",
  depois: "O que acontece depois",
  umNome: (nome: string, ttl: number) => `A oferta vai a ${nome}, com ${ttl} min para responder.`,
  variosNomes: (nome: string, ttl: number) =>
    `A oferta vai primeiro a ${nome}, com ${ttl} min para responder. Se a pessoa recusar ou o prazo passar, ela segue para o próximo nome.`,
  trilha: "Sua decisão fica na trilha de auditoria, com o seu nome e a versão do modelo.",
  simulacao: "Na demonstração, a cascata é simulada, e o acompanhamento chega com a tela do médico.",
  confirmar: "Aprovar e oferecer",
  voltar: "Voltar sem aprovar",
  erroGeral: "A decisão não foi registrada. Tente de novo.",
} as const;

export const QUEM_FICOU_DE_FORA = {
  titulo: "Quem ficou de fora",
  resumo: (excluidos: number, total: number) =>
    `${excluidos} de ${total} médicos barrados por regras fixas, sem IA. Abra uma regra para ver exemplos.`,
  semExclusao: "Nenhum médico foi barrado pelas regras.",
  semExemplos: "Nesta janela, a demonstração guarda só a contagem.",
  medico: (pseudonimo: string) => `Médico ${pseudonimo}`,
} as const;

export const MOTIVOS = {
  chance: (percentual: string) => `Chance estimada de aceitar: ${percentual} (simulação).`,
  oQuePesou: "O que pesou nesta posição",
  legenda:
    "Comparado à média dos elegíveis: a barra para a direita aproxima este nome do topo, e para a esquerda afasta.",
  favor: "a favor",
  contra: "contra",
  neutro: "neutro",
  naoEntram: "O que não entra na ordem",
  verFicha: "Ver a ficha do modelo",
  ajudou: "Esta explicação ajudou?",
  sim: "Sim",
  nao: "Não",
  oQueFaltou: "O que faltou? (opcional)",
  enviar: "Enviar",
  registrado: "Fica registrado para revisão. Não treina o modelo agora.",
  feedbackFalhou: "O registro não foi feito. Tente de novo.",
} as const;

export const FICHA_DO_MODELO = {
  titulo: "Ficha do modelo",
  descricao: "O que este modelo é, com o que foi treinado e onde ele falha.",
  versao: "Versão",
  tipo: "Tipo",
  treinadoCom: "Treinado com",
  classeDeRisco: "Classe de risco preliminar",
  usadas: "O que o modelo usa",
  naoUsadas: "O que o modelo não usa",
  metricas: "Medidas, em simulação",
  limites: "Limites",
  carregando: "Carregando a ficha do modelo…",
  erro: "Não foi possível carregar a ficha do modelo. Feche e tente de novo.",
} as const;
