import { expect, test, type Page } from "@playwright/test";
import { entrarComoCoordenador, semViolacoesGraves } from "./ajudantes";

/**
 * Fase D (6.1 a 6.3) no modo de demonstração, numa aba só: o médico contesta, o coordenador
 * responde, a auditoria registra e confere a cadeia, e a equidade mostra as medidas rotuladas.
 */

const VAGA = "/coordenador/vagas/vaga-demo-2";
const MEDICO = "Daniel Siqueira Pacheco";

async function aprovarOPrimeiro(page: Page) {
  await entrarComoCoordenador(page);
  await page.goto(VAGA);
  const caixas = page.getByRole("checkbox", { name: "Incluir na oferta" });
  await expect(caixas).toHaveCount(5, { timeout: 10_000 });
  await caixas.first().check();
  await page.getByRole("button", { name: "Aprovar e oferecer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar e oferecer" }).click();
  await expect(page.getByRole("region", { name: "Cascata de ofertas" })).toBeVisible({ timeout: 10_000 });
}

async function entrarComoOMedico(page: Page) {
  await page.goto("/entrar/demonstracao");
  const porta = page.getByRole("region", { name: "Médico" });
  await expect(porta.getByText(MEDICO)).toBeVisible({ timeout: 10_000 });
  await porta.getByRole("button", { name: "Entrar como médico" }).click();
  await page.waitForURL(/\/medico$/);
}

test("o médico contesta, o coordenador responde, e a trilha registra e confere", async ({ page }) => {
  await aprovarOPrimeiro(page);

  // O médico contesta a recomendação.
  await entrarComoOMedico(page);
  await page.goto("/medico/ofertas");
  const oferta = page.getByRole("article").first();
  await oferta.getByRole("button", { name: "Contestar a recomendação" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByRole("radio", { name: "O motivo não faz sentido" }).check();
  await dialogo.getByLabel("Explique em poucas palavras").fill("A distância citada não bate com o meu endereço.");
  await dialogo.getByRole("button", { name: "Enviar a contestação" }).click();
  await expect(page.getByText(/Contestação enviada, protocolo/)).toBeVisible({ timeout: 10_000 });

  // O coordenador encontra o pedido na caixa e responde.
  await entrarComoCoordenador(page);
  await page.goto("/coordenador/contestacoes");
  const caixa = page.getByRole("article").filter({ hasText: "O motivo não faz sentido" });
  await expect(caixa).toBeVisible({ timeout: 10_000 });
  await expect(caixa.getByText("A distância citada não bate com o meu endereço.")).toBeVisible();
  await expect(caixa.getByText(/na ordem sugerida/)).toBeVisible();
  await caixa.getByLabel("Sua resposta").fill("Conferimos: a distância vem do endereço cadastrado. Vamos revisar.");
  await caixa.getByRole("button", { name: "Enviar resposta" }).click();
  await page.getByRole("link", { name: /^Respondidas/ }).click();
  const respondida = page.getByRole("article").filter({ hasText: "O motivo não faz sentido" });
  await expect(respondida.getByText("Resposta da coordenação")).toBeVisible({ timeout: 10_000 });
  await semViolacoesGraves(page);

  // A auditoria mostra a resposta, confere a cadeia e exporta o CSV.
  await page.goto("/coordenador/auditoria");
  await expect(page.getByText("Contestação respondida").filter({ visible: true }).first()).toBeVisible({ timeout: 10_000 });
  await page.getByRole("button", { name: "Verificar a cadeia" }).click();
  await expect(page.getByText("A cadeia confere")).toBeVisible({ timeout: 10_000 });
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Exportar CSV" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("auditoria-plantaoseguro.csv");
  await semViolacoesGraves(page);

  // O médico vê a resposta.
  await entrarComoOMedico(page);
  await page.goto("/medico/contestacoes");
  await expect(page.getByText("Conferimos: a distância vem do endereço cadastrado. Vamos revisar.")).toBeVisible({
    timeout: 10_000,
  });
});

test("a auditoria filtra por vaga, pelo endereço", async ({ page }) => {
  await entrarComoCoordenador(page);
  await page.goto("/coordenador/auditoria");
  await expect(page.getByText(/Mostrando os \d+ registros mais recentes/)).toBeVisible({ timeout: 10_000 });
  const vaga = page.getByLabel("Vaga");
  const opcao = await vaga.locator("option").nth(1).getAttribute("value");
  await vaga.selectOption(opcao ?? "");
  await expect(page).toHaveURL(new RegExp(`vaga=${opcao}`));
  await expect(page.getByText(/registros desta vaga/)).toBeVisible({ timeout: 10_000 });
});

test("a equidade mostra as medidas rotuladas e a contagem do sistema", async ({ page }) => {
  await entrarComoCoordenador(page);
  await page.goto("/coordenador/equidade");
  await expect(page.getByRole("heading", { level: 1, name: "Equidade" })).toBeVisible();
  await expect(page.getByText("Medidas em dados sintéticos").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Concentração das ofertas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Disparidade por grupo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ofertas feitas neste sistema" })).toBeVisible();
  await expect(page.getByText(/das ofertas foram para os 10% mais ofertados/)).toBeVisible({ timeout: 10_000 });
  await semViolacoesGraves(page);
});
