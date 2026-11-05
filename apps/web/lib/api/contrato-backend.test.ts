/**
 * O contrato da interface (`types.ts`) espelha listas fechadas do backend. Estes testes leem o
 * código Python e falham se uma delas mudar sem a interface acompanhar. Já aconteceu: a API
 * passou a gravar `shift_uncovered` e o contrato não tinha essa ação (ADR 0014, divergências).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACOES_AUDITORIA_BACKEND,
  ACOES_AUDITORIA_DESENHO,
  CODIGOS_REGRA,
  FATORES,
} from "./types";

/** O Vitest roda em `apps/web` (local e na CI); o backend fica dois níveis acima. */
function fonte(relativo: string): string {
  return readFileSync(resolve(process.cwd(), "../../services/matching-api/app", relativo), "utf8");
}

function bloco(texto: string, padrao: RegExp, onde: string): string {
  const achado = padrao.exec(texto);
  if (!achado?.[1]) throw new Error(`Não achei ${onde} no código Python.`);
  return achado[1];
}

/** Os textos entre aspas de uma lista: `"a", "b"`. */
const entreAspas = (trecho: string) => [...trecho.matchAll(/"([a-z_0-9]+)"/g)].map((m) => m[1]!);
/** As chaves de um dicionário: `"a": "...",`. */
const chaves = (trecho: string) => [...trecho.matchAll(/^\s*"([a-z_0-9]+)":/gm)].map((m) => m[1]!);
const ordenado = (lista: readonly string[]) => [...lista].sort();

describe("o contrato da interface espelha o backend", () => {
  it("as ações da trilha são as de audit.py::ACTIONS", () => {
    const python = entreAspas(
      bloco(fonte("audit.py"), /ACTIONS\s*=\s*frozenset\(\s*\{([^}]*)\}/, "ACTIONS"),
    );
    expect(ordenado(ACOES_AUDITORIA_BACKEND)).toEqual(ordenado(python));
    // As do desenho só deixam de ser "do desenho" quando o backend passa a gravá-las.
    for (const acao of ACOES_AUDITORIA_DESENHO) expect(python).not.toContain(acao);
  });

  it("as variáveis do ranking são as de RANKING_FEATURES", () => {
    const python = entreAspas(
      bloco(
        fonte("ranking/features.py"),
        /RANKING_FEATURES[^=]*=\s*\(([^)]*)\)/,
        "RANKING_FEATURES",
      ),
    );
    expect(ordenado(FATORES)).toEqual(ordenado(python));
  });

  it("os códigos de exclusão são as chaves de RULE_TEXTS", () => {
    const python = chaves(bloco(fonte("rules.py"), /RULE_TEXTS[^=]*=\s*\{([^}]*)\}/, "RULE_TEXTS"));
    expect(ordenado(CODIGOS_REGRA)).toEqual(ordenado(python));
  });
});
