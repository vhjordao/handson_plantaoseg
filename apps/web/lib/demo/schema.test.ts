// @vitest-environment node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CODIGOS_REGRA, FATORES, type Recomendacao } from "../api/types";
import { carregarGrade, chaveDaGrade, obterMundo } from "./mundo";

const mundo = obterMundo();

function lerResultado(nome: string): Record<string, never> {
  const caminho = fileURLToPath(new URL(`../../../../docs/resultados/${nome}`, import.meta.url));
  return JSON.parse(readFileSync(caminho, "utf-8"));
}

function recomendacao(vagaId: string): Recomendacao {
  const achada = mundo.recomendacoes[vagaId];
  if (!achada) throw new Error(`sem recomendação para ${vagaId}`);
  return achada;
}

describe("mundo.json", () => {
  it("valida no esquema, com o relógio fixo e as três unidades", () => {
    expect(mundo.agora).toBe("2026-10-01T09:00:00");
    expect(mundo.unidades.map((u) => u.zona).sort()).toEqual(["centro", "norte", "sul"]);
    expect(mundo.politica).toEqual({
      maxHorasContinuas: 24,
      descansoMinimoHoras: 11,
      raioPadraoKm: 15,
      ttlOfertaMin: 60,
      topK: 5,
      permiteEspecialidadeSecundaria: true,
    });
  });

  it("traz a ficha do modelo com os pesos reais, o que não é usado e os limites", () => {
    const ficha = mundo.fichaModelo;
    expect(ficha.tipo).toBe("regressão logística");
    expect(ficha.versao).toBe("logreg-v1");
    expect(ficha.treinadoCom).toBe("300 médicos e 12 meses de vagas e ofertas, todos sintéticos");
    expect(ficha.variaveisUsadas.map((v) => v.fator).sort()).toEqual([...FATORES].sort());
    // Os pesos vêm de metricas-ranking.json (mesmo modelo, mesma semente).
    const coeficientes = lerResultado("metricas-ranking.json")["coefficients"] as unknown as {
      feature: string;
      weight: number;
    }[];
    for (const { feature, weight } of coeficientes) {
      const usado = ficha.variaveisUsadas.find((v) => v.fator === feature);
      expect(usado?.peso).toBeCloseTo(weight, 3);
    }
    expect(ficha.variaveisNaoUsadas).toHaveLength(4);
    expect(ficha.variaveisNaoUsadas.map((v) => v.nome).join(" ")).toMatch(/pagamento/i);
    expect(ficha.metricas).toHaveLength(5);
    for (const metrica of ficha.metricas) expect(metrica.valor).toMatch(/^\d,\d{3}$/);
    expect(ficha.classeDeRisco).toEqual({
      preliminar: "Médio (reavaliada; a Entrega 1 propôs baixo)",
      observacao:
        "Leitura de engenharia do Anexo II da Res. CFM 2.454/2026; a classificação formal é do hospital; validar com jurídico.",
    });
    expect(ficha.limites).toHaveLength(6);
    expect(ficha.limites.every((l) => l.endsWith("."))).toBe(true);
  });

  it("nunca cita pagamento, valor ou atributo protegido entre as variáveis usadas", () => {
    const usadas = mundo.fichaModelo.variaveisUsadas.map((v) => v.fator).join(" ");
    expect(usadas).not.toMatch(/pag|valor|price|amount|gender|age|idade|genero/i);
  });

  it("parte dos indicadores de metricas-fluxo.json e não inventa aceitação das sugestões", () => {
    const fluxo = lerResultado("metricas-fluxo.json") as unknown as {
      flow: { model: { time_mean: number; lead24_share: number } };
      manual: { test: { time_mean: number } };
    };
    const base = mundo.indicadoresBase;
    expect(base.tempoMedioFluxoMin).toBeCloseTo(fluxo.flow.model.time_mean, 1);
    expect(base.tempoMedioManualMin).toBeCloseTo(fluxo.manual.test.time_mean, 1);
    expect(base.pctPreenchidasComAntecedencia24h).toBeCloseTo(
      fluxo.flow.model.lead24_share * 100,
      1,
    );
    expect(base.pctSugestoesAceitas).toBeNull();
    expect(base.fonte).toBe("docs/resultados/metricas-fluxo.md, simulação");
  });

  it("não leva ao navegador a zona de residência nem outro atributo protegido dos médicos", async () => {
    const proibidos = ["zona", "home_zone", "gender", "age_band", "phone_sim", "home_lat", "home_lon"];
    const brutos = [
      (await import("./mundo.json")).default,
      (await import("./grade.json")).default,
    ];
    const achados: string[] = [];
    const varrer = (valor: unknown, dentroDeMedico: boolean): void => {
      if (Array.isArray(valor)) return valor.forEach((item) => varrer(item, dentroDeMedico));
      if (valor === null || typeof valor !== "object") return;
      for (const [chave, interno] of Object.entries(valor)) {
        if (dentroDeMedico && proibidos.includes(chave)) achados.push(chave);
        varrer(interno, chave === "medico");
      }
    };
    brutos.forEach((bruto) => varrer(bruto, false));
    expect(achados).toEqual([]);
  });

  it("tem 2 coordenadores e 12 médicos, 6 de cada uma das duas vagas que aguardam decisão", () => {
    const coordenadores = mundo.personas.filter((p) => p.papel === "coordenador");
    expect(coordenadores.map((c) => `${c.nome} (${c.unidade.nome})`)).toEqual([
      "Marina Alves (Hospital Modelo Centro)",
      "Rodrigo Lacerda (Hospital Modelo Norte)",
    ]);
    for (const c of coordenadores) {
      expect(c.pseudoId).toMatch(/^coord-[0-9a-f]{8}$/);
      expect(c.cargo).toBe("Coordenação de escala");
    }
    const medicos = mundo.personas.filter((p) => p.papel === "medico");
    expect(medicos).toHaveLength(12);
    expect(new Set(medicos.map((m) => m.id)).size).toBe(12);
    for (const vagaId of ["vaga-demo-1", "vaga-demo-2"]) {
      // Os 8 primeiros: os 5 da lista do coordenador mais as 3 reservas da cascata.
      const primeiros = new Set(
        [...recomendacao(vagaId).candidatos, ...(mundo.reservas[vagaId] ?? [])].map(
          (c) => c.medico.id,
        ),
      );
      expect(primeiros.size).toBe(8);
      expect(medicos.filter((m) => primeiros.has(m.id))).toHaveLength(6);
    }
  });

  it("tem o pseudônimo de oito caracteres e nunca o telefone", () => {
    for (const p of mundo.personas) {
      if (p.papel === "medico") expect(p.medico.pseudonimo).toBe(p.medico.id.slice(0, 8));
    }
    // A ficha cita "telefone" só para dizer que ele não é usado; o número em si nunca sai.
    const texto = JSON.stringify(mundo);
    expect(texto).not.toMatch(/phone|\+55 \d\d \d{4,5}-\d{4}/i);
  });

  it("tem as seis vagas nos estados pedidos, todas criadas antes do agora", () => {
    expect(mundo.vagas.map((v) => [v.id, v.status])).toEqual([
      ["vaga-demo-1", "aguardando_decisao"],
      ["vaga-demo-2", "aguardando_decisao"],
      ["vaga-demo-3", "oferta_em_andamento"],
      ["vaga-demo-4", "preenchida"],
      ["vaga-demo-5", "rascunho"],
      ["vaga-demo-6", "oferta_em_andamento"],
    ]);
    for (const vaga of mundo.vagas) expect(vaga.criadaEm < mundo.agora).toBe(true);
    const [v1, , v3, v4, v5, v6] = mundo.vagas;
    expect(v1?.urgencia).toBe("high");
    expect(v1?.inicio).toBe("2026-10-02T19:00:00");
    expect(v3?.inicio).toBe("2026-10-04T19:00:00");
    expect(v4?.tempoAtePreencherMin).toBe(52);
    expect(v5).toMatchObject({ inicio: null, fim: null, emRisco: false });
    expect(v6).toMatchObject({
      emRisco: true,
      motivoRisco: "Começa em 10 h e nenhuma oferta foi aceita",
    });
    expect(mundo.vagas.filter((v) => v.emRisco)).toHaveLength(1);
  });

  it("tem recomendações reais para as vagas 1 a 4 e 6, e nenhuma para o rascunho", () => {
    expect(Object.keys(mundo.recomendacoes).sort()).toEqual([
      "vaga-demo-1",
      "vaga-demo-2",
      "vaga-demo-3",
      "vaga-demo-4",
      "vaga-demo-6",
    ]);
    for (const [vagaId, rec] of Object.entries(mundo.recomendacoes)) {
      expect(rec.vagaId).toBe(vagaId);
      expect(rec.modeloVersao).toBe("logreg-v1");
      expect(rec.geradaEm < mundo.agora).toBe(true);
      expect(rec.candidatos.map((c) => c.posicao)).toEqual([1, 2, 3, 4, 5]);
      const excluidos = Object.values(rec.exclusoesPorRegra).reduce((a, b) => a + b, 0);
      expect(excluidos + rec.totalElegiveis).toBe(rec.totalPool);
      expect(rec.exemplosExcluidos.length).toBeLessThanOrEqual(12);
      for (const regra of CODIGOS_REGRA) {
        const doTipo = rec.exemplosExcluidos.filter((e) => e.codigoRegra === regra);
        expect(doTipo.length).toBeLessThanOrEqual(4);
        for (const e of doTipo) expect(e.evidencia).toBeTruthy();
      }
    }
  });

  it("mantém o cenário da exceção justificada: o 4º da vaga 1 tem alerta de carga alta", () => {
    const quarto = recomendacao("vaga-demo-1").candidatos[3];
    expect(quarto?.alertas).toEqual([expect.stringMatching(/^carga recente alta: \d+ plantões/)]);
    expect(recomendacao("vaga-demo-1").candidatos.slice(0, 3).flatMap((c) => c.alertas)).toEqual(
      [],
    );
  });

  it("escreve a evidência das exclusões com números reais", () => {
    const evidencias = Object.values(mundo.recomendacoes)
      .flatMap((r) => r.exemplosExcluidos)
      .map((e) => [e.codigoRegra, e.evidencia] as const);
    const de = (regra: string) => evidencias.filter(([r]) => r === regra).map(([, e]) => e);
    for (const e of de("outside_radius")) expect(e).toMatch(/^Mora a \d+,\d km; o raio declarado é \d+ km\.$/);
    for (const e of de("unavailable")) expect(e).toMatch(/^Cobre \d+(,\d)? h das 12 h da vaga\.$/);
    for (const e of de("specialty_mismatch")) {
      expect(e).toMatch(/^Especialidade: (clínica médica|pediatria); a vaga pede (clínica médica|pediatria)\.$/);
    }
    expect(de("outside_radius").length).toBeGreaterThan(0);
    expect(de("unavailable").length).toBeGreaterThan(0);
  });

  it("registra as decisões das vagas 3, 4 e 6 com os três primeiros e um dos coordenadores", () => {
    expect(Object.keys(mundo.decisoes).sort()).toEqual(["vaga-demo-3", "vaga-demo-4", "vaga-demo-6"]);
    const pseudoIds = mundo.personas.flatMap((p) => (p.papel === "coordenador" ? [p.pseudoId] : []));
    for (const [vagaId, decisao] of Object.entries(mundo.decisoes)) {
      const tres = recomendacao(vagaId).candidatos.slice(0, 3).map((c) => c.medico.id);
      expect(decisao.medicoIds).toEqual(tres);
      expect(pseudoIds).toContain(decisao.decididoPor.pseudoId);
      expect(decisao.excecao).toBeNull();
      expect(decisao.em < mundo.agora).toBe(true);
    }
    expect(mundo.decisoes["vaga-demo-3"]?.em).toBe("2026-10-01T08:40:00");
    const preenchida = mundo.vagas.find((v) => v.id === "vaga-demo-4")?.preenchidaPor;
    expect(mundo.decisoes["vaga-demo-4"]?.medicoIds).toContain(preenchida?.medicoId);
  });

  it("tem as reservas das posições 6 a 8 das vagas 1 e 2", () => {
    for (const vagaId of ["vaga-demo-1", "vaga-demo-2"]) {
      expect(mundo.reservas[vagaId]?.map((c) => c.posicao)).toEqual([6, 7, 8]);
    }
  });

  it("tem cinco textos de exemplo, um de cada estilo, e o adversarial é sinalizado", () => {
    expect(mundo.exemplosTexto.map((e) => e.estilo)).toEqual([
      "formal",
      "abreviado",
      "com_erros",
      "ambiguo",
      "adversarial",
    ]);
    const adversarial = mundo.exemplosTexto[4];
    const caso = mundo.paridade.find((c) => c.texto === adversarial?.texto);
    expect(caso?.flags.length).toBeGreaterThan(0);
    const abreviado = mundo.exemplosTexto[1];
    expect(abreviado?.texto).toMatch(/\bter \d/);
  });

  it("guarda a extração real de cada texto de exemplo e de cada vaga para a paridade", () => {
    const textos = new Set(mundo.paridade.map((c) => c.texto));
    for (const e of mundo.exemplosTexto) expect(textos.has(e.texto)).toBe(true);
    for (const v of mundo.vagas) expect(textos.has(v.textoOriginal)).toBe(true);
    expect(mundo.paridade.length).toBeGreaterThanOrEqual(50);
  });

  it("tem a cadeia de auditoria numerada, só com pseudônimos", () => {
    expect(mundo.auditoria.map((r) => r.seq)).toEqual(mundo.auditoria.map((_, i) => i + 1));
    const acoes = new Set(mundo.auditoria.map((r) => r.acao));
    expect(acoes).toEqual(
      new Set([
        "shift_published",
        "extraction_confirmed",
        "recommendation_generated",
        "explanation_generated",
        "recommendation_approved",
      ]),
    );
    for (const r of mundo.auditoria) expect(r.ocorridoEm < mundo.agora).toBe(true);
    const texto = JSON.stringify(mundo.auditoria);
    for (const p of mundo.personas) {
      if (p.papel === "medico") {
        expect(texto).not.toContain(p.medico.nome);
        expect(texto).not.toContain(p.medico.crm);
      } else {
        expect(texto).not.toContain(p.nome);
      }
    }
  });
});

describe("grade.json", () => {
  it("tem uma recomendação para cada unidade, especialidade e janela de 12 h até 08/10", async () => {
    const grade = await carregarGrade();
    const esperadas: string[] = [];
    for (let k = 0; ; k++) {
      const inicio = new Date(Date.UTC(2026, 9, 1, 19) + k * 12 * 3_600_000);
      if (inicio.getUTCDate() > 8) break;
      const iso = inicio.toISOString().slice(0, 19);
      for (const unidade of mundo.unidades) {
        for (const especialidade of ["clinica_medica", "pediatria"] as const) {
          esperadas.push(chaveDaGrade(unidade.id, especialidade, iso));
        }
      }
    }
    expect(esperadas).toHaveLength(90);
    expect(Object.keys(grade).sort()).toEqual(esperadas.sort());
  });

  it("repete o pool, as contagens e o limite de cinco candidatos em toda entrada", async () => {
    const grade = await carregarGrade();
    for (const rec of Object.values(grade)) {
      expect(rec.totalPool).toBe(300);
      expect(rec.candidatos).toHaveLength(Math.min(5, rec.totalElegiveis));
      const excluidos = Object.values(rec.exclusoesPorRegra).reduce((a, b) => a + b, 0);
      expect(excluidos + rec.totalElegiveis).toBe(rec.totalPool);
      expect(rec.geradaEm).toBe(mundo.agora);
    }
  });

  it("não tem elegíveis no plantão diurno de dia útil (o recorte do segmento inicial)", async () => {
    const grade = await carregarGrade();
    for (const [chave, rec] of Object.entries(grade)) {
      const inicio = new Date(`${chave.split("|")[2]}Z`);
      const diaUtil = inicio.getUTCDay() >= 1 && inicio.getUTCDay() <= 5;
      if (inicio.getUTCHours() === 7 && diaUtil) expect(rec.totalElegiveis).toBe(0);
      if (inicio.getUTCHours() === 19) expect(rec.totalElegiveis).toBeGreaterThanOrEqual(5);
    }
  });

  it("coincide com as recomendações das vagas de exemplo (mesmo pipeline, mesmo agora)", async () => {
    const grade = await carregarGrade();
    for (const vaga of mundo.vagas) {
      const rec = mundo.recomendacoes[vaga.id];
      if (!rec || !vaga.especialidade || !vaga.inicio) continue;
      const daGrade = grade[chaveDaGrade(vaga.unidade.id, vaga.especialidade, vaga.inicio)];
      expect(daGrade, vaga.id).toBeDefined();
      expect(rec.vagaId).toBe(vaga.id);
      expect(rec.geradaEm <= mundo.agora).toBe(true);
      // A grade perde os exemplos de excluídos quando passa de 600 KB; o resto é idêntico.
      expect(nucleo(rec)).toEqual(nucleo(daGrade!));
    }
  });
});

/** A recomendação sem o que muda de vaga para vaga (id e hora) e sem os exemplos. */
function nucleo(rec: object): Record<string, unknown> {
  const copia: Record<string, unknown> = { ...rec };
  delete copia.vagaId;
  delete copia.geradaEm;
  delete copia.exemplosExcluidos;
  return copia;
}
