/**
 * A única porta entre a interface e os dados.
 *
 * Os componentes e as telas falam **só** com `PlantaoApi`. Há dois adaptadores:
 * `demo` (no navegador, com fixtures do pipeline real e relógio simulado, sem rede) e
 * `live` (a `matching-api` e o Supabase, por rotas e ações de servidor; a chave de serviço
 * nunca vai ao navegador). A escolha é `NEXT_PUBLIC_DATA_MODE=demo|live` (ADR 0011).
 */
import type {
  AprovarInput,
  Cascata,
  ConfirmarVagaInput,
  ContestarInput,
  Contestacao,
  Decisao,
  EventoPlantao,
  FeedbackExplicacaoInput,
  FichaModelo,
  Indicadores,
  Leitura,
  Oferta,
  Persona,
  Politica,
  PularInput,
  Recomendacao,
  RegistroAuditoria,
  RespostaOfertaInput,
  VerificacaoCadeia,
  Vaga,
  DataHora,
} from "./types";

export type ModoDados = "demo" | "live";

/** Chamado por métodos que um adaptador ainda não implementa (fases UI-2 e UI-3). */
export class NaoImplementadoError extends Error {
  constructor(metodo: string, modo: ModoDados) {
    super(`PlantaoApi.${metodo} ainda não existe no modo ${modo}.`);
    this.name = "NaoImplementadoError";
  }
}

/** A API não respondeu: a interface oferece trocar para o modo demonstração. */
export class ApiIndisponivelError extends Error {
  constructor(causa?: unknown) {
    super("A API não respondeu.", { cause: causa });
    this.name = "ApiIndisponivelError";
  }
}

export interface PlantaoApi {
  readonly modo: ModoDados;

  /** Relógio da demonstração. No `demo`, a âncora é quinta, 01/10/2026, 9h. */
  agora(): DataHora;

  // --- Sessão ---------------------------------------------------------------
  listarPersonas(papel: "coordenador" | "medico"): Promise<Persona[]>;

  // --- Vagas (coordenador) --------------------------------------------------
  listarVagas(): Promise<Vaga[]>;
  obterVaga(vagaId: string): Promise<Vaga>;
  /** "Ler a vaga": extrai os campos do texto livre. Não cria nada; a pessoa confere antes. */
  lerVaga(texto: string): Promise<Leitura>;
  /** Registra os campos conferidos (`extraction_confirmed` e `shift_published`). */
  confirmarVaga(input: ConfirmarVagaInput): Promise<Vaga>;
  obterSugestoes(vagaId: string): Promise<Recomendacao>;
  /** A decisão humana. Sem esta chamada, nenhuma oferta pode sair. */
  aprovar(input: AprovarInput): Promise<Decisao>;
  /** "Pular" um sugerido, sem culpa (`recommendation_rejected`). */
  pular(input: PularInput): Promise<void>;
  /** "Esta explicação ajudou?". Fica registrado; não treina o modelo agora. */
  enviarFeedbackExplicacao(input: FeedbackExplicacaoInput): Promise<void>;
  obterFichaModelo(): Promise<FichaModelo>;
  obterPolitica(): Promise<Politica>;

  // --- Cascata e ofertas (UI-2) --------------------------------------------
  obterCascata(vagaId: string): Promise<Cascata>;
  listarOfertas(medicoId: string): Promise<Oferta[]>;
  obterOferta(ofertaId: string): Promise<Oferta>;
  responderOferta(input: RespostaOfertaInput): Promise<Oferta>;
  /** Desfaz a resposta enquanto a oferta ainda estiver aberta. */
  desfazerResposta(ofertaId: string): Promise<Oferta>;

  // --- Contestações (UI-2 e UI-3) ------------------------------------------
  contestar(input: ContestarInput): Promise<Contestacao>;
  listarContestacoes(filtro?: { medicoId?: string }): Promise<Contestacao[]>;
  responderContestacao(input: { id: string; texto: string }): Promise<Contestacao>;

  // --- Auditoria e indicadores (UI-3) --------------------------------------
  listarAuditoria(filtro?: { vagaId?: string }): Promise<RegistroAuditoria[]>;
  /** Refaz a cadeia de hash no navegador (SHA-256), como `AuditLog.verify` no Python. */
  verificarCadeia(): Promise<VerificacaoCadeia>;
  obterIndicadores(): Promise<Indicadores>;

  // --- Tempo real -----------------------------------------------------------
  /** Devolve a função que cancela a assinatura. */
  assinar(ouvinte: (evento: EventoPlantao) => void): () => void;
}
