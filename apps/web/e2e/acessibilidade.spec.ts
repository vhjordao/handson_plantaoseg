import { expect, test, type Browser, type Page } from "@playwright/test";
import { entrarComoCoordenador, entrarComoMedico, semViolacoesGraves } from "./ajudantes";

/**
 * O que o `axe` não pega sozinho, conferido na prática: foco escondido sob o cabeçalho fixo
 * (WCAG 2.4.11), reflow a 320 px (1.4.10), ordem do foco (1.3.2 e 2.4.3), avisos de estado
 * (4.1.3), alto contraste (1.4.1), alvos de toque (2.5.8) e as rotas que a jornada não visita.
 */

const LARGURAS_ESTREITAS = [320, 360, 375] as const;

async function paginaNaLargura(browser: Browser, largura: number, altura = 700): Promise<Page> {
  const contexto = await browser.newContext({ viewport: { width: largura, height: altura } });
  return contexto.newPage();
}

const rolagemHorizontal = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

test.describe("o foco não fica sob o cabeçalho fixo (2.4.11)", () => {
  for (const largura of LARGURAS_ESTREITAS) {
    test(`na landing, voltando com Shift+Tab, a ${largura} px`, async ({ browser, isMobile }) => {
      test.skip(isMobile, "o teclado não se aplica ao celular; o teste cria o próprio tamanho de tela");
      const page = await paginaNaLargura(browser, largura);
      await page.goto("/");
      await expect(page.getByRole("banner")).toBeVisible();
      // O cabeçalho cabe numa linha: abaixo de 390 px sobra só o símbolo da marca.
      expect((await page.getByRole("banner").boundingBox())?.height).toBeLessThan(80);

      await page.getByRole("link", { name: /Código no GitHub/ }).focus();
      let verificados = 0;
      for (let passo = 0; passo < 160; passo += 1) {
        await page.keyboard.press("Shift+Tab");
        const foco = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          if (!el || el === document.body) return null;
          // Os controles do próprio cabeçalho e o "Pular para o conteúdo" ficam por cima de propósito.
          if (el.closest("header") || el.textContent?.includes("Pular para o conteúdo")) return { dentro: true };
          const caixa = el.getBoundingClientRect();
          const cabecalho = document.querySelector("header")?.getBoundingClientRect();
          return {
            dentro: false,
            baixo: caixa.bottom,
            abaixoDoCabecalho: cabecalho?.bottom ?? 0,
            nome: (el.textContent ?? el.getAttribute("aria-label") ?? el.tagName).trim().slice(0, 50),
          };
        });
        if (!foco) break;
        if (foco.dentro) continue;
        verificados += 1;
        expect(foco.baixo, `"${foco.nome}" ficou sob o cabeçalho`).toBeGreaterThan(foco.abaixoDoCabecalho ?? 0);
      }
      expect(verificados).toBeGreaterThanOrEqual(15); // percorreu a página de verdade
      await page.context().close();
    });
  }

  test("a barra inferior do médico reserva espaço no fim da tela, só no celular", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const page = await paginaNaLargura(browser, 390, 844);
    await entrarComoMedico(page);
    const reservado = () =>
      page.evaluate(() => getComputedStyle(document.documentElement).scrollPaddingBottom);
    expect(await reservado()).toBe("80px");
    await page.setViewportSize({ width: 1024, height: 800 }); // sem a barra inferior
    expect(await reservado()).toBe("auto");
    await page.context().close();
  });
});

test.describe("sem rolagem horizontal a 320 px (1.4.10)", () => {
  test("rotas públicas", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const page = await paginaNaLargura(browser, 320, 640);
    for (const rota of ["/", "/ajuda", "/entrar", "/entrar?papel=medico&de=%2Fmedico%2Fofertas", "/telao", "/nao-existe"]) {
      await page.goto(rota);
      await page.waitForTimeout(300);
      expect(await rolagemHorizontal(page), rota).toBeLessThanOrEqual(0);
    }
    await page.context().close();
  });

  test("as áreas do médico e do coordenador", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const medico = await paginaNaLargura(browser, 320, 640);
    await entrarComoMedico(medico);
    for (const rota of ["/medico/ofertas", "/medico/contestacoes", "/medico/conta"]) {
      await medico.goto(rota);
      await medico.waitForTimeout(300);
      expect(await rolagemHorizontal(medico), rota).toBeLessThanOrEqual(0);
    }
    await medico.context().close();

    const coordenador = await paginaNaLargura(browser, 320, 640);
    await entrarComoCoordenador(coordenador);
    await expect(coordenador.getByRole("heading", { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
    for (const rota of ["/coordenador/vagas", "/coordenador/vagas/nova", "/coordenador/auditoria"]) {
      await coordenador.goto(rota);
      await coordenador.waitForTimeout(300);
      expect(await rolagemHorizontal(coordenador), rota).toBeLessThanOrEqual(0);
    }
    await coordenador.context().close();
  });

  test("com a letra ampliada em 200%, o conteúdo quebra em vez de passar da tela (1.4.4)", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const ampliar = (page: Page) =>
      page.addInitScript(() => {
        document.addEventListener("DOMContentLoaded", () => {
          document.documentElement.style.fontSize = "200%";
        });
      });
    const semExcesso = async (page: Page, rotas: string[]) => {
      for (const rota of rotas) {
        await page.goto(rota);
        await page.waitForTimeout(300);
        expect(await rolagemHorizontal(page), `${rota} com a letra a 200%`).toBeLessThanOrEqual(0);
      }
    };

    // O telão fica de fora: é uma tela de projetor, de corpo de 28 px, que ninguém amplia no celular.
    const publico = await paginaNaLargura(browser, 390, 844);
    await ampliar(publico);
    await semExcesso(publico, ["/", "/entrar", "/ajuda"]);
    await publico.context().close();

    const medico = await paginaNaLargura(browser, 390, 844);
    await ampliar(medico);
    await entrarComoMedico(medico);
    await semExcesso(medico, ["/medico/ofertas", "/medico/contestacoes", "/medico/conta"]);
    await medico.context().close();

    const coordenador = await paginaNaLargura(browser, 390, 844);
    await ampliar(coordenador);
    await entrarComoCoordenador(coordenador);
    await expect(coordenador.getByRole("heading", { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
    await semExcesso(coordenador, ["/coordenador/vagas", "/coordenador/auditoria"]);
    await coordenador.context().close();
  });
});

test.describe("ordem do foco e avisos de estado", () => {
  test("com ?papel=medico, a porta do médico vem primeiro no HTML, não só na tela", async ({ page }) => {
    await page.goto("/entrar?papel=medico");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Médico", "Coordenador", "Telão"]);
    await page.goto("/entrar?papel=coordenador");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Coordenador", "Médico", "Telão"]);
    await page.goto("/entrar");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(["Coordenador", "Médico", "Telão"]);
  });

  test("trocar o filtro das vagas é anunciado numa região de status", async ({ page }) => {
    await entrarComoCoordenador(page);
    const aviso = page.getByRole("status").filter({ hasText: "Mostrando" });
    await expect(aviso).toHaveText("Mostrando 6 vagas.", { timeout: 10_000 });
    await page.getByRole("link", { name: /^Em risco/ }).click();
    await expect(aviso).toHaveText("Mostrando 1 de 6 vagas (Em risco).");
  });

  test("os botões 'Abrir a vaga' dizem de qual vaga são", async ({ page }) => {
    await entrarComoCoordenador(page);
    const abrir = page.getByRole("link", { name: "Abrir a vaga" }).first();
    await expect(abrir).toBeVisible({ timeout: 10_000 });
    await expect(abrir).toHaveAccessibleDescription(/Hospital Modelo/);
  });
});

test.describe("alto contraste do sistema (1.4.1)", () => {
  test("o item atual do menu, dos filtros e das abas ganha sublinhado", async ({ page }) => {
    await page.emulateMedia({ forcedColors: "active" });
    await entrarComoCoordenador(page);
    const atual = page
      .locator('a[aria-current="true"], a[aria-current="page"]')
      .filter({ visible: true })
      .first();
    await expect(atual).toBeVisible({ timeout: 10_000 });
    await expect(atual).toHaveCSS("text-decoration-line", "underline");
    const outro = page.getByRole("link", { name: /^Em risco/ });
    await expect(outro).not.toHaveCSS("text-decoration-line", "underline");

    await page.goto("/");
    const aba = page.getByRole("tab", { selected: true });
    await expect(aba).toHaveCSS("text-decoration-line", "underline");
    await expect(page.getByRole("tab", { selected: false }).first()).not.toHaveCSS("text-decoration-line", "underline");
  });
});

test.describe("abas na vertical (WAI-ARIA)", () => {
  test("a partir de 1024 px a lista de abas avisa que é vertical, e abaixo disso, horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByRole("tablist", { name: "Temas das perguntas" })).toHaveAttribute("aria-orientation", "vertical");
    await page.setViewportSize({ width: 800, height: 800 });
    await expect(page.getByRole("tablist", { name: "Temas das perguntas" })).toHaveAttribute("aria-orientation", "horizontal");
  });
});

test.describe("alvos de toque dos links soltos (2.5.8)", () => {
  test("os links que ficam sozinhos numa linha têm pelo menos 40 px de altura", async ({ page }) => {
    await page.goto("/");
    const soltos = [
      page.getByRole("link", { name: "Como funciona" }).filter({ visible: true }).first(),
      page.getByRole("link", { name: /Teste da aprovação/ }).first(),
      page.getByRole("link", { name: /Ler o relatório completo/ }),
      page.getByRole("contentinfo").getByRole("link", { name: "Entrar na demonstração" }),
      page.getByRole("contentinfo").getByRole("link", { name: "Ajuda" }),
      page.getByRole("contentinfo").getByRole("link", { name: /Código no GitHub/ }),
    ];
    for (const link of soltos) {
      await link.scrollIntoViewIfNeeded();
      const caixa = await link.boundingBox();
      expect(caixa?.height, await link.innerText()).toBeGreaterThanOrEqual(40);
    }
  });
});

test.describe("rotas que a jornada não visita", () => {
  test("a 404 tem título próprio, um h1 e o aviso de demonstração", async ({ page }) => {
    const resposta = await page.goto("/nao-existe");
    expect(resposta?.status()).toBe(404);
    await expect(page).toHaveTitle("Página não encontrada | PlantãoSeguro");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Não encontramos esta página");
    await expect(page.getByRole("region", { name: "Aviso de demonstração" })).toBeVisible();
  });

  for (const esquema of ["light", "dark"] as const) {
    test(`@a11y axe e estrutura em /ajuda, /telao, na 404 e em /entrar?papel= (${esquema === "light" ? "claro" : "escuro"})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      for (const rota of ["/ajuda", "/telao", "/nao-existe", "/entrar?papel=medico&de=%2Fmedico%2Fofertas"]) {
        await page.goto(rota);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await semViolacoesGraves(page, { boasPraticas: true });
      }
    });
  }

  test("@a11y axe e estrutura nas telas com filtro e em Ofertas do médico", async ({ page }) => {
    await entrarComoCoordenador(page);
    await expect(page.getByRole("heading", { level: 3 }).first()).toBeVisible({ timeout: 10_000 });
    await page.goto("/coordenador/vagas?status=risco");
    await expect(page.getByRole("status").filter({ hasText: "Mostrando 1 de 6" })).toBeVisible({ timeout: 10_000 });
    await semViolacoesGraves(page);
    await entrarComoMedico(page);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await semViolacoesGraves(page);
  });
});
