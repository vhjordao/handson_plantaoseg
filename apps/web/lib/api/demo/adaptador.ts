/**
 * O adaptador `demo` de `PlantaoApi`: roda no navegador, sem rede, sobre as fixtures geradas do
 * pipeline real (`lib/demo/mundo.json` e `grade.json`) e com o relógio simulado (quinta,
 * 01/10/2026, 9h). A IA recomenda, o humano decide: nenhuma oferta sai sem `aprovar`.
 *
 * Tudo o que a sessão faz (publicar, decidir, pular) vai para a trilha de auditoria
 * encadeada por hash, no mesmo formato do backend. As telas nunca recebem o estado interno:
 * toda resposta é uma cópia. As funções que mudam o estado rodam uma de cada vez (a cadeia de
 * hash depende da ordem) e só gravam no fim, de uma vez, para que ninguém veja meia operação.
 */
import { carregarGrade, chaveDaGrade, obterMundo } from "../../demo/mundo";
import type { Mundo } from "../../demo/schema";
import {
  CandidatoInvalidoError,
  EntradaInvalidaError,
  EstadoInvalidoError,
  ForaDaGradeError,
  JustificativaObrigatoriaError,
  MIN_CARACTERES_JUSTIFICATIVA,
  NaoEncontradoError,
  SemRecomendacaoError,
} from "../erros";
import { NaoImplementadoError, type PlantaoApi } from "../plantao-api";
import {
  AprovarInputSchema,
  ConfirmarVagaInputSchema,
  DesfazerPuloInputSchema,
  FeedbackExplicacaoInputSchema,
  LIMITE_TEXTO_VAGA,
  PularInputSchema,
  type Cascata,
  type Candidato,
  type ConfirmarVagaInput,
  type Contestacao,
  type DataHora,
  type Decisao,
  type EstadoDaDecisao,
  type EventoPlantao,
  type ExemploDeVaga,
  type FichaModelo,
  type Indicadores,
  type Leitura,
  type Oferta,
  type Persona,
  type Politica,
  type Recomendacao,
  type RegistroAuditoria,
  type Unidade,
  type VerificacaoCadeia,
  type Vaga,
} from "../types";
import { z } from "zod";
import { criarRegistro, verificarRegistros, type EntradaDeRegistro } from "./auditoria";
import { Barramento } from "./barramento";
import { minutosEntre, normalizarDataHora } from "./datas";
import {
  esquecerEstado,
  estadoInicial,
  persistirEstado,
  restaurarEstado,
  type DadosDaSessao,
} from "./estado";
import { lerTexto } from "./leitura";
import { removerDadosPessoais, semMarcasDeRemocao } from "./privacidade";
import { Relogio } from "./relogio";
import { sha256Hex } from "./sha256";

export interface OpcoesApiDemo {
  /** Onde guardar a sessão (o `sessionStorage`). Sem ele, o estado vive só em memória. */
  storage?: Storage | null;
  /** Atraso artificial de cada resposta, em ms, para simular rede nos testes visuais. */
  latenciaMs?: number;
}

/** `PlantaoApi` mais o que só o modo `demo` oferece a quem conduz a apresentação. */
export interface PlantaoApiDemo extends PlantaoApi {
  /** Volta ao ponto de partida das fixtures e apaga a sessão guardada. */
  reiniciar(): void;
  /** Adianta o relógio simulado (só para frente) e devolve o novo "agora". */
  avancarRelogio(minutos: number): DataHora;
  /**
   * Quem está decidindo. A interface não passa a persona em cada chamada (o contrato não
   * tem esse parâmetro); sem isto, decide o coordenador da unidade da vaga.
   */
  definirCoordenador(personaId: string | null): void;
}

type PersonaCoordenador = Extract<Persona, { papel: "coordenador" }>;

const DOZE_HORAS_EM_MINUTOS = 12 * 60;
const AGENTE_DO_SISTEMA = "matching-api";

/** Aprovação sem exigir candidatos: quem confere se há algum é o adaptador, com erro próprio. */
const AprovarEntradaSchema = AprovarInputSchema.extend({ medicoIds: z.array(z.string()) });

const copia = <T>(valor: T): T => structuredClone(valor);

/** Valida a entrada e, se ela não couber no contrato, lança um erro que a tela sabe mostrar. */
function validar<S extends z.ZodType>(esquema: S, entrada: unknown): z.output<S> {
  const lido = esquema.safeParse(entrada);
  if (lido.success) return lido.data;
  const longoDemais = lido.error.issues.find((problema) => problema.code === "too_big");
  throw new EntradaInvalidaError(
    longoDemais
      ? `O texto passou do limite de ${Number(longoDemais.maximum).toLocaleString("pt-BR")} caracteres. Encurte e tente de novo.`
      : "Confira os campos e tente de novo.",
  );
}

/** As mesmas pessoas, na mesma ordem (a ordem é a da cascata de ofertas). */
const mesmaLista = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((item, indice) => item === b[indice]);

/**
 * "Em risco": começa em menos de 24 h e nenhuma oferta foi aceita (prompt de frontend, 9.3).
 * É um alerta derivado do relógio, não um estado: por isso é recalculado a cada leitura.
 */
function comRisco(vaga: Vaga, agora: DataHora): Vaga {
  const aberta = vaga.status === "aguardando_decisao" || vaga.status === "oferta_em_andamento";
  const faltam = vaga.inicio ? minutosEntre(vaga.inicio, agora) / 60 : null;
  if (aberta && faltam !== null && faltam >= 0 && faltam < 24) {
    return {
      ...vaga,
      emRisco: true,
      motivoRisco: `Começa em ${Math.round(faltam)} h e nenhuma oferta foi aceita`,
    };
  }
  return { ...vaga, emRisco: false, motivoRisco: null };
}

class ApiDemo implements PlantaoApiDemo {
  readonly modo = "demo" as const;

  private readonly mundo: Mundo = obterMundo();
  private readonly relogio = new Relogio(this.mundo.agora);
  private readonly barramento = new Barramento();
  private readonly storage: Storage | null;
  private readonly latenciaMs: number;
  private dados: DadosDaSessao;
  /** Cresce a cada `reiniciar`: uma operação em andamento não grava num estado que já mudou. */
  private geracao = 0;
  private fila: Promise<unknown> = Promise.resolve();

  constructor(opcoes: OpcoesApiDemo) {
    this.storage = opcoes.storage ?? null;
    this.latenciaMs = Math.max(0, opcoes.latenciaMs ?? 0);
    this.dados = restaurarEstado(this.storage, this.mundo) ?? estadoInicial(this.mundo);
    this.relogio.restaurar(this.dados.minutosAvancados);
  }

  // --- Relógio e controles da apresentação ------------------------------------------------

  agora(): DataHora {
    return this.relogio.agora();
  }

  avancarRelogio(minutos: number): DataHora {
    const agora = this.relogio.avancar(minutos);
    this.dados.minutosAvancados = this.relogio.minutosAvancados;
    this.guardar();
    return agora;
  }

  reiniciar(): void {
    this.geracao += 1;
    const coordenadorId = this.dados.coordenadorId; // a persona é da sessão, não dos dados
    this.dados = { ...estadoInicial(this.mundo), coordenadorId };
    this.relogio.reiniciar();
    esquecerEstado(this.storage);
  }

  definirCoordenador(personaId: string | null): void {
    if (personaId !== null && !this.coordenadores().some((c) => c.id === personaId)) {
      throw new NaoEncontradoError("O coordenador");
    }
    this.dados.coordenadorId = personaId;
    this.guardar();
  }

  // --- Sessão -----------------------------------------------------------------------------

  async listarPersonas(papel: "coordenador" | "medico"): Promise<Persona[]> {
    await this.esperar();
    return copia(this.mundo.personas.filter((persona) => persona.papel === papel));
  }

  // --- Vagas ------------------------------------------------------------------------------

  async listarVagas(): Promise<Vaga[]> {
    await this.esperar();
    return this.dados.vagas
      .filter((vaga) => !this.dados.rascunhosConcluidos.includes(vaga.id))
      .map((vaga) => this.visivel(vaga))
      .sort((a, b) => (a.criadaEm === b.criadaEm ? a.id.localeCompare(b.id) : a.criadaEm < b.criadaEm ? 1 : -1));
  }

  async obterVaga(vagaId: string): Promise<Vaga> {
    await this.esperar();
    return this.visivel(this.vagaOuErro(vagaId));
  }

  async listarUnidades(): Promise<Unidade[]> {
    await this.esperar();
    return copia(this.mundo.unidades);
  }

  async listarExemplosDeVaga(): Promise<ExemploDeVaga[]> {
    await this.esperar();
    return this.mundo.exemplosTexto.map(({ id, rotulo, texto }) => ({ id, rotulo, texto }));
  }

  async lerVaga(texto: string): Promise<Leitura> {
    await this.esperar();
    return lerTexto(validar(z.string().max(LIMITE_TEXTO_VAGA), texto), this.relogio.hoje(), this.mundo.unidades);
  }

  confirmarVaga(entrada: ConfirmarVagaInput): Promise<Vaga> {
    return this.operacao(async (geracao) => {
      const input = validar(ConfirmarVagaInputSchema, entrada);
      const inicio = normalizarDataHora(input.inicio);
      const fim = normalizarDataHora(input.fim);
      const chave = chaveDaGrade(input.unidadeId, input.especialidade, inicio);
      const daGrade =
        minutosEntre(fim, inicio) === DOZE_HORAS_EM_MINUTOS ? (await carregarGrade())[chave] : undefined;
      if (!daGrade) throw new ForaDaGradeError();

      // Publicar a mesma janela de novo devolve a vaga que já existe (não duplica a trilha).
      const existente = this.dados.vagas.find((vaga) => this.chaveDaVaga(vaga) === chave);
      if (existente) {
        this.aplicar(geracao, () => this.concluirRascunho(input.rascunhoId));
        return this.visivel(existente);
      }

      const agora = this.relogio.agora();
      const id = `vaga-${(await sha256Hex(chave)).slice(0, 12)}`;
      const unidade = this.mundo.unidades.find((u) => u.id === input.unidadeId);
      if (!unidade) throw new ForaDaGradeError();
      const vaga: Vaga = {
        id,
        unidade: copia(unidade),
        especialidade: input.especialidade,
        inicio,
        fim,
        urgencia: input.urgencia,
        // Sem nenhum elegível pelas regras não há o que decidir: é vaga sem cobertura.
        status: daGrade.totalElegiveis === 0 ? "sem_cobertura" : "aguardando_decisao",
        emRisco: false,
        motivoRisco: null,
        textoOriginal: input.texto,
        criadaEm: agora,
        preenchidaPor: null,
        tempoAtePreencherMin: null,
      };

      // Os mesmos quatro passos do backend: publicar, confirmar, recomendar e explicar.
      const coordenador = this.coordenadorDe(unidade.id);
      const leitura = lerTexto(input.texto, this.relogio.hoje(), this.mundo.unidades);
      const doCoordenador = {
        ocorridoEm: agora,
        papelAtor: "coordinator" as const,
        atorPseudoId: coordenador.pseudoId,
        entidadeTipo: "shift_request",
        entidadeId: id,
      };
      const doSistema = {
        ocorridoEm: agora,
        papelAtor: "system" as const,
        atorPseudoId: AGENTE_DO_SISTEMA,
        modeloVersao: daGrade.modeloVersao,
      };
      const novos = await this.encadear([
        {
          ...doCoordenador,
          acao: "shift_published",
          detalhes: { extraction_source: leitura.fonte, flags: leitura.sinais },
        },
        {
          ...doCoordenador,
          acao: "extraction_confirmed",
          detalhes: {
            missing_optional: input.urgencia === null ? ["urgency"] : [],
            editados: [...input.editados],
          },
        },
        {
          ...doSistema,
          acao: "recommendation_generated",
          entidadeTipo: "shift",
          entidadeId: id,
          detalhes: {
            eligible: daGrade.totalElegiveis,
            excluded: daGrade.totalPool - daGrade.totalElegiveis,
            excluded_by_rule: { ...daGrade.exclusoesPorRegra },
            top_doctor_ids: daGrade.candidatos.map((c) => c.medico.id),
          },
        },
        ...daGrade.candidatos.map(
          (candidato): EntradaDeRegistro => ({
            ...doSistema,
            acao: "explanation_generated",
            entidadeTipo: "recommendation",
            entidadeId: `${id}:${candidato.medico.id}`,
            detalhes: {
              rank: candidato.posicao,
              source: candidato.explicacao.fonte,
              factors_cited: [...candidato.explicacao.fatoresCitados],
              fallback_reason: candidato.motivoFallback,
            },
          }),
        ),
      ]);

      this.aplicar(geracao, () => {
        this.dados.vagas.push(vaga);
        this.dados.chavesDaGrade[id] = chave;
        this.dados.auditoria.push(...novos);
        this.concluirRascunho(input.rascunhoId);
      });
      this.barramento.emitir({ tipo: "vaga_publicada", vagaId: id, em: agora });
      this.barramento.emitir({ tipo: "recomendacao_gerada", vagaId: id, em: agora });
      return this.visivel(vaga);
    });
  }

  async obterSugestoes(vagaId: string): Promise<Recomendacao> {
    await this.esperar();
    return this.recomendacaoDe(this.vagaOuErro(vagaId));
  }

  aprovar(entrada: z.input<typeof AprovarInputSchema>): Promise<Decisao> {
    return this.operacao(async (geracao) => {
      const input = validar(AprovarEntradaSchema, entrada);
      const vaga = this.vagaOuErro(input.vagaId);
      const ids = [...new Set(input.medicoIds)];
      if (vaga.status !== "aguardando_decisao") {
        // Repetir a mesma aprovação (duplo clique, nova tentativa) devolve a decisão já tomada.
        const anterior = this.dados.decisoes[vaga.id];
        if (anterior && mesmaLista(anterior.medicoIds, ids)) return copia(anterior);
        throw new EstadoInvalidoError("Esta vaga não está aguardando decisão.");
      }
      const recomendacao = await this.recomendacaoDe(vaga);
      const recomendados = new Map(recomendacao.candidatos.map((c) => [c.medico.id, c]));
      if (ids.length === 0 || !ids.every((id) => recomendados.has(id))) {
        throw new CandidatoInvalidoError();
      }
      if (this.puladosDe(vaga.id).some((id) => ids.includes(id))) {
        throw new CandidatoInvalidoError("Um dos nomes foi pulado. Desfaça o pulo antes de aprovar.");
      }
      const aprovados = ids.map((id) => recomendados.get(id) as Candidato);

      // Aprovar quem tem alerta de jornada é uma exceção humana: precisa de justificativa escrita.
      const comAlerta = aprovados.filter((c) => c.alertas.length > 0);
      let excecao: Decisao["excecao"] = null;
      if (comAlerta.length > 0) {
        const justificativa = removerDadosPessoais(
          (input.justificativa ?? "").trim(),
          this.nomesConhecidos(recomendacao),
        );
        // Conta o que sobra depois de limpar: só um nome ou um telefone não justifica a exceção.
        if (semMarcasDeRemocao(justificativa).length < MIN_CARACTERES_JUSTIFICATIVA) {
          throw new JustificativaObrigatoriaError();
        }
        excecao = {
          alertas: [...new Set(comAlerta.flatMap((c) => c.alertas))],
          justificativa,
        };
      }

      const agora = this.relogio.agora();
      const coordenador = this.coordenadorDe(vaga.unidade.id);
      const decisao: Decisao = {
        id: `decisao-${vaga.id}`,
        vagaId: vaga.id,
        medicoIds: ids,
        decididoPor: { pseudoId: coordenador.pseudoId, nome: coordenador.nome, cargo: coordenador.cargo },
        em: agora,
        excecao,
      };
      const [registro] = await this.encadear([
        {
          ocorridoEm: agora,
          papelAtor: "coordinator",
          atorPseudoId: coordenador.pseudoId,
          acao: "recommendation_approved",
          entidadeTipo: "shift",
          entidadeId: vaga.id,
          modeloVersao: recomendacao.modeloVersao,
          detalhes: {
            approved_doctor_ids: ids,
            mode: "humano",
            ...(excecao ? { excecao: copia(excecao) } : {}),
          },
        },
      ]);

      this.aplicar(geracao, () => {
        this.vagaOuErro(vaga.id).status = "oferta_em_andamento";
        this.dados.decisoes[vaga.id] = copia(decisao);
        this.dados.auditoria.push(registro as RegistroAuditoria);
      });
      this.barramento.emitir({ tipo: "decisao_registrada", vagaId: vaga.id, medicoIds: ids, em: agora });
      return copia(decisao);
    });
  }

  async obterEstadoDaDecisao(vagaId: string): Promise<EstadoDaDecisao> {
    await this.esperar();
    const vaga = this.vagaOuErro(vagaId);
    return copia({ decisao: this.dados.decisoes[vaga.id] ?? null, pulados: this.puladosDe(vaga.id) });
  }

  pular(entrada: z.input<typeof PularInputSchema>): Promise<void> {
    return this.operacao(async (geracao) => {
      const input = validar(PularInputSchema, entrada);
      const vaga = this.vagaOuErro(input.vagaId);
      if (vaga.status !== "aguardando_decisao") {
        throw new EstadoInvalidoError("Esta vaga não está aguardando decisão.");
      }
      const recomendacao = await this.recomendacaoDe(vaga);
      const candidato = recomendacao.candidatos.find((c) => c.medico.id === input.medicoId);
      if (!candidato) throw new CandidatoInvalidoError();
      // Pular o mesmo nome duas vezes não duplica o registro.
      if (this.dados.pulos.some((p) => p.vagaId === vaga.id && p.medicoId === input.medicoId)) return;

      const agora = this.relogio.agora();
      const coordenador = this.coordenadorDe(vaga.unidade.id);
      const motivo = input.motivo?.trim()
        ? removerDadosPessoais(input.motivo.trim(), this.nomesConhecidos(recomendacao))
        : null;
      const [registro] = await this.encadear([
        {
          ocorridoEm: agora,
          papelAtor: "coordinator",
          atorPseudoId: coordenador.pseudoId,
          acao: "recommendation_rejected",
          entidadeTipo: "recommendation",
          entidadeId: `${vaga.id}:${input.medicoId}`,
          modeloVersao: recomendacao.modeloVersao,
          detalhes: { rank: candidato.posicao, reason: motivo },
        },
      ]);
      this.aplicar(geracao, () => {
        this.dados.pulos.push({ ...input, motivo: motivo ?? undefined, em: agora });
        this.dados.auditoria.push(registro as RegistroAuditoria);
      });
    });
  }

  /** A trilha só cresce: o pulo continua lá, e esta linha diz que a pessoa voltou atrás. */
  desfazerPulo(entrada: z.input<typeof DesfazerPuloInputSchema>): Promise<void> {
    return this.operacao(async (geracao) => {
      const input = validar(DesfazerPuloInputSchema, entrada);
      const vaga = this.vagaOuErro(input.vagaId);
      if (vaga.status !== "aguardando_decisao") {
        throw new EstadoInvalidoError("Esta vaga não está aguardando decisão.");
      }
      // Desfazer o que já não está pulado (duplo clique) não grava nada.
      if (!this.puladosDe(vaga.id).includes(input.medicoId)) return;

      const recomendacao = await this.recomendacaoDe(vaga);
      const candidato = recomendacao.candidatos.find((c) => c.medico.id === input.medicoId);
      const agora = this.relogio.agora();
      const coordenador = this.coordenadorDe(vaga.unidade.id);
      const [registro] = await this.encadear([
        {
          ocorridoEm: agora,
          papelAtor: "coordinator",
          atorPseudoId: coordenador.pseudoId,
          acao: "recommendation_restored",
          entidadeTipo: "recommendation",
          entidadeId: `${vaga.id}:${input.medicoId}`,
          modeloVersao: recomendacao.modeloVersao,
          detalhes: { rank: candidato?.posicao ?? null },
        },
      ]);
      this.aplicar(geracao, () => {
        this.dados.pulos = this.dados.pulos.filter(
          (p) => p.vagaId !== vaga.id || p.medicoId !== input.medicoId,
        );
        this.dados.auditoria.push(registro as RegistroAuditoria);
      });
    });
  }

  /** Só registra: fica no estado da sessão, fora da trilha de hash, e não treina nada. */
  enviarFeedbackExplicacao(entrada: z.input<typeof FeedbackExplicacaoInputSchema>): Promise<void> {
    return this.operacao(async (geracao) => {
      const input = validar(FeedbackExplicacaoInputSchema, entrada);
      const vaga = this.vagaOuErro(input.vagaId);
      const recomendacao = await this.recomendacaoDe(vaga);
      if (!recomendacao.candidatos.some((c) => c.medico.id === input.medicoId)) {
        throw new CandidatoInvalidoError();
      }
      const comentario = input.comentario?.trim()
        ? removerDadosPessoais(input.comentario.trim(), this.nomesConhecidos(recomendacao))
        : undefined;
      const em = this.relogio.agora();
      this.aplicar(geracao, () => {
        this.dados.feedbacks.push({ ...input, comentario, em });
      });
    });
  }

  async obterFichaModelo(): Promise<FichaModelo> {
    await this.esperar();
    return copia(this.mundo.fichaModelo);
  }

  async obterPolitica(): Promise<Politica> {
    await this.esperar();
    return copia(this.mundo.politica);
  }

  // --- Cascata, ofertas e contestações: outra etapa (UI-2) -----------------------------------

  async obterCascata(): Promise<Cascata> {
    throw new NaoImplementadoError("obterCascata", this.modo);
  }

  async listarOfertas(): Promise<Oferta[]> {
    throw new NaoImplementadoError("listarOfertas", this.modo);
  }

  async obterOferta(): Promise<Oferta> {
    throw new NaoImplementadoError("obterOferta", this.modo);
  }

  async responderOferta(): Promise<Oferta> {
    throw new NaoImplementadoError("responderOferta", this.modo);
  }

  async desfazerResposta(): Promise<Oferta> {
    throw new NaoImplementadoError("desfazerResposta", this.modo);
  }

  async contestar(): Promise<Contestacao> {
    throw new NaoImplementadoError("contestar", this.modo);
  }

  async listarContestacoes(): Promise<Contestacao[]> {
    throw new NaoImplementadoError("listarContestacoes", this.modo);
  }

  async responderContestacao(): Promise<Contestacao> {
    throw new NaoImplementadoError("responderContestacao", this.modo);
  }

  // --- Auditoria e indicadores ----------------------------------------------------------------

  async listarAuditoria(filtro?: { vagaId?: string }): Promise<RegistroAuditoria[]> {
    await this.esperar();
    const vagaId = filtro?.vagaId;
    const registros = vagaId
      ? this.dados.auditoria.filter(
          (r) => r.entidadeId === vagaId || r.entidadeId.startsWith(`${vagaId}:`),
        )
      : this.dados.auditoria;
    return copia(registros);
  }

  async verificarCadeia(): Promise<VerificacaoCadeia> {
    await this.esperar();
    return verificarRegistros(this.dados.auditoria);
  }

  async obterIndicadores(): Promise<Indicadores> {
    await this.esperar();
    const base = this.mundo.indicadoresBase;
    return {
      rotulo: "simulado",
      tempoMedioAtePreencherMin: base.tempoMedioFluxoMin,
      pctPreenchidasComAntecedencia24h: base.pctPreenchidasComAntecedencia24h,
      pctSugestoesAceitas: this.pctSugestoesAceitas() ?? base.pctSugestoesAceitas,
      // O processo manual simulado, nas mesmas vagas de teste: o "contra X" do painel.
      linhaDeBase: {
        tempoMedioAtePreencherMin: base.tempoMedioManualMin,
        pctPreenchidasComAntecedencia24h: base.pctPreenchidasComAntecedencia24hManual,
      },
      vagasPublicadas: this.dados.vagas.filter((vaga) => vaga.status !== "rascunho").length,
      decisoesHumanas: Object.keys(this.dados.decisoes).length,
      aceites: this.dados.vagas.filter((vaga) => vaga.status === "preenchida").length,
      fonte: base.fonte,
    };
  }

  // --- Tempo real -----------------------------------------------------------------------------

  assinar(ouvinte: (evento: EventoPlantao) => void): () => void {
    return this.barramento.assinar(ouvinte);
  }

  // --- Apoio interno --------------------------------------------------------------------------

  /**
   * Das sugestões que passaram pela decisão da pessoa nesta sessão, quantas ela aprovou (0 a 100).
   * As decisões das vagas de exemplo não contam, porque não foram dela. Sem decisão, `null`.
   */
  private pctSugestoesAceitas(): number | null {
    const aprovadas = Object.values(this.dados.decisoes)
      .filter((decisao) => !(decisao.vagaId in this.mundo.decisoes))
      .reduce((soma, decisao) => soma + decisao.medicoIds.length, 0);
    const total = aprovadas + this.dados.pulos.length;
    return total === 0 ? null : (aprovadas / total) * 100;
  }

  private puladosDe(vagaId: string): string[] {
    return this.dados.pulos.filter((p) => p.vagaId === vagaId).map((p) => p.medicoId);
  }

  /** Quem publica a partir de um rascunho o conclui. Fora disso, não faz nada. */
  private concluirRascunho(rascunhoId: string | undefined): void {
    const rascunho = this.dados.vagas.find((v) => v.id === rascunhoId && v.status === "rascunho");
    if (rascunho && !this.dados.rascunhosConcluidos.includes(rascunho.id)) {
      this.dados.rascunhosConcluidos.push(rascunho.id);
    }
  }

  private async esperar(): Promise<void> {
    if (this.latenciaMs > 0) {
      await new Promise<void>((resolver) => setTimeout(resolver, this.latenciaMs));
    }
  }

  /**
   * Roda uma operação que muda o estado: depois do atraso, uma de cada vez, em ordem. A geração
   * é lida antes de esperar: uma demonstração reiniciada durante o atraso descarta a operação.
   */
  private async operacao<T>(passo: (geracao: number) => Promise<T>): Promise<T> {
    const geracao = this.geracao;
    await this.esperar();
    const execucao = this.fila.then(() => passo(geracao));
    this.fila = execucao.catch(() => undefined);
    return execucao;
  }

  /** Grava de uma vez, a menos que a demonstração tenha sido reiniciada no meio do caminho. */
  private aplicar(geracao: number, mudanca: () => void): void {
    if (geracao !== this.geracao) {
      throw new EstadoInvalidoError("A demonstração foi reiniciada enquanto esta ação era feita.");
    }
    mudanca();
    this.guardar();
  }

  private guardar(): void {
    persistirEstado(this.storage, this.dados);
  }

  /** Cria os registros em cadeia a partir do último da trilha, sem gravar nada ainda. */
  private async encadear(entradas: EntradaDeRegistro[]): Promise<RegistroAuditoria[]> {
    const novos: RegistroAuditoria[] = [];
    let anterior = this.dados.auditoria.at(-1);
    for (const entrada of entradas) {
      anterior = await criarRegistro(anterior, entrada);
      novos.push(anterior);
    }
    return novos;
  }

  private vagaOuErro(vagaId: string): Vaga {
    const vaga = this.dados.vagas.find((v) => v.id === vagaId);
    if (!vaga) throw new NaoEncontradoError("A vaga");
    return vaga;
  }

  /** A vaga como a tela vê: uma cópia, com o alerta "em risco" calculado pelo relógio. */
  private visivel(vaga: Vaga): Vaga {
    return comRisco(copia(vaga), this.relogio.agora());
  }

  private chaveDaVaga(vaga: Vaga): string | null {
    return vaga.especialidade && vaga.inicio
      ? chaveDaGrade(vaga.unidade.id, vaga.especialidade, vaga.inicio)
      : null;
  }

  /** A recomendação da vaga: da semente (vagas de exemplo) ou da grade (vagas criadas aqui). */
  private async recomendacaoDe(vaga: Vaga): Promise<Recomendacao> {
    const semente = this.mundo.recomendacoes[vaga.id];
    if (semente) return copia(semente);
    const chave = this.dados.chavesDaGrade[vaga.id];
    if (!chave) throw new SemRecomendacaoError();
    const daGrade = (await carregarGrade())[chave];
    if (!daGrade) throw new ForaDaGradeError();
    return { ...copia(daGrade), vagaId: vaga.id };
  }

  private coordenadores(): PersonaCoordenador[] {
    return this.mundo.personas.filter(
      (persona): persona is PersonaCoordenador => persona.papel === "coordenador",
    );
  }

  private coordenadorDe(unidadeId: string): PersonaCoordenador {
    const todos = this.coordenadores();
    return (
      todos.find((c) => c.id === this.dados.coordenadorId) ??
      todos.find((c) => c.unidade.id === unidadeId) ??
      (todos[0] as PersonaCoordenador)
    );
  }

  /** Nomes que não podem aparecer em texto livre da trilha: os candidatos e as personas. */
  private nomesConhecidos(recomendacao: Recomendacao): string[] {
    const nomes = new Set<string>();
    for (const candidato of recomendacao.candidatos) nomes.add(candidato.medico.nome);
    for (const exclusao of recomendacao.exemplosExcluidos) nomes.add(exclusao.medico.nome);
    for (const persona of this.mundo.personas) {
      nomes.add(persona.papel === "medico" ? persona.medico.nome : persona.nome);
    }
    return [...nomes];
  }
}

/**
 * Cria o adaptador `demo` de `PlantaoApi`. Cada chamada cria uma demonstração independente;
 * com `storage`, ela continua de onde a sessão parou (chave `plantao-demo-v1`).
 */
export function criarApiDemo(opcoes: OpcoesApiDemo = {}): PlantaoApiDemo {
  return new ApiDemo(opcoes);
}
