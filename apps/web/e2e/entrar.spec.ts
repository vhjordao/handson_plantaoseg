import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function entrarComoCoordenador(page: Page) {
  await page.goto("/entrar");
  await page.getByRole("button", { name: "Entrar como coordenador" }).click();
  await page.waitForURL("**/coordenador/vagas");
}

async function entrarComoMedico(page: Page) {
  await page.goto("/entrar");
  const botao = page.getByRole("button", { name: "Entrar como médico" });
  await expect(botao).toBeEnabled({ timeout: 10_000 });
  await botao.click();
  await page.waitForURL("**/medico/ofertas");
}

test.describe("entrada por persona", () => {
  test("as três portas aparecem, sem senha, com aviso de dados reais", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Entrar na demonstração");
    await expect(page.getByText("Sem senha")).toBeVisible();
    await expect(page.getByText("Não digite dados reais")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Coordenador" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Médico" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Telão" })).toBeVisible();
    await expect(page.locator('input[type="password"]')).toHaveCount(0);
  });

  test("sem sessão, a área do coordenador leva de volta à entrada e explica o motivo", async ({ page }) => {
    await page.goto("/coordenador/vagas");
    await expect(page).toHaveURL(/\/entrar\?papel=coordenador&de=%2Fcoordenador%2Fvagas/);
    await expect(page.getByText("entre como coordenador")).toBeVisible();
  });

  test("entrar como coordenador abre a plataforma com hospital, relógio simulado e Ajuda à direita", async ({ page, isMobile }) => {
    await entrarComoCoordenador(page);
    await expect(page.getByRole("note", { name: "Aviso de demonstração" })).toBeVisible();
    // No celular o hospital e o relógio ficam no alto da página; no computador, no cabeçalho.
    await expect(page.getByText("Hospital Modelo Centro (fictício)").filter({ visible: true }).first()).toBeVisible();
    await expect(page.getByText(/Hoje \(simulado\): quinta, 01\/10, 9h/).filter({ visible: true }).first()).toBeVisible();
    const cabecalho = page.getByRole("banner");
    const ajuda = cabecalho.getByRole("link", { name: "Ajuda" });
    const menu = cabecalho.getByRole("button", { name: /Marina Alves|Menu de Marina/ });
    const [a, m] = await Promise.all([ajuda.boundingBox(), menu.boundingBox()]);
    expect(a && m && a.x < m.x).toBeTruthy();
    if (!isMobile) {
      await expect(page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Vagas" })).toHaveAttribute("aria-current", "page");
    }
  });

  test("o coordenador não entra na área do médico", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/medico/ofertas");
    await expect(page).toHaveURL(/\/entrar\?papel=medico/);
  });

  test("entrar como médico sorteia uma persona, deixa sortear outra e abre as ofertas", async ({ page }) => {
    await page.goto("/entrar");
    const entrar = page.getByRole("button", { name: "Entrar como médico" });
    await expect(entrar).toBeEnabled({ timeout: 10_000 });
    const cartao = page.getByRole("region", { name: "Médico" });
    const antes = await cartao.locator("p.font-semibold").first().textContent();
    await page.getByRole("button", { name: "Sortear outra" }).click();
    await expect(cartao.locator("p.font-semibold").first()).not.toHaveText(antes ?? "");
    await entrar.click();
    await page.waitForURL("**/medico/ofertas");
    await expect(page.getByRole("navigation", { name: "Principal" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Minha conta" }).first()).toBeVisible();
  });

  test("Minha conta mostra o que o sistema usa e o que não usa", async ({ page }) => {
    await entrarComoMedico(page);
    await page.goto("/medico/conta");
    await expect(page.getByRole("heading", { level: 2, name: "O que o sistema usa para sugerir você" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "O que o sistema não usa" })).toBeVisible();
    await expect(page.getByText("O valor do plantão e o pagamento")).toBeVisible();
  });

  test("com ?papel=medico, a porta do médico vem primeiro (posição visual)", async ({ page }) => {
    await page.goto("/entrar?papel=medico");
    const [m, c] = await Promise.all([
      page.getByRole("region", { name: "Médico" }).boundingBox(),
      page.getByRole("region", { name: "Coordenador" }).boundingBox(),
    ]);
    // Na mesma linha as alturas diferem por subpixel; no celular a porta vem em cima.
    expect(m && c && (m.y < c.y - 2 || (Math.abs(m.y - c.y) <= 2 && m.x < c.x))).toBeTruthy();
  });

  test("a tela de Vagas mostra os indicadores simulados e as vagas da demonstração", async ({ page }) => {
    await entrarComoCoordenador(page);
    await expect(page.getByRole("heading", { level: 1, name: "Vagas" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Indicadores da demonstração" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Simulado", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "Pediatria" }).first()).toBeVisible();
    // O percentual de sugestões aceitas não é inventado: sem usuários, aparece o travessão.
    await expect(page.getByText("Só se mede com usuários")).toBeVisible();
    // Filtro pela URL.
    await page.getByRole("link", { name: /^Em risco/ }).click();
    await expect(page).toHaveURL(/status=risco/);
    await expect(page.getByText(/nenhuma oferta foi aceita/)).toBeVisible();
  });

  test("Sair encerra a sessão", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.getByRole("banner").getByRole("button", { name: /Marina Alves|Menu de Marina/ }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await page.waitForURL("**/");
    await page.goto("/coordenador/vagas");
    await expect(page).toHaveURL(/\/entrar/);
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`@a11y axe sem violações graves em /entrar, na plataforma e na conta (${esquema === "light" ? "claro" : "escuro"})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto("/entrar");
      await expect(page.getByRole("button", { name: "Entrar como médico" })).toBeEnabled({ timeout: 10_000 });
      const rotas: Array<() => Promise<void>> = [
        async () => {},
        async () => entrarComoCoordenador(page),
        async () => {
          await page.goto("/entrar");
          await expect(page.getByRole("button", { name: "Entrar como médico" })).toBeEnabled({ timeout: 10_000 });
          await page.getByRole("button", { name: "Entrar como médico" }).click();
          await page.waitForURL("**/medico/ofertas");
          await page.goto("/medico/conta");
        },
      ];
      for (const ir of rotas) {
        await ir();
        const resultado = await new AxeBuilder({ page }).withTags(REGRAS_WCAG).analyze();
        const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
        expect(graves, `${page.url()}: ${JSON.stringify(graves.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)}`).toEqual([]);
      }
    });
  }
});
