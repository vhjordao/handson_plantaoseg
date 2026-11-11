import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const REGRAS_WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test.describe("landing", () => {
  test("apresenta o produto e leva à entrada", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/PlantãoSeguro/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("A IA sugere.");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Você decide.");
    await expect(page.getByRole("region", { name: "Aviso de demonstração" })).toContainText(
      "dados sintéticos",
    );
    const entrar = page.getByRole("link", { name: "Entrar no sistema" }).first();
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
    // A região de status que anuncia a decisão já está na página, vazia, antes de alguém decidir.
    const anuncio = page.locator('section[aria-label^="Exemplo da simulação"] [role="status"]');
    await expect(anuncio).toBeEmpty();
    await aprovar.click();
    const decidida = page.locator('[data-voz="humano"]', { hasText: "Felipe Ferraz Siqueira" });
    await expect(decidida).toBeVisible();
    await expect(decidida.getByText("Decidido por")).toBeVisible();
    await expect(anuncio).toContainText("Decidido por você, coordenação, 9h12");
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

  test("o botão de tema troca para o escuro e lembra a escolha", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    const botao = page.getByRole("banner").getByRole("button", { name: "Tema escuro" });
    await expect(botao).toHaveAttribute("aria-pressed", "false");
    await botao.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(botao).toHaveAttribute("aria-pressed", "true");
    // A escolha vale depois de recarregar, antes do React montar (sem piscar).
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    // O estado no botão só aparece depois que o React assume a página: só então o clique vale.
    const depois = page.getByRole("banner").getByRole("button", { name: "Tema escuro" });
    await expect(depois).toHaveAttribute("aria-pressed", "true");
    await depois.click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});
