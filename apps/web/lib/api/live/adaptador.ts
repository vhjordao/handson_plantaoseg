/**
 * O adaptador `live`: a mesma `PlantaoApi` da demonstração, sobre o sistema real (fase 3 do
 * roteiro). Escreve pela API de matching, que confere o login e o papel em toda chamada, e lê o
 * resto do Supabase sob RLS. A chave de serviço nunca chega aqui.
 *
 * Esta fase cobre a jornada do coordenador. Cascata, ofertas, contestações e auditoria na tela
 * chegam nas fases 4 e 6: até lá, esses métodos dizem que ainda não existem neste modo.
 */
import { CandidatoInvalidoError, EntradaInvalidaError, EstadoInvalidoError } from "../erros";
import { removerDadosPessoais } from "../demo/privacidade";
import { NaoImplementadoError, type PlantaoApi } from "../plantao-api";
import {
  LIMITE_TEXTO_LIVRE,
  LIMITE_TEXTO_VAGA,
  type AprovarInput,
  type Cascata,
  type ConfirmarVagaInput,
  type Contestacao,
  type DataHora,
  type Decisao,
  type DesfazerPuloInput,
  type EstadoDaDecisao,
  type ExemploDeVaga,
  type FeedbackExplicacaoInput,
  type FichaModelo,
  type Indicadores,
  type Leitura,
  type Medico,
  type Oferta,
  type Persona,
  type Politica,
  type PularInput,
  type Recomendacao,
  type RegistroAuditoria,
  type Unidade,
  type Vaga,
  type VerificacaoCadeia,
} from "../types";
import { chamarApi, lerTabela, type OpcoesHttp } from "./http";
import {
  estadoDaApi,
  fichaDaApi,
  leituraDaApi,
  medicoDoBanco,
  politicaDaApi,
  recomendacaoDaApi,
  unidadeDoBanco,
  vagaDoBanco,
  type CandidatoDaApi,
  type DecisaoDaApi,
  type FichaDaApi,
  type LeituraDaApi,
  type MedicoDoBanco,
  type PoliticaDaApi,
  type RecomendacaoDaApi,
  type VagaDoBanco,
} from "./mapeamento";
import { agoraLocal, instanteAntes, localDoBanco } from "./tempo";

/** A lista mostra o que foi publicado nos últimos 30 dias: o histórico simulado fica de fora. */
const JANELA_DA_LISTA_DIAS = 30;
const COLUNAS_DA_VAGA =
  "id,specialty,starts_at,ends_at,urgency,status,published_at,filled_at," +
  "units(id,name,zone),shift_requests(raw_text)";
const COLUNAS_DO_MEDICO = "id,name_sim,crm_sim,specialty,secondary_specialty";

interface ShiftOut {
  id: string;
}

export class AdaptadorLive implements PlantaoApi {
  readonly modo = "live" as const;

  constructor(private readonly opcoes: OpcoesHttp) {}

  agora(): DataHora {
    return agoraLocal();
  }

  async listarPersonas(): Promise<Persona[]> {
    return []; // no sistema real, quem entra é o login, e não uma persona
  }

  // --- Vagas ------------------------------------------------------------------------------------

  async listarVagas(): Promise<Vaga[]> {
    const linhas = await lerTabela<VagaDoBanco>(
      this.opcoes,
      `shifts?select=${COLUNAS_DA_VAGA}&published_at=gte.${encodeURIComponent(
        instanteAntes(JANELA_DA_LISTA_DIAS),
      )}&status=neq.cancelled&order=published_at.desc`,
    );
    return this.comQuemAceitou(linhas);
  }

  async obterVaga(vagaId: string): Promise<Vaga> {
    const [linha] = await lerTabela<VagaDoBanco>(
      this.opcoes,
      `shifts?select=${COLUNAS_DA_VAGA}&id=eq.${encodeURIComponent(vagaId)}`,
    );
    if (!linha) throw new EstadoInvalidoError("Esta vaga não existe ou não é da sua organização.");
    const [vaga] = await this.comQuemAceitou([linha]);
    return vaga as Vaga;
  }

  /** As vagas preenchidas ganham o nome de quem aceitou (a RLS abre o cadastro dos candidatos). */
  private async comQuemAceitou(linhas: VagaDoBanco[]): Promise<Vaga[]> {
    const preenchidas = linhas.filter((linha) => linha.status === "filled").map((l) => l.id);
    const aceites = new Map<string, { medicoId: string; nome: string }>();
    if (preenchidas.length > 0) {
      const ofertas = await lerTabela<{
        shift_id: string;
        doctor_id: string;
        doctors: { name_sim: string } | null;
      }>(
        this.opcoes,
        `offers?select=shift_id,doctor_id,doctors(name_sim)&response=eq.accepted&shift_id=in.(${preenchidas.join(",")})`,
      );
      for (const oferta of ofertas) {
        aceites.set(oferta.shift_id, {
          medicoId: oferta.doctor_id,
          nome: oferta.doctors?.name_sim ?? `Médico ${oferta.doctor_id.slice(0, 8)}`,
        });
      }
    }
    const agora = this.agora();
    return linhas.map((linha) => vagaDoBanco(linha, agora, aceites.get(linha.id) ?? null));
  }

  async listarUnidades(): Promise<Unidade[]> {
    const linhas = await lerTabela<{ id: string; name: string; zone: string }>(
      this.opcoes,
      "units?select=id,name,zone&order=name",
    );
    return linhas.map(unidadeDoBanco);
  }

  async listarExemplosDeVaga(): Promise<ExemploDeVaga[]> {
    const { obterMundo } = await import("@/lib/demo/mundo");
    return obterMundo().exemplosTexto.map(({ id, rotulo, texto }) => ({
      id,
      rotulo,
      texto,
    }));
  }

  async lerVaga(texto: string): Promise<Leitura> {
    if (texto.length > LIMITE_TEXTO_VAGA) {
      throw new EntradaInvalidaError(
        `O texto passou do limite de ${LIMITE_TEXTO_VAGA.toLocaleString("pt-BR")} caracteres. Encurte e tente de novo.`,
      );
    }
    const resposta = await chamarApi<LeituraDaApi>(this.opcoes, "POST", "/shifts/extract", {
      text: texto,
    });
    return leituraDaApi(texto, resposta);
  }

  async confirmarVaga(input: ConfirmarVagaInput): Promise<Vaga> {
    if (!input.urgencia) {
      throw new EntradaInvalidaError("Escolha a urgência antes de publicar a vaga.");
    }
    const vaga = await chamarApi<ShiftOut>(this.opcoes, "POST", "/shifts", {
      text: input.texto,
      unit_id: input.unidadeId,
      specialty: input.especialidade,
      starts_at: input.inicio,
      ends_at: input.fim,
      urgency: input.urgencia,
    });
    return this.obterVaga(vaga.id);
  }

  // --- Sugestões --------------------------------------------------------------------------------

  /**
   * A primeira leitura gera a recomendação na API e guarda a resposta nesta aba. Depois de
   * recarregar, a tela recebe o mesmo resultado, refeito do banco e da trilha.
   */
  async obterSugestoes(vagaId: string): Promise<Recomendacao> {
    const guardada = lerDaAba<Recomendacao>(`ps_sugestoes:${vagaId}`);
    if (guardada) return guardada;
    const vaga = await this.obterVaga(vagaId);
    const especialidade = (vaga.especialidade ?? "clinica_medica") as Medico["especialidade"];
    const existentes = await lerTabela<{ id: string }>(
      this.opcoes,
      `recommendations?select=id&shift_id=eq.${vagaId}&limit=1`,
    );
    let resposta: RecomendacaoDaApi | null = null;
    if (existentes.length === 0) {
      try {
        resposta = await chamarApi<RecomendacaoDaApi>(
          this.opcoes,
          "POST",
          `/shifts/${vagaId}/recommendations`,
        );
      } catch (erro) {
        // Outra aba gerou ao mesmo tempo, ou a vaga não tem elegíveis: lê o que ficou gravado.
        if (!(erro instanceof EstadoInvalidoError)) throw erro;
      }
    }
    resposta ??= await this.recomendacaoDoBanco(vagaId);
    const medicos = await this.medicos(resposta.candidates.map((c) => c.doctor_id));
    const recomendacao = recomendacaoDaApi(resposta, medicos, especialidade);
    gravarNaAba(`ps_sugestoes:${vagaId}`, recomendacao);
    return recomendacao;
  }

  private async recomendacaoDoBanco(vagaId: string): Promise<RecomendacaoDaApi> {
    const [linhas, exclusoes, trilha] = await Promise.all([
      lerTabela<{
        id: string;
        doctor_id: string;
        rank: number;
        score: number;
        features: Record<string, number>;
        contributions: Record<string, number>;
        alerts: string[];
        model_version: string;
        created_at: string;
      }>(
        this.opcoes,
        `recommendations?select=id,doctor_id,rank,score,features,contributions,alerts,model_version,created_at&shift_id=eq.${vagaId}&order=rank`,
      ),
      lerTabela<{
        doctor_id: string;
        rule_code: string;
        rule_text: string;
        evidence: string | null;
      }>(
        this.opcoes,
        `recommendation_exclusions?select=doctor_id,rule_code,rule_text,evidence&shift_id=eq.${vagaId}`,
      ),
      lerTabela<{
        action: string;
        entity_id: string;
        details: Record<string, unknown>;
      }>(
        this.opcoes,
        `audit_log?select=action,entity_id,details&or=(entity_id.eq.${vagaId},entity_id.like.${vagaId}:*)&action=in.(recommendation_generated,explanation_generated)`,
      ),
    ]);
    const explicacoes = linhas.length
      ? await lerTabela<{
          recommendation_id: string;
          text: string;
          factors_cited: string[];
          source: "template" | "llm";
        }>(
          this.opcoes,
          `explanations?select=recommendation_id,text,factors_cited,source&recommendation_id=in.(${linhas
            .map((l) => l.id)
            .join(",")})`,
        )
      : [];
    const gerada = trilha.find((r) => r.action === "recommendation_generated")?.details ?? {};
    const reserva = new Map(
      trilha
        .filter((r) => r.action === "explanation_generated")
        .map((r) => [r.entity_id.split(":")[1], (r.details.fallback_reason as string) ?? null]),
    );
    const porRegra: Record<string, number> = {};
    for (const exclusao of exclusoes) {
      porRegra[exclusao.rule_code] = (porRegra[exclusao.rule_code] ?? 0) + 1;
    }
    const elegiveis = Number(gerada.eligible ?? linhas.length);
    const candidatos: CandidatoDaApi[] = linhas.map((linha) => {
      const explicacao = explicacoes.find((e) => e.recommendation_id === linha.id);
      return {
        rank: linha.rank,
        doctor_id: linha.doctor_id,
        score: linha.score,
        features: linha.features,
        contributions: linha.contributions,
        alerts: linha.alerts,
        explanation: {
          text: explicacao?.text ?? "",
          factors_cited: explicacao?.factors_cited ?? [],
          source: explicacao?.source ?? "template",
        },
        explanation_fallback: reserva.get(linha.doctor_id) ?? null,
      };
    });
    return {
      shift_id: vagaId,
      model_version: linhas[0]?.model_version ?? "",
      generated_at: linhas[0] ? localDoBanco(linhas[0].created_at) : this.agora(),
      pool_size: elegiveis + exclusoes.length,
      eligible_count: elegiveis,
      candidates: candidatos,
      exclusions: exclusoes,
      excluded_by_rule: porRegra,
    };
  }

  private async medicos(ids: string[]): Promise<Map<string, Medico>> {
    if (ids.length === 0) return new Map();
    const linhas = await lerTabela<MedicoDoBanco>(
      this.opcoes,
      `doctors?select=${COLUNAS_DO_MEDICO}&id=in.(${ids.join(",")})`,
    );
    return new Map(linhas.map((linha) => [linha.id, medicoDoBanco(linha)]));
  }

  /** Os nomes dos sugeridos, para tirar dos textos livres antes de mandar (a API não lê nomes). */
  private nomesConhecidos(vagaId: string): string[] {
    const recomendacao = lerDaAba<Recomendacao>(`ps_sugestoes:${vagaId}`);
    return recomendacao?.candidatos.map((c) => c.medico.nome) ?? [];
  }

  private textoLivre(vagaId: string, texto: string | undefined): string | undefined {
    const limpo = texto?.trim();
    if (!limpo) return undefined;
    return removerDadosPessoais(limpo.slice(0, LIMITE_TEXTO_LIVRE), this.nomesConhecidos(vagaId));
  }

  // --- Decisão ----------------------------------------------------------------------------------

  async aprovar(input: AprovarInput): Promise<Decisao> {
    if (input.medicoIds.length === 0) throw new CandidatoInvalidoError();
    await chamarApi(this.opcoes, "POST", `/shifts/${input.vagaId}/approve`, {
      doctor_ids: input.medicoIds,
      justification: this.textoLivre(input.vagaId, input.justificativa),
    });
    const { decisao } = await this.obterEstadoDaDecisao(input.vagaId);
    if (!decisao) throw new EstadoInvalidoError("A decisão foi enviada, mas ainda não apareceu.");
    return decisao;
  }

  async obterEstadoDaDecisao(vagaId: string): Promise<EstadoDaDecisao> {
    return estadoDaApi(
      await chamarApi<DecisaoDaApi>(this.opcoes, "GET", `/shifts/${vagaId}/decision`),
    );
  }

  async pular(input: PularInput): Promise<void> {
    await chamarApi(this.opcoes, "POST", `/shifts/${input.vagaId}/skip`, {
      doctor_id: input.medicoId,
      reason: this.textoLivre(input.vagaId, input.motivo),
    });
  }

  async desfazerPulo(input: DesfazerPuloInput): Promise<void> {
    await chamarApi(this.opcoes, "POST", `/shifts/${input.vagaId}/unskip`, {
      doctor_id: input.medicoId,
    });
  }

  async enviarFeedbackExplicacao(input: FeedbackExplicacaoInput): Promise<void> {
    await chamarApi(this.opcoes, "POST", `/shifts/${input.vagaId}/feedback`, {
      doctor_id: input.medicoId,
      helpful: input.ajudou,
      comment: this.textoLivre(input.vagaId, input.comentario),
    });
  }

  async obterFichaModelo(): Promise<FichaModelo> {
    return fichaDaApi(await chamarApi<FichaDaApi>(this.opcoes, "GET", "/model-card"));
  }

  async obterPolitica(): Promise<Politica> {
    return politicaDaApi(await chamarApi<PoliticaDaApi>(this.opcoes, "GET", "/policy"));
  }

  // --- Indicadores ------------------------------------------------------------------------------

  /** Os números da simulação, com as contagens do que se fez no sistema real. */
  async obterIndicadores(): Promise<Indicadores> {
    const [{ obterMundo }, vagas] = await Promise.all([
      import("@/lib/demo/mundo"),
      this.listarVagas(),
    ]);
    const base = obterMundo().indicadoresBase;
    return {
      rotulo: "simulado",
      tempoMedioAtePreencherMin: base.tempoMedioFluxoMin,
      pctPreenchidasComAntecedencia24h: base.pctPreenchidasComAntecedencia24h,
      pctSugestoesAceitas: base.pctSugestoesAceitas,
      linhaDeBase: {
        tempoMedioAtePreencherMin: base.tempoMedioManualMin,
        pctPreenchidasComAntecedencia24h: base.pctPreenchidasComAntecedencia24hManual,
      },
      vagasPublicadas: vagas.length,
      decisoesHumanas: vagas.filter((v) => v.status !== "aguardando_decisao").length,
      aceites: vagas.filter((v) => v.status === "preenchida").length,
      fonte: base.fonte,
    };
  }

  // --- Fases 4 e 6 ------------------------------------------------------------------------------

  obterCascata(): Promise<Cascata> {
    return Promise.reject(new NaoImplementadoError("obterCascata", this.modo));
  }
  listarOfertas(): Promise<Oferta[]> {
    return Promise.reject(new NaoImplementadoError("listarOfertas", this.modo));
  }
  obterOferta(): Promise<Oferta> {
    return Promise.reject(new NaoImplementadoError("obterOferta", this.modo));
  }
  responderOferta(): Promise<Oferta> {
    return Promise.reject(new NaoImplementadoError("responderOferta", this.modo));
  }
  desfazerResposta(): Promise<Oferta> {
    return Promise.reject(new NaoImplementadoError("desfazerResposta", this.modo));
  }
  contestar(): Promise<Contestacao> {
    return Promise.reject(new NaoImplementadoError("contestar", this.modo));
  }
  listarContestacoes(): Promise<Contestacao[]> {
    return Promise.reject(new NaoImplementadoError("listarContestacoes", this.modo));
  }
  responderContestacao(): Promise<Contestacao> {
    return Promise.reject(new NaoImplementadoError("responderContestacao", this.modo));
  }
  listarAuditoria(): Promise<RegistroAuditoria[]> {
    return Promise.reject(new NaoImplementadoError("listarAuditoria", this.modo));
  }
  verificarCadeia(): Promise<VerificacaoCadeia> {
    return Promise.reject(new NaoImplementadoError("verificarCadeia", this.modo));
  }

  /** A atualização a cada 3 segundos (D7) chega com a cascata na tela, na fase 4. */
  assinar(): () => void {
    return () => {};
  }
}

function lerDaAba<T>(chave: string): T | null {
  try {
    const valor = window.sessionStorage.getItem(chave);
    return valor ? (JSON.parse(valor) as T) : null;
  } catch {
    return null;
  }
}

function gravarNaAba(chave: string, valor: unknown): void {
  try {
    window.sessionStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    // aba sem armazenamento: a próxima leitura refaz do banco
  }
}

export function criarApiLive(opcoes: OpcoesHttp): PlantaoApi {
  return new AdaptadorLive(opcoes);
}
