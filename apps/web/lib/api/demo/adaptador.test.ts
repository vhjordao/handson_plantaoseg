// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { carregarGrade, chaveDaGrade, obterMundo } from "../../demo/mundo";
import {
  CandidatoInvalidoError,
  EstadoInvalidoError,
  ForaDaGradeError,
  JustificativaObrigatoriaError,
  MENSAGEM_FORA_DA_GRADE,
  NaoEncontradoError,
  SemRecomendacaoError,
} from "../erros";
import { NaoImplementadoError } from "../plantao-api";
import { LIMITE_TEXTO_LIVRE, LIMITE_TEXTO_VAGA } from "../types";
import type { ConfirmarVagaInput, EventoPlantao, RegistroAuditoria } from "../types";
import { criarApiDemo } from "./index";
import { somarMinutos } from "./datas";
import { CHAVE_DE_ARMAZENAMENTO } from "./estado";
import { sha256Hex } from "./sha256";

const mundo = obterMundo();
const unidade = (zona: string) => mundo.unidades.find((u) => u.zona === zona)!;

class ArmazenamentoFalso implements Storage {
  private readonly itens = new Map<string, string>();
  get length(): number {
    return this.itens.size;
  }
  clear(): void {
    this.itens.clear();
  }
  getItem(chave: string): string | null {
    return this.itens.get(chave) ?? null;
  }
  key(indice: number): string | null {
    return [...this.itens.keys()][indice] ?? null;
  }
  removeItem(chave: string): void {
    this.itens.delete(chave);
  }
  setItem(chave: string, valor: string): void {
    this.itens.set(chave, valor);
  }
}

/** Publica o que a tela publicaria depois de ler o texto e o coordenador conferir. */
function entradaDe(
  zona: string,
  especialidade: "pediatria" | "clinica_medica",
  inicio: string,
  extra: Partial<ConfirmarVagaInput> = {},
): ConfirmarVagaInput {
  return {
    texto: `Pedido de teste para ${especialidade} em ${zona}`,
    unidadeId: unidade(zona).id,
    especialidade,
    inicio,
    fim: somarMinutos(inicio, 12 * 60),
    urgencia: "medium",
    editados: [],
    ...extra,
  };
}

const NOITE_DE_SEXTA = "2026-10-02T19:00:00";

/** O primeiro sugerido sem alerta de jornada: aprovável sem justificativa. */
async function primeiroSemAlerta(api: ReturnType<typeof criarApiDemo>, vagaId: string): Promise<string> {
  const candidato = (await api.obterSugestoes(vagaId)).candidatos.find((c) => c.alertas.length === 0);
  if (!candidato) throw new Error(`todos os sugeridos de ${vagaId} têm alerta`);
  return candidato.medico.id;
}

async function coordenadoresDe(api: ReturnType<typeof criarApiDemo>) {
  const personas = await api.listarPersonas("coordenador");
  return personas.flatMap((p) => (p.papel === "coordenador" ? [p] : []));
}

describe("relógio, personas e leitura", () => {
  it("é o modo demo, com o relógio fixo na âncora e que só anda quando mandam", () => {
    const api = criarApiDemo();
    expect(api.modo).toBe("demo");
    expect(api.agora()).toBe("2026-10-01T09:00:00");
    expect(api.agora()).toBe("2026-10-01T09:00:00"); // não anda sozinho
    expect(api.avancarRelogio(90)).toBe("2026-10-01T10:30:00");
    expect(api.agora()).toBe("2026-10-01T10:30:00");
    expect(() => api.avancarRelogio(-5)).toThrow(RangeError);
  });

  it("lista as personas por papel, em cópias", async () => {
    const api = criarApiDemo();
    const coordenadores = await api.listarPersonas("coordenador");
    const medicos = await api.listarPersonas("medico");
    expect(coordenadores).toHaveLength(2);
    expect(medicos).toHaveLength(12);
    coordenadores[0]!.id = "alterado";
    medicos.length = 0;
    expect((await api.listarPersonas("coordenador"))[0]!.id).not.toBe("alterado");
    expect(await api.listarPersonas("medico")).toHaveLength(12);
  });

  it("lê a vaga contra o 'hoje' do relógio, e o relógio muda a leitura", async () => {
    const api = criarApiDemo();
    const texto = "pediatra sexta 19h às 7h Hospital Modelo Centro";
    const quinta = await api.lerVaga(texto);
    expect(quinta.campos.find((c) => c.chave === "inicio")?.valor).toBe(NOITE_DE_SEXTA);
    api.avancarRelogio(24 * 60); // sexta, 02/10
    const sexta = await api.lerVaga(texto);
    expect(sexta.campos.find((c) => c.chave === "inicio")?.valor).toBe("2026-10-09T19:00:00");
  });

  it("lê o texto adversarial por regras e devolve os sinais", async () => {
    const api = criarApiDemo();
    const exemplo = mundo.exemplosTexto.find((e) => e.estilo === "adversarial")!;
    const leitura = await api.lerVaga(exemplo.texto);
    expect(leitura).toMatchObject({ fonte: "regras", sinais: ["ignorar_instrucoes"], erroIA: null });
  });
});

describe("vagas de exemplo", () => {
  it("lista as seis, a mais recente primeiro, e só o vaga-demo-6 está em risco", async () => {
    const api = criarApiDemo();
    const vagas = await api.listarVagas();
    expect(vagas.map((v) => v.id)).toEqual([
      "vaga-demo-5",
      "vaga-demo-2",
      "vaga-demo-1",
      "vaga-demo-3",
      "vaga-demo-6",
      "vaga-demo-4",
    ]);
    expect(vagas.filter((v) => v.emRisco).map((v) => v.id)).toEqual(["vaga-demo-6"]);
    const seis = vagas.find((v) => v.id === "vaga-demo-6")!;
    expect(seis.motivoRisco).toBe("Começa em 10 h e nenhuma oferta foi aceita");
  });

  it("recalcula o alerta 'em risco' pelo relógio", async () => {
    const api = criarApiDemo();
    api.avancarRelogio(2 * 60);
    expect((await api.obterVaga("vaga-demo-6")).motivoRisco).toBe(
      "Começa em 8 h e nenhuma oferta foi aceita",
    );
    api.avancarRelogio(24 * 60 - 2 * 60 + 60); // passa das 19h da vaga 6 e entra nas 24 h da vaga 1
    expect((await api.obterVaga("vaga-demo-6")).emRisco).toBe(false);
    expect((await api.obterVaga("vaga-demo-1")).emRisco).toBe(true);
  });

  it("devolve cópias: mexer na resposta não mexe no estado", async () => {
    const api = criarApiDemo();
    const vaga = await api.obterVaga("vaga-demo-1");
    vaga.status = "preenchida";
    vaga.unidade.nome = "Outro";
    expect((await api.obterVaga("vaga-demo-1")).status).toBe("aguardando_decisao");
    const sugestoes = await api.obterSugestoes("vaga-demo-1");
    sugestoes.candidatos.length = 0;
    expect((await api.obterSugestoes("vaga-demo-1")).candidatos).toHaveLength(5);
  });

  it("devolve as sugestões da semente com o vagaId, na mesma ordem, e erra para o que não existe", async () => {
    const api = criarApiDemo();
    const sugestoes = await api.obterSugestoes("vaga-demo-1");
    expect(sugestoes.vagaId).toBe("vaga-demo-1");
    expect(sugestoes.candidatos.map((c) => c.posicao)).toEqual([1, 2, 3, 4, 5]);
    expect(sugestoes.candidatos[3]?.alertas[0]).toMatch(/^carga recente alta/);
    await expect(api.obterSugestoes("vaga-demo-5")).rejects.toBeInstanceOf(SemRecomendacaoError);
    await expect(api.obterVaga("nao-existe")).rejects.toBeInstanceOf(NaoEncontradoError);
    await expect(api.obterSugestoes("nao-existe")).rejects.toBeInstanceOf(NaoEncontradoError);
  });

  it("entrega a ficha do modelo e a política", async () => {
    const api = criarApiDemo();
    expect((await api.obterFichaModelo()).versao).toBe("logreg-v1");
    expect((await api.obterPolitica()).topK).toBe(5);
  });
});

describe("fluxo completo: ler, confirmar, sugerir e decidir", () => {
  it("publica uma vaga nova a partir da leitura, com a trilha dos quatro passos", async () => {
    const api = criarApiDemo();
    const exemplo = mundo.exemplosTexto.find((e) => e.estilo === "formal")!;
    const leitura = await api.lerVaga(exemplo.texto);
    expect(leitura.faltando).toEqual([]);
    const valor = (chave: string) => leitura.campos.find((c) => c.chave === chave)!.valor!;
    const antes = (await api.listarAuditoria()).length;
    const vaga = await api.confirmarVaga({
      texto: exemplo.texto,
      unidadeId: valor("unidade"),
      especialidade: valor("especialidade") as "pediatria",
      inicio: valor("inicio"),
      fim: valor("fim"),
      urgencia: valor("urgencia") as "low",
      editados: ["urgencia"],
    });

    const chave = chaveDaGrade(vaga.unidade.id, vaga.especialidade!, vaga.inicio!);
    expect(vaga.id).toBe(`vaga-${(await sha256Hex(chave)).slice(0, 12)}`);
    expect(vaga).toMatchObject({
      status: "aguardando_decisao",
      criadaEm: "2026-10-01T09:00:00",
      textoOriginal: exemplo.texto,
      preenchidaPor: null,
      tempoAtePreencherMin: null,
    });

    const trilha = await api.listarAuditoria({ vagaId: vaga.id });
    expect(trilha.map((r) => r.acao)).toEqual([
      "shift_published",
      "extraction_confirmed",
      "recommendation_generated",
      ...Array(5).fill("explanation_generated"),
    ]);
    expect(trilha[1]?.detalhes).toEqual({ missing_optional: [], editados: ["urgencia"] });
    expect(trilha[0]?.detalhes).toEqual({ extraction_source: "regras", flags: [] });
    expect(trilha[2]).toMatchObject({ papelAtor: "system", modeloVersao: "logreg-v1" });
    expect(trilha[2]?.detalhes).toMatchObject({ eligible: expect.any(Number), excluded: expect.any(Number) });
    expect((await api.listarAuditoria()).length).toBe(antes + 8);
    expect(await api.verificarCadeia()).toEqual({
      integra: true,
      registros: antes + 8,
      primeiroInvalido: null,
    });

    const sugestoes = await api.obterSugestoes(vaga.id);
    expect(sugestoes).toMatchObject({ vagaId: vaga.id, geradaEm: "2026-10-01T09:00:00" });
    expect(sugestoes.candidatos).toHaveLength(5);
    expect((await api.listarVagas()).map((v) => v.id)).toContain(vaga.id);
  });

  it("registra a decisão: sem justificativa quando ninguém tem alerta", async () => {
    const api = criarApiDemo();
    const eventos: EventoPlantao[] = [];
    api.assinar((e) => eventos.push(e));
    const sugestoes = await api.obterSugestoes("vaga-demo-1");
    const tres = sugestoes.candidatos.slice(0, 3).map((c) => c.medico.id);
    const decisao = await api.aprovar({ vagaId: "vaga-demo-1", medicoIds: tres });
    expect(decisao).toMatchObject({
      id: "decisao-vaga-demo-1",
      vagaId: "vaga-demo-1",
      medicoIds: tres,
      em: "2026-10-01T09:00:00",
      excecao: null,
    });
    expect(decisao.decididoPor).toEqual({
      pseudoId: expect.stringMatching(/^coord-[0-9a-f]{8}$/),
      nome: "Marina Alves", // o coordenador da unidade da vaga 1 (Centro)
      cargo: "Coordenação de escala",
    });
    expect((await api.obterVaga("vaga-demo-1")).status).toBe("oferta_em_andamento");

    const ultimo = (await api.listarAuditoria()).at(-1)!;
    expect(ultimo).toMatchObject({
      acao: "recommendation_approved",
      papelAtor: "coordinator",
      atorPseudoId: decisao.decididoPor.pseudoId,
      entidadeId: "vaga-demo-1",
      modeloVersao: "logreg-v1",
      detalhes: { approved_doctor_ids: tres, mode: "humano" },
    });
    expect(ultimo.detalhes).not.toHaveProperty("excecao");
    expect(eventos).toEqual([{ tipo: "decisao_registrada", vagaId: "vaga-demo-1", medicoIds: tres, em: "2026-10-01T09:00:00" }]);
    expect((await api.verificarCadeia()).integra).toBe(true);
  });

  it("exige justificativa de pelo menos 10 caracteres para aprovar quem tem alerta de jornada", async () => {
    const api = criarApiDemo();
    const sugestoes = await api.obterSugestoes("vaga-demo-1");
    const comAlerta = sugestoes.candidatos[3]!; // o 4º: carga recente alta
    const ids = [sugestoes.candidatos[0]!.medico.id, comAlerta.medico.id];
    const total = (await api.listarAuditoria()).length;

    await expect(api.aprovar({ vagaId: "vaga-demo-1", medicoIds: ids })).rejects.toBeInstanceOf(
      JustificativaObrigatoriaError,
    );
    await expect(
      api.aprovar({ vagaId: "vaga-demo-1", medicoIds: ids, justificativa: "curta" }),
    ).rejects.toBeInstanceOf(JustificativaObrigatoriaError);
    await expect(
      api.aprovar({ vagaId: "vaga-demo-1", medicoIds: ids, justificativa: "   nove car   " }),
    ).rejects.toBeInstanceOf(JustificativaObrigatoriaError); // 8 caracteres depois de aparar
    // Nada foi gravado nas tentativas que falharam, e a vaga continua aguardando.
    expect((await api.listarAuditoria()).length).toBe(total);
    expect((await api.obterVaga("vaga-demo-1")).status).toBe("aguardando_decisao");

    const justificativa = "Cobertura de última hora; já combinei a folga da semana seguinte.";
    const decisao = await api.aprovar({ vagaId: "vaga-demo-1", medicoIds: ids, justificativa });
    expect(decisao.excecao).toEqual({ alertas: comAlerta.alertas, justificativa });
    const registro = (await api.listarAuditoria()).at(-1)!;
    expect(registro.detalhes).toEqual({
      approved_doctor_ids: ids,
      mode: "humano",
      excecao: { alertas: comAlerta.alertas, justificativa },
    });
    expect((await api.verificarCadeia()).integra).toBe(true);
  });

  it("só aprova candidatos recomendados e uma vez", async () => {
    const api = criarApiDemo();
    const sugestoes = await api.obterSugestoes("vaga-demo-2");
    const primeiro = sugestoes.candidatos[0]!.medico.id;
    for (const medicoIds of [[], ["nao-recomendado"], [primeiro, "nao-recomendado"]]) {
      await expect(api.aprovar({ vagaId: "vaga-demo-2", medicoIds })).rejects.toBeInstanceOf(
        CandidatoInvalidoError,
      );
    }
    await expect(api.aprovar({ vagaId: "nao-existe", medicoIds: [primeiro] })).rejects.toBeInstanceOf(
      NaoEncontradoError,
    );
    const decisao = await api.aprovar({ vagaId: "vaga-demo-2", medicoIds: [primeiro, primeiro] });
    expect(decisao.medicoIds).toEqual([primeiro]); // repetido não vale duas vezes
    // Quem já tem oferta em andamento, está preenchida ou é rascunho não aguarda decisão.
    for (const vagaId of ["vaga-demo-3", "vaga-demo-4", "vaga-demo-5"]) {
      await expect(api.aprovar({ vagaId, medicoIds: [primeiro] })).rejects.toBeInstanceOf(EstadoInvalidoError);
    }
  });

  it("repetir a mesma aprovação devolve a decisão já tomada e não duplica a trilha", async () => {
    const api = criarApiDemo();
    const eventos: EventoPlantao[] = [];
    api.assinar((e) => eventos.push(e));
    const ids = (await api.obterSugestoes("vaga-demo-2")).candidatos.slice(0, 2).map((c) => c.medico.id);
    const primeira = await api.aprovar({ vagaId: "vaga-demo-2", medicoIds: ids });
    const total = (await api.listarAuditoria()).length;

    // Duplo clique ou nova tentativa: a mesma decisão, sem outro registro e sem outro evento.
    expect(await api.aprovar({ vagaId: "vaga-demo-2", medicoIds: ids })).toEqual(primeira);
    expect((await api.listarAuditoria()).length).toBe(total);
    expect(eventos).toHaveLength(1);

    // Outra escolha (outra lista ou outra ordem) é outra decisão, e essa já foi tomada.
    const outras = [[ids[0]!], [...ids].reverse()];
    for (const medicoIds of outras) {
      await expect(api.aprovar({ vagaId: "vaga-demo-2", medicoIds })).rejects.toBeInstanceOf(
        EstadoInvalidoError,
      );
    }
    expect((await api.listarAuditoria()).length).toBe(total);
  });

  it("recusa texto acima do limite, sem gravar nada", async () => {
    const api = criarApiDemo();
    const total = (await api.listarAuditoria()).length;
    const longoDemais = "x".repeat(LIMITE_TEXTO_VAGA + 1);
    await expect(api.lerVaga(longoDemais)).rejects.toThrow();
    await expect(
      api.confirmarVaga(entradaDe("centro", "pediatria", NOITE_DE_SEXTA, { texto: longoDemais })),
    ).rejects.toThrow();
    const primeiro = (await api.obterSugestoes("vaga-demo-2")).candidatos[0]!.medico.id;
    await expect(
      api.pular({ vagaId: "vaga-demo-2", medicoId: primeiro, motivo: "x".repeat(LIMITE_TEXTO_LIVRE + 1) }),
    ).rejects.toThrow();
    expect((await api.listarAuditoria()).length).toBe(total);
    expect(await api.listarVagas()).toHaveLength(6);
  });

  it("pular grava recommendation_rejected, uma vez por nome, e não aprova nada", async () => {
    const api = criarApiDemo();
    const alvo = (await api.obterSugestoes("vaga-demo-2")).candidatos[1]!;
    const total = (await api.listarAuditoria()).length;
    await api.pular({ vagaId: "vaga-demo-2", medicoId: alvo.medico.id, motivo: "Prefiro outro nome" });
    await api.pular({ vagaId: "vaga-demo-2", medicoId: alvo.medico.id }); // de novo: sem duplicar
    const trilha = await api.listarAuditoria({ vagaId: "vaga-demo-2" });
    expect(trilha.at(-1)).toMatchObject({
      acao: "recommendation_rejected",
      papelAtor: "coordinator",
      entidadeTipo: "recommendation",
      entidadeId: `vaga-demo-2:${alvo.medico.id}`,
      modeloVersao: "logreg-v1",
      detalhes: { rank: 2, reason: "Prefiro outro nome" },
    });
    expect((await api.listarAuditoria()).length).toBe(total + 1);
    expect((await api.obterVaga("vaga-demo-2")).status).toBe("aguardando_decisao");
    await expect(api.pular({ vagaId: "vaga-demo-2", medicoId: "estranho" })).rejects.toBeInstanceOf(
      CandidatoInvalidoError,
    );
    expect((await api.verificarCadeia()).integra).toBe(true);
  });

  it("o feedback da explicação só fica registrado: não entra na trilha e não muda o modelo", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const api = criarApiDemo({ storage: armazenamento });
    const total = (await api.listarAuditoria()).length;
    const alvo = (await api.obterSugestoes("vaga-demo-1")).candidatos[0]!.medico.id;
    await api.enviarFeedbackExplicacao({ vagaId: "vaga-demo-1", medicoId: alvo, ajudou: true });
    await api.enviarFeedbackExplicacao({ vagaId: "vaga-demo-1", medicoId: alvo, ajudou: false, comentario: "confuso" });
    expect((await api.listarAuditoria()).length).toBe(total);
    const guardado = JSON.parse(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)!);
    expect(guardado.feedbacks).toEqual([
      { vagaId: "vaga-demo-1", medicoId: alvo, ajudou: true, em: "2026-10-01T09:00:00" },
      { vagaId: "vaga-demo-1", medicoId: alvo, ajudou: false, comentario: "confuso", em: "2026-10-01T09:00:00" },
    ]);
    await expect(
      api.enviarFeedbackExplicacao({ vagaId: "nao-existe", medicoId: alvo, ajudou: true }),
    ).rejects.toBeInstanceOf(NaoEncontradoError);
    await expect(
      api.enviarFeedbackExplicacao({ vagaId: "vaga-demo-1", medicoId: "estranho", ajudou: true }),
    ).rejects.toBeInstanceOf(CandidatoInvalidoError);
  });

  it("o comentário do feedback passa pela mesma limpeza de dados pessoais", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const api = criarApiDemo({ storage: armazenamento });
    const alvo = (await api.obterSugestoes("vaga-demo-1")).candidatos[0]!;
    await api.enviarFeedbackExplicacao({
      vagaId: "vaga-demo-1",
      medicoId: alvo.medico.id,
      ajudou: false,
      comentario: `  ${alvo.medico.nome} me ligou: (11) 99999-8888, ana@exemplo.com  `,
    });
    const [feedback] = JSON.parse(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)!).feedbacks;
    expect(feedback.comentario).toBe(
      "[nome removido] me ligou: [telefone removido], [e-mail removido]",
    );
  });
});

describe("a grade: onde há e onde não há sugestões", () => {
  it("recusa o que está fora da grade, com a mensagem pedida", async () => {
    const api = criarApiDemo();
    const casos: ConfirmarVagaInput[] = [
      entradaDe("centro", "pediatria", "2026-11-10T19:00:00"), // depois dos 8 dias
      entradaDe("centro", "pediatria", "2026-10-01T07:00:00"), // já passou
      entradaDe("centro", "pediatria", "2026-10-02T20:00:00"), // não começa às 7h nem às 19h
      { ...entradaDe("centro", "pediatria", NOITE_DE_SEXTA), fim: "2026-10-03T01:00:00" }, // 6 h
      { ...entradaDe("centro", "pediatria", NOITE_DE_SEXTA), unidadeId: "nao-existe" },
    ];
    const total = (await api.listarAuditoria()).length;
    for (const caso of casos) {
      const erro = await api.confirmarVaga(caso).catch((e: unknown) => e);
      expect(erro).toBeInstanceOf(ForaDaGradeError);
      expect((erro as Error).message).toBe(
        "Na demonstração, as sugestões existem para plantões de 12 h (das 7h às 19h ou das 19h às 7h) nos próximos 8 dias.",
      );
      expect((erro as Error).message).toBe(MENSAGEM_FORA_DA_GRADE);
    }
    expect((await api.listarAuditoria()).length).toBe(total);
    expect(await api.listarVagas()).toHaveLength(6);
  });

  it("valida o formato da entrada", async () => {
    const api = criarApiDemo();
    await expect(
      api.confirmarVaga({ ...entradaDe("sul", "pediatria", NOITE_DE_SEXTA), urgencia: "urgentissima" as never }),
    ).rejects.toThrow();
    await expect(api.confirmarVaga({ texto: "x" } as never)).rejects.toThrow();
  });

  it("aceita a janela com início sem segundos e a primeira e a última da grade", async () => {
    const api = criarApiDemo();
    const sexta = await api.confirmarVaga(entradaDe("sul", "clinica_medica", "2026-10-02T19:00"));
    expect(sexta.inicio).toBe("2026-10-02T19:00:00");
    const primeira = await api.confirmarVaga(entradaDe("sul", "clinica_medica", "2026-10-01T19:00:00"));
    const ultima = await api.confirmarVaga(entradaDe("sul", "clinica_medica", "2026-10-08T19:00:00"));
    expect(primeira.emRisco).toBe(true); // começa em 10 h
    expect(ultima.emRisco).toBe(false);
  });

  it("vaga sem nenhum elegível (diurno em dia útil) fica sem cobertura e não pode ser decidida", async () => {
    const api = criarApiDemo();
    const vaga = await api.confirmarVaga(entradaDe("centro", "pediatria", "2026-10-05T07:00:00"));
    expect(vaga.status).toBe("sem_cobertura");
    const sugestoes = await api.obterSugestoes(vaga.id);
    expect(sugestoes.totalElegiveis).toBe(0);
    expect(sugestoes.candidatos).toEqual([]);
    await expect(api.aprovar({ vagaId: vaga.id, medicoIds: ["x"] })).rejects.toBeInstanceOf(EstadoInvalidoError);
  });

  it("publicar a mesma janela de novo devolve a mesma vaga, inclusive a de exemplo", async () => {
    const api = criarApiDemo();
    const entrada = entradaDe("sul", "pediatria", "2026-10-03T07:00:00");
    const primeira = await api.confirmarVaga(entrada);
    const total = (await api.listarAuditoria()).length;
    const segunda = await api.confirmarVaga({ ...entrada, urgencia: "high" });
    expect(segunda.id).toBe(primeira.id);
    expect((await api.listarAuditoria()).length).toBe(total);
    expect(await api.listarVagas()).toHaveLength(7);
    const daSemente = await api.confirmarVaga(
      entradaDe("centro", "pediatria", NOITE_DE_SEXTA, { urgencia: "high" }),
    );
    expect(daSemente.id).toBe("vaga-demo-1");
  });

  it("duas publicações ao mesmo tempo mantêm a cadeia de hash íntegra", async () => {
    const api = criarApiDemo();
    const antes = (await api.listarAuditoria()).length;
    const [a, b, c] = await Promise.all([
      api.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00")),
      api.confirmarVaga(entradaDe("norte", "clinica_medica", "2026-10-06T19:00:00")),
      api.aprovar({ vagaId: "vaga-demo-2", medicoIds: [await primeiroSemAlerta(api, "vaga-demo-2")] }),
    ]);
    expect(new Set([a.id, b.id]).size).toBe(2);
    expect(c.vagaId).toBe("vaga-demo-2");
    const trilha = await api.listarAuditoria();
    expect(trilha.length).toBe(antes + 8 + 8 + 1);
    expect(await api.verificarCadeia()).toMatchObject({ integra: true, registros: trilha.length });
  });
});

describe("trilha e privacidade", () => {
  it("nunca recebe nome, CRM ou telefone, nem quando a pessoa os digita no texto livre", async () => {
    const api = criarApiDemo();
    const sugestoes = await api.obterSugestoes("vaga-demo-1");
    const quarto = sugestoes.candidatos[3]!;
    await api.pular({
      vagaId: "vaga-demo-1",
      medicoId: sugestoes.candidatos[4]!.medico.id,
      motivo: `Conheço ${sugestoes.candidatos[4]!.medico.nome}, tel +55 00 96822-5309`,
    });
    await api.aprovar({
      vagaId: "vaga-demo-1",
      medicoIds: [quarto.medico.id],
      justificativa: `Aprovo ${quarto.medico.nome} (${quarto.medico.crm}) só desta vez, de última hora.`,
    });
    await api.confirmarVaga(entradaDe("norte", "pediatria", "2026-10-06T19:00:00"));

    const trilha = await api.listarAuditoria();
    const texto = JSON.stringify(trilha);
    const pessoas = mundo.personas.flatMap((p) =>
      p.papel === "medico" ? [p.medico.nome, p.medico.crm] : [p.nome],
    );
    const candidatos = Object.values(mundo.recomendacoes).flatMap((r) =>
      r.candidatos.flatMap((c) => [c.medico.nome, c.medico.crm]),
    );
    for (const dado of [...pessoas, ...candidatos, sugestoes.candidatos[4]!.medico.nome]) {
      expect(texto, dado).not.toContain(dado);
    }
    expect(texto).not.toMatch(/96822|SIM-SP-\d{6}|"(name|crm|phone|email|cpf)(_sim)?"/i);
    for (const registro of trilha) {
      expect(registro.atorPseudoId).toMatch(/^(coord-[0-9a-f]{8}|matching-api)$/);
    }
    // A decisão devolve o mesmo texto limpo que foi para a trilha.
    const aprovacao = trilha.find((r) => r.acao === "recommendation_approved" && r.seq > 43)!;
    expect(JSON.stringify(aprovacao.detalhes)).toContain("[nome removido]");
  });

  it("usa o coordenador da unidade da vaga, ou o que a interface definir", async () => {
    const api = criarApiDemo();
    const primeiro = (await api.obterSugestoes("vaga-demo-2")).candidatos[0]!.medico.id;
    const [marina, rodrigo] = await coordenadoresDe(api);
    const daUnidade = await api.aprovar({ vagaId: "vaga-demo-2", medicoIds: [primeiro] });
    expect(daUnidade.decididoPor.nome).toBe("Rodrigo Lacerda"); // vaga 2 é do Hospital Norte
    expect(() => api.definirCoordenador("coord-inexistente")).toThrow(NaoEncontradoError);
    api.definirCoordenador(marina!.id);
    const outro = (await api.obterSugestoes("vaga-demo-1")).candidatos[0]!.medico.id;
    const decisao = await api.aprovar({ vagaId: "vaga-demo-1", medicoIds: [outro] });
    expect(decisao.decididoPor.nome).toBe(marina!.nome);
    expect(marina!.nome).toBe("Marina Alves");
    expect(rodrigo!.nome).toBe("Rodrigo Lacerda");
  });
});

describe("sessão guardada", () => {
  it("restaura vagas, decisões, trilha e relógio numa nova sessão com o mesmo storage", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const primeira = criarApiDemo({ storage: armazenamento });
    primeira.avancarRelogio(30);
    const vaga = await primeira.confirmarVaga(entradaDe("sul", "clinica_medica", "2026-10-05T19:00:00"));
    await primeira.aprovar({ vagaId: vaga.id, medicoIds: [await primeiroSemAlerta(primeira, vaga.id)] });

    const segunda = criarApiDemo({ storage: armazenamento });
    expect(segunda.agora()).toBe("2026-10-01T09:30:00");
    expect(await segunda.obterVaga(vaga.id)).toMatchObject({ status: "oferta_em_andamento", criadaEm: "2026-10-01T09:30:00" });
    expect((await segunda.obterSugestoes(vaga.id)).vagaId).toBe(vaga.id);
    expect(await segunda.listarAuditoria()).toEqual(await primeira.listarAuditoria());
    expect((await segunda.obterIndicadores()).decisoesHumanas).toBe(4);
    // A restauração não depende de a sessão original continuar viva.
    expect((await segunda.verificarCadeia()).integra).toBe(true);
  });

  it("ignora o que está guardado se for inválido e recomeça limpo", async () => {
    const guardados = [
      "isto não é JSON",
      JSON.stringify({ versao: 2 }),
      JSON.stringify({ versao: 1, vagas: "não é lista" }),
    ];
    for (const conteudo of guardados) {
      const armazenamento = new ArmazenamentoFalso();
      armazenamento.setItem(CHAVE_DE_ARMAZENAMENTO, conteudo);
      const api = criarApiDemo({ storage: armazenamento });
      expect(await api.listarVagas()).toHaveLength(6);
      expect(api.agora()).toBe("2026-10-01T09:00:00");
    }
  });

  it("ignora um estado de outro mundo (trilha que não começa igual à das fixtures)", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const original = criarApiDemo({ storage: armazenamento });
    await original.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"));
    const estado = JSON.parse(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)!);
    estado.auditoria[0].hash = "a".repeat(64);
    armazenamento.setItem(CHAVE_DE_ARMAZENAMENTO, JSON.stringify(estado));
    expect(await criarApiDemo({ storage: armazenamento }).listarVagas()).toHaveLength(6);
  });

  it("detecta a adulteração de uma linha nova da trilha guardada", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const original = criarApiDemo({ storage: armazenamento });
    await original.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"));
    const estado = JSON.parse(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)!);
    const alvo: RegistroAuditoria = estado.auditoria.find((r: RegistroAuditoria) => r.seq === 45);
    expect(alvo.acao).toBe("extraction_confirmed");
    alvo.detalhes.editados = ["urgencia"];
    armazenamento.setItem(CHAVE_DE_ARMAZENAMENTO, JSON.stringify(estado));
    const adulterada = criarApiDemo({ storage: armazenamento });
    expect(await adulterada.verificarCadeia()).toEqual({
      integra: false,
      registros: 43 + 8,
      primeiroInvalido: 45,
    });
  });

  it("reiniciar volta às fixtures, apaga o guardado e mantém o coordenador escolhido", async () => {
    const armazenamento = new ArmazenamentoFalso();
    const api = criarApiDemo({ storage: armazenamento });
    const marina = (await coordenadoresDe(api))[0]!;
    api.definirCoordenador(marina.id);
    api.avancarRelogio(120);
    await api.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"));
    expect(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)).not.toBeNull();
    api.reiniciar();
    expect(armazenamento.getItem(CHAVE_DE_ARMAZENAMENTO)).toBeNull();
    expect(api.agora()).toBe("2026-10-01T09:00:00");
    expect(await api.listarVagas()).toHaveLength(6);
    expect((await api.listarAuditoria()).length).toBe(mundo.auditoria.length);
    const sugestoes = await api.obterSugestoes("vaga-demo-2");
    const decisao = await api.aprovar({ vagaId: "vaga-demo-2", medicoIds: [sugestoes.candidatos[0]!.medico.id] });
    expect(decisao.decididoPor.nome).toBe("Marina Alves"); // mesmo sendo uma vaga do Hospital Norte
  });

  it("segue em memória se o armazenamento recusar gravar", async () => {
    const quebrado = new ArmazenamentoFalso();
    quebrado.setItem = () => {
      throw new DOMException("cheio", "QuotaExceededError");
    };
    const api = criarApiDemo({ storage: quebrado });
    const vaga = await api.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"));
    expect((await api.obterVaga(vaga.id)).id).toBe(vaga.id);
  });
});

describe("indicadores", () => {
  it("parte dos números simulados e conta as vagas e decisões da sessão", async () => {
    const api = criarApiDemo();
    expect(await api.obterIndicadores()).toEqual({
      rotulo: "simulado",
      tempoMedioAtePreencherMin: mundo.indicadoresBase.tempoMedioFluxoMin,
      pctPreenchidasComAntecedencia24h: mundo.indicadoresBase.pctPreenchidasComAntecedencia24h,
      pctSugestoesAceitas: null,
      linhaDeBase: {
        tempoMedioAtePreencherMin: mundo.indicadoresBase.tempoMedioManualMin,
        pctPreenchidasComAntecedencia24h: mundo.indicadoresBase.pctPreenchidasComAntecedencia24hManual,
      },
      vagasPublicadas: 5, // as seis, menos o rascunho
      decisoesHumanas: 3,
      aceites: 1,
      fonte: "docs/resultados/metricas-fluxo.md, simulação",
    });
    const vaga = await api.confirmarVaga(entradaDe("norte", "pediatria", "2026-10-06T19:00:00"));
    await api.aprovar({ vagaId: vaga.id, medicoIds: [await primeiroSemAlerta(api, vaga.id)] });
    expect(await api.obterIndicadores()).toMatchObject({ vagasPublicadas: 6, decisoesHumanas: 4, aceites: 1 });
  });
});

describe("eventos, latência e o que ficou para a próxima etapa", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("avisa quem assina da vaga publicada e da recomendação gerada, e para quando cancelam", async () => {
    const api = criarApiDemo();
    const recebidos: EventoPlantao[] = [];
    const cancelar = api.assinar((evento) => recebidos.push(evento));
    api.assinar(() => {
      throw new Error("ouvinte com defeito");
    });
    const vaga = await api.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"));
    expect(recebidos).toEqual([
      { tipo: "vaga_publicada", vagaId: vaga.id, em: "2026-10-01T09:00:00" },
      { tipo: "recomendacao_gerada", vagaId: vaga.id, em: "2026-10-01T09:00:00" },
    ]);
    cancelar();
    await api.confirmarVaga(entradaDe("sul", "pediatria", "2026-10-05T19:00:00"));
    expect(recebidos).toHaveLength(2);
  });

  it("adia as respostas pela latência configurada", async () => {
    vi.useFakeTimers();
    const api = criarApiDemo({ latenciaMs: 300 });
    let resolvido = false;
    const pendente = api.listarVagas().then((vagas) => {
      resolvido = true;
      return vagas;
    });
    await vi.advanceTimersByTimeAsync(299);
    expect(resolvido).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pendente).toHaveLength(6);
    expect(api.agora()).toBe("2026-10-01T09:00:00"); // a latência não mexe no relógio simulado
  });

  it("reiniciar no meio da espera descarta a operação que ainda não tinha começado", async () => {
    vi.useFakeTimers();
    const api = criarApiDemo({ latenciaMs: 300 });
    const pendente = api
      .confirmarVaga(entradaDe("sul", "pediatria", "2026-10-04T19:00:00"))
      .catch((erro: unknown) => erro);
    await vi.advanceTimersByTimeAsync(100);
    api.reiniciar();
    await vi.advanceTimersByTimeAsync(200);
    expect(await pendente).toBeInstanceOf(EstadoInvalidoError);

    const vagas = api.listarVagas();
    await vi.advanceTimersByTimeAsync(300);
    expect(await vagas).toHaveLength(6); // a vaga descartada não apareceu na demonstração nova
  });

  it("responde na hora quando a latência é zero (o padrão)", async () => {
    vi.useFakeTimers();
    const vagas = await criarApiDemo().listarVagas(); // sem avançar os timers: não pode travar
    expect(vagas).toHaveLength(6);
  });

  it("deixa cascata, ofertas e contestações para a etapa UI-2", async () => {
    const api = criarApiDemo();
    const chamadas = [
      api.obterCascata("vaga-demo-3"),
      api.listarOfertas("medico"),
      api.obterOferta("oferta"),
      api.responderOferta({ ofertaId: "oferta", resposta: "aceitar" }),
      api.desfazerResposta("oferta"),
      api.contestar({ ofertaId: "oferta", motivo: "outro", texto: "x" }),
      api.listarContestacoes(),
      api.responderContestacao({ id: "c", texto: "t" }),
    ];
    const erros = await Promise.all(chamadas.map((chamada) => chamada.catch((erro: unknown) => erro)));
    expect(erros).toHaveLength(8);
    for (const erro of erros) {
      expect(erro).toBeInstanceOf(NaoImplementadoError);
      expect((erro as Error).message).toMatch(/ainda não existe no modo demo/);
    }
  });

  it("tem a grade carregada uma vez só (a mesma promessa)", () => {
    expect(carregarGrade()).toBe(carregarGrade());
  });
});
