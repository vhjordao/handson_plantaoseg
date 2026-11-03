/**
 * Carregador tipado das fixtures do modo `demo`.
 *
 * `mundo.json` (núcleo, pequeno) entra no pacote e é validado uma vez; `grade.json` (a
 * recomendação de cada janela de 12 h dos próximos 8 dias) só é baixado quando alguém publica
 * uma vaga, por `import()` dinâmico. Se um arquivo sair do contrato, o erro aparece aqui, na
 * carga, e não numa tela.
 */
import type { DataHora, Especialidade } from "../api/types";
import mundoBruto from "./mundo.json";
import { GradeSchema, MundoSchema, type Grade, type Mundo } from "./schema";

let mundoEmCache: Mundo | null = null;

/** O núcleo da demonstração, validado. Não altere o resultado: ele é compartilhado. */
export function obterMundo(): Mundo {
  mundoEmCache ??= MundoSchema.parse(mundoBruto);
  return mundoEmCache;
}

let gradeEmCache: Promise<Grade> | null = null;

/** A grade de recomendações pré-calculadas, baixada e validada na primeira chamada. */
export function carregarGrade(): Promise<Grade> {
  gradeEmCache ??= import("./grade.json")
    .then((modulo) => GradeSchema.parse(modulo.default))
    .catch((erro: unknown) => {
      gradeEmCache = null; // uma falha de rede não pode ficar guardada para sempre
      throw erro;
    });
  return gradeEmCache;
}

/** Chave da grade: unidade, especialidade e início (com segundos, como o backend grava). */
export function chaveDaGrade(
  unidadeId: string,
  especialidade: Especialidade,
  inicio: DataHora,
): string {
  const comSegundos = inicio.length === 16 ? `${inicio}:00` : inicio;
  return `${unidadeId}|${especialidade}|${comSegundos}`;
}
