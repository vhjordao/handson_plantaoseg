import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** As regras do WCAG 2.2 AA que o axe confere. */
export const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

export async function entrarComoCoordenador(page: Page) {
  await page.goto("/entrar/demonstracao");
  await page.getByRole("button", { name: "Entrar como coordenador" }).click();
  await page.waitForURL("**/coordenador/vagas");
}

export async function entrarComoMedico(page: Page) {
  await page.goto("/entrar/demonstracao");
  const botao = page.getByRole("button", { name: "Entrar como médico" });
  // A persona é sorteada depois que a página monta; até lá o botão fica desabilitado.
  await expect(botao).toBeEnabled({ timeout: 10_000 });
  await botao.click();
  await page.waitForURL("**/medico/ofertas");
}

/**
 * Roda o axe na página aberta e falha com a lista de nós se houver violação grave. Com
 * `boasPraticas`, falha também nas regras de estrutura que o axe trata como boas práticas
 * (`region`, `page-has-heading-one`, ...), que o WCAG sozinho não cobra.
 */
export async function semViolacoesGraves(page: Page, { boasPraticas = false } = {}) {
  const tags = boasPraticas ? [...REGRAS_WCAG, "best-practice"] : REGRAS_WCAG;
  const resultado = await new AxeBuilder({ page }).withTags(tags).analyze();
  const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const estrutura = boasPraticas
    ? resultado.violations.filter((v) =>
        ["region", "page-has-heading-one", "landmark-one-main", "landmark-unique"].includes(v.id),
      )
    : [];
  const achados = [...graves, ...estrutura].map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) }));
  expect(achados, `${page.url()}: ${JSON.stringify(achados, null, 2)}`).toEqual([]);
}
