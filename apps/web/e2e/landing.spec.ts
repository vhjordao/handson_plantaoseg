import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("landing", () => {
  test("apresenta o produto e leva à entrada", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PlantãoSeguro/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A IA sugere.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Você decide.");
    await expect(page.getByRole("note", { name: "Aviso de demonstração" })).toContainText(
      "dados sintéticos",
    );
    const entrar = page.getByRole("link", { name: "Entrar na demonstração" }).first();
    await expect(entrar).toHaveAttribute("href", "/entrar");
  });

  test("o primeiro Tab leva ao 'Pular para o conteúdo'", async ({ page, isMobile }) => {
    test.skip(isMobile, "Tab de teclado não se aplica ao celular");
    await page.goto("/");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused();
  });

  test("Ajuda fica no canto direito do cabeçalho, antes de Entrar", async ({ page }) => {
    await page.goto("/");
    const cabecalho = page.getByRole("banner");
    const ajuda = cabecalho.getByRole("link", { name: "Ajuda" });
    const entrar = cabecalho.getByRole("link", { name: "Entrar", exact: true });
    const [a, e] = await Promise.all([ajuda.boundingBox(), entrar.boundingBox()]);
    expect(a && e && a.x < e.x).toBeTruthy();
  });

  test("a demonstração do hero conduz até o selo de decisão humana", async ({ page }) => {
    await page.goto("/");
    const aprovar = page.getByRole("button", { name: "Aprovar e oferecer" });
    await expect(aprovar).toBeEnabled({ timeout: 10_000 });
    const primeira = page.locator("[data-voz]", { has: aprovar });
    await expect(primeira).toHaveAttribute("data-voz", "ia");
    await aprovar.click();
    await expect(page.getByText("Decidido por")).toBeVisible();
    await expect(page.locator('[data-voz="humano"]', { hasText: "Felipe Ferraz Siqueira" })).toBeVisible();
    // O foco segue para o próximo controle, e o botão de aprovar sai de cena.
    await expect(page.getByRole("button", { name: "Ver de novo" })).toBeFocused();
    await expect(page.getByRole("button", { name: "Aprovar e oferecer" })).toHaveCount(0);
  });

  test("com movimento reduzido, o hero já aparece no estado final", async ({ browser }) => {
    const contexto = await browser.newContext({ reducedMotion: "reduce" });
    const page = await contexto.newPage();
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Aprovar e oferecer" })).toBeEnabled({
      timeout: 3_000,
    });
    await contexto.close();
  });

  test("não tem rolagem horizontal em 320 px", async ({ browser }) => {
    const contexto = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await contexto.newPage();
    await page.goto("/");
    await page.waitForTimeout(500);
    const excesso = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(excesso).toBeLessThanOrEqual(0);
    await contexto.close();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`@a11y axe sem violações graves no tema ${esquema === "light" ? "claro" : "escuro"}`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Aprovar e oferecer" })).toBeEnabled({
        timeout: 10_000,
      });
      const resultado = await new AxeBuilder({ page }).withTags(REGRAS_WCAG).analyze();
      const graves = resultado.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(graves, JSON.stringify(graves.map((v) => ({ id: v.id, nos: v.nodes.map((n) => n.target) })), null, 2)).toEqual([]);
    });
  }
});
