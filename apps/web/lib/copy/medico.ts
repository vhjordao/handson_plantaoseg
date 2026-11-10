/**
 * Textos da área do médico e da cascata que o coordenador acompanha (fase 4 do roteiro). A recusa
 * tem quatro motivos e não se desfaz (D4 e D5 do ADR 0015); a tela consulta a cada 3 s (D7).
 */

export const OFERTAS = {
  titulo: "Ofertas",
  descricao:
    "Cada oferta traz o plantão, o local, o horário, a distância, o prazo e o motivo de o sistema ter sugerido você. Quem decidiu oferecer foi a coordenação.",
  carregando: "Carregando as suas ofertas…",
  erroTitulo: "Não foi possível carregar as ofertas",
  erro: "O sistema não respondeu. Tente de novo em instantes.",
  tentarDeNovo: "Tentar de novo",
  abertasTitulo: "Esperando a sua resposta",
  semAbertasTitulo: "Nenhuma oferta esperando resposta",
  semAbertas:
    "Quando a coordenação aprovar o seu nome para uma vaga, a oferta aparece aqui sozinha, sem recarregar a página.",
  historicoTitulo: "Respondidas e encerradas",
  semHistorico: "Nenhuma oferta anterior.",
  naDemonstracaoTitulo: "Ofertas indisponíveis neste modo",
  naDemonstracao: "As ofertas não estão disponíveis neste modo. Entre com o login para vê-las.",
} as const;

export const OFERTA = {
  plantao: "Plantão",
  local: "Local",
  horario: "Horário",
  distancia: "Distância",
  distanciaKm: (km: string) => `${km} km`,
  semDistancia: "Não informada",
  prazo: "Prazo",
  responderAte: (hora: string) => `Responda até ${hora}`,
  falta: (minutos: number, segundos: number) =>
    minutos > 0 ? `faltam ${minutos} min ${segundos} s` : `faltam ${segundos} s`,
  prazoAcabou: "O prazo acabou. A oferta passa para o próximo nome aprovado.",
  porQueTitulo: "Por que você",
  porQueVazio: "O sistema não guardou o texto do motivo desta oferta.",
  porQueRotulo: "Sugestão do sistema, explicada pelas variáveis do ranking",
  alertas: "Atenção à jornada",
  aceitar: "Aceitar o plantão",
  recusar: "Recusar",
  contestar: "Contestar a recomendação",
  contestada: "Você contestou esta recomendação.",
  urgencia: { low: "Urgência baixa", medium: "Urgência média", high: "Urgência alta" },
  status: {
    na_fila: "Na fila",
    aberta: "Esperando a sua resposta",
    aceita: "Você aceitou",
    recusada: "Você recusou",
    expirada: "Prazo encerrado",
    cancelada: "Vaga encerrada",
  },
  respondidaEm: (hora: string) => `Respondida às ${hora}`,
  motivoDaRecusa: (motivo: string) => `Motivo: ${motivo}`,
} as const;

export const RESPONDER = {
  aceitarTitulo: "Aceitar este plantão?",
  aceitarDescricao:
    "Ao aceitar, a vaga fecha no seu nome e a coordenação vê na hora. Não dá para desfazer pela tela: se mudar de ideia, fale com a coordenação.",
  recusarTitulo: "Recusar este plantão?",
  recusarDescricao:
    "A oferta passa na hora para o próximo nome aprovado. Não dá para desfazer. O motivo ajuda a coordenação e fica registrado, sem texto livre.",
  motivoLegenda: "Por que você vai recusar?",
  motivoObrigatorio: "Escolha um dos motivos.",
  confirmarAceite: "Sim, aceitar",
  confirmarRecusa: "Sim, recusar",
  voltar: "Voltar",
  erro: "A resposta não foi registrada.",
  aceita: "Você aceitou o plantão. A coordenação já está vendo.",
  recusada: "Você recusou. A oferta seguiu para o próximo nome.",
} as const;

export const CONTESTAR = {
  titulo: "Contestar esta recomendação",
  descricao:
    "Se algo no motivo ou na ordem não parece certo, diga o quê. A coordenação responde por escrito, e tudo fica na trilha de auditoria. Contestar não muda a sua resposta à oferta.",
  motivoLegenda: "O que não está certo?",
  texto: "Explique em poucas palavras",
  textoAjuda: "Não escreva nome, CRM nem telefone.",
  textoObrigatorio: "Escreva o que está errado.",
  motivoObrigatorio: "Escolha o que não está certo.",
  enviar: "Enviar a contestação",
  voltar: "Voltar",
  erro: "A contestação não foi enviada.",
  enviada: (protocolo: string) =>
    `Contestação enviada, protocolo ${protocolo}. A resposta aparece em Contestações.`,
} as const;

export const CONTESTACOES = {
  titulo: "Contestações",
  descricao:
    "As recomendações que você contestou, com o protocolo e a resposta da coordenação. Para contestar, abra a oferta em Ofertas.",
  carregando: "Carregando as suas contestações…",
  erroTitulo: "Não foi possível carregar as contestações",
  erro: "O sistema não respondeu. Tente de novo em instantes.",
  vazioTitulo: "Nenhuma contestação",
  vazio: "Quando você contestar uma recomendação, ela aparece aqui com o protocolo.",
  protocolo: (protocolo: string) => `Protocolo ${protocolo}`,
  aberta: "Esperando resposta",
  respondida: "Respondida",
  enviadaEm: (quando: string) => `Enviada em ${quando}`,
  seuTexto: "O que você escreveu",
  resposta: "Resposta da coordenação",
  respondidaEm: (quando: string) => `Respondida em ${quando}`,
  naDemonstracao: "As contestações não estão disponíveis neste modo. Entre com o login para vê-las.",
} as const;

export const ENTRADA_DO_MEDICO = {
  temOferta: "Tem oferta esperando resposta",
} as const;

export const CASCATA = {
  titulo: "Cascata de ofertas",
  descricao:
    "Uma oferta por vez, na ordem que você aprovou. Se o médico recusa ou o prazo acaba, o próximo é chamado sozinho. Esta área se atualiza a cada 3 segundos.",
  carregando: "Carregando a cascata…",
  erro: "Não foi possível carregar a cascata agora. A tela tenta de novo sozinha.",
  vazia: "Nenhuma oferta enviada ainda.",
  vez: (n: number) => `${n}º`,
  falta: (minutos: number, segundos: number) =>
    minutos > 0 ? `${minutos} min ${segundos} s para responder` : `${segundos} s para responder`,
  aguardandoProximo: "Prazo encerrado. O próximo nome é chamado em instantes.",
  enviadaAs: (hora: string) => `enviada às ${hora}`,
  respondidaAs: (hora: string) => `às ${hora}`,
  motivo: (motivo: string) => `motivo: ${motivo}`,
  preenchida: (nome: string) => `${nome} aceitou. A vaga está preenchida.`,
  simulacaoTitulo: "Simulação",
  simulacao:
    "No modo de demonstração, o relógio só anda quando você manda. No sistema real, o prazo vence sozinho, e o n8n chama o próximo.",
  passarPrazo: "Passar o prazo desta oferta",
  passarPrazoErro: "Não foi possível passar o prazo agora.",
  semCobertura:
    "Ninguém da lista aceitou. A vaga ficou sem cobertura: publique de novo ou aprove outros nomes.",
} as const;
