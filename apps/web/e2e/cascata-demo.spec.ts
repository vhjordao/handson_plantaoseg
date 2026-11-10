import { expect, test, type Page } from "@playwright/test";
import { entrarComoCoordenador, semViolacoesGraves } from "./ajudantes";

/**
 * O plano B (4.6 e 5.4): o mesmo caminho da apresentação no modo de demonstração, sem servidor,
 * numa aba só. Quem apresenta aprova três nomes, faz o 1º deixar o prazo passar, entra como o 2º
 * e recusa, entra como o 3º e aceita, e volta à vaga para ver a cascata inteira.
 */

const VAGA = "/coordenador/vagas/vaga-demo-2";
const [PRIMEIRO, SEGUNDO, TERCEIRO] = [
  "Daniel Siqueira Pacheco",
  "Bruno Almeida Lacerda",
  "Mariana Ibarra Gomes",
] as const;

const cascata = (page: Page) => page.getByRole("region", { name: "Cascata de ofertas" });
const passo = (page: Page, nome: string) => cascata(page).getByRole("listitem").filter({ hasText: nome });

/** Entra como o médico que tem a oferta esperando: a porta já o mostra primeiro. */
async function entrarComoQuemTemOferta(page: Page, nome: string) {
  await page.goto("/entrar/demonstracao");
  const porta = page.getByRole("region", { name: "Médico" });
  await expect(porta.getByText(nome)).toBeVisible({ timeout: 10_000 });
  await expect(porta.getByText("Tem oferta esperando resposta")).toBeVisible();
  await porta.getByRole("button", { name: "Entrar como médico" }).click();
  await page.waitForURL("**/medico/ofertas");
}

test("plano B: o 1º deixa o prazo passar, o 2º recusa e o 3º aceita, e a vaga fecha", async ({ page }) => {
  await entrarComoCoordenador(page);
  await page.goto(VAGA);
  const caixas = page.getByRole("checkbox", { name: "Incluir na oferta" });
  await expect(caixas).toHaveCount(5, { timeout: 10_000 });
  for (const indice of [0, 1, 2]) await caixas.nth(indice).check();
  await page.getByRole("button", { name: "Aprovar e oferecer" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Aprovar e oferecer" }).click();

  // A primeira oferta sai com a decisão; os outros esperam na fila.
  await expect(passo(page, PRIMEIRO)).toContainText("Aberta", { timeout: 10_000 });
  await expect(passo(page, SEGUNDO)).toContainText("Na fila");
  await expect(passo(page, TERCEIRO)).toContainText("Na fila");
  await semViolacoesGraves(page);

  // No modo de demonstração, o prazo vence pelo comando de quem apresenta.
  await cascata(page).getByRole("button", { name: "Passar o prazo desta oferta" }).click();
  await expect(passo(page, PRIMEIRO)).toContainText("Expirada");
  await expect(passo(page, SEGUNDO)).toContainText("Aberta");

  // O 2º recusa, com o motivo.
  await entrarComoQuemTemOferta(page, SEGUNDO);
  const oferta = page.getByRole("article").first();
  await expect(oferta.getByText("Por que você")).toBeVisible();
  await semViolacoesGraves(page);
  await oferta.getByRole("button", { name: "Recusar" }).click();
  const recusa = page.getByRole("dialog", { name: "Recusar este plantão?" });
  await recusa.getByRole("radio", { name: "Cansaço" }).check();
  await recusa.getByRole("button", { name: "Sim, recusar" }).click();
  await expect(page.getByText("Você recusou. A oferta seguiu para o próximo nome.")).toBeVisible();

  // O 3º aceita.
  await entrarComoQuemTemOferta(page, TERCEIRO);
  await page.getByRole("button", { name: "Aceitar o plantão" }).click();
  await page.getByRole("dialog", { name: "Aceitar este plantão?" }).getByRole("button", { name: "Sim, aceitar" }).click();
  await expect(page.getByText("Você aceitou o plantão. A coordenação já está vendo.")).toBeVisible();

  // O coordenador vê a cascata inteira e a vaga preenchida.
  await entrarComoCoordenador(page);
  await page.goto(VAGA);
  await expect(passo(page, PRIMEIRO)).toContainText("Expirada", { timeout: 10_000 });
  await expect(passo(page, SEGUNDO)).toContainText(/Recusada.*motivo: cansaço/);
  await expect(passo(page, TERCEIRO)).toContainText("Aceita");
  await expect(cascata(page).getByRole("status")).toHaveText(`${TERCEIRO} aceitou. A vaga está preenchida.`);
  await expect(page.getByText(new RegExp(`^Aceita por ${TERCEIRO}`))).toBeVisible();
  await expect(cascata(page).getByRole("button", { name: "Passar o prazo desta oferta" })).toHaveCount(0);
});
