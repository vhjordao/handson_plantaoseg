import { expect, test, type Page } from "@playwright/test";
import { entrarComoCoordenador, semViolacoesGraves } from "./ajudantes";

/**
 * A jornada do coordenador: do pedido em texto livre à decisão. O que importa aqui é o que a
 * tela promete: nada avança sem a confirmação da pessoa, o campo que falta vira pergunta, quem tem
 * alerta exige justificativa e a decisão fecha o tracejado.
 */

const VAGA_COM_ALERTA = "/coordenador/vagas/vaga-demo-1";
const VAGA_SEM_ALERTA = "/coordenador/vagas/vaga-demo-2";

async function abrirNovaVaga(page: Page) {
  await entrarComoCoordenador(page);
  await page.goto("/coordenador/vagas/nova");
  await expect(page.getByRole("heading", { level: 1, name: "Nova vaga" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Formal", exact: true })).toBeVisible({ timeout: 10_000 });
}

async function abrirVaga(page: Page, rota: string) {
  await entrarComoCoordenador(page);
  await page.goto(rota);
  await expect(page.getByRole("region", { name: /Ordem sugerida/ })).toBeVisible({ timeout: 10_000 });
}

const cartao = (page: Page, nome: string | RegExp) => page.getByRole("listitem").filter({ hasText: nome });
const dialogo = (page: Page) => page.getByRole("dialog");
const aprovar = (page: Page) => page.getByRole("button", { name: "Aprovar e oferecer" });
const ordem = (page: Page) => page.getByRole("region", { name: /Ordem sugerida/ });

test.describe("do pedido à decisão", () => {
  test("escreve, confere, publica, escolhe dois nomes e aprova: o tracejado fecha e o selo assenta", async ({ page }) => {
    await abrirNovaVaga(page);

    await page.getByRole("button", { name: "Formal", exact: true }).click();
    await expect(page.getByLabel("O pedido")).toHaveValue(/pediatra para o plantão diurno de sábado/);
    await page.getByRole("button", { name: "Ler a vaga" }).click();

    const conferir = page.getByRole("heading", { name: "Confira o que foi lido" });
    await expect(conferir).toBeFocused();
    await expect(page.getByText("Leitura por regras")).toBeVisible();
    await expect(page.getByLabel("Hospital", { exact: true })).toHaveValue("1f99fc83-4521-4a6f-a274-8d16430f55e4");
    await expect(page.getByLabel("Especialidade", { exact: true })).toHaveValue("pediatria");
    await expect(page.getByLabel("Início", { exact: true })).toHaveValue("2026-10-03T07:00");
    await expect(page.getByLabel("Fim", { exact: true })).toHaveValue("2026-10-03T19:00");
    await expect(page.getByLabel("Urgência", { exact: true })).toHaveValue("low");
    await expect(page.getByText("Sem a sua confirmação, nada avança.")).toBeVisible();

    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page).toHaveURL(/\/coordenador\/vagas\/vaga-[0-9a-f]{12}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Pediatria" })).toBeVisible();
    await expect(ordem(page)).toHaveAttribute("data-voz", "ia");

    // Nenhum nome vem marcado, e sem marcar não dá para aprovar.
    const caixas = page.getByRole("checkbox", { name: "Incluir na oferta" });
    await expect(caixas).toHaveCount(5);
    for (const caixa of await caixas.all()) await expect(caixa).not.toBeChecked();
    await expect(aprovar(page)).toBeDisabled();
    await expect(page.getByText("Marque pelo menos um nome para aprovar.")).toBeVisible();

    await caixas.nth(0).check();
    await caixas.nth(1).check();
    await expect(page.getByText("2 nomes escolhidos. A oferta segue esta ordem.")).toBeVisible();
    await aprovar(page).click();

    // O diálogo mostra o que vai acontecer, e o botão de confirmar não recebe o foco.
    await expect(dialogo(page)).toBeVisible();
    await expect(dialogo(page).getByRole("heading", { name: "Confira antes de aprovar" })).toBeFocused();
    await expect(dialogo(page).getByRole("listitem")).toHaveCount(2);
    await expect(dialogo(page).getByText(/com 60 min para responder/)).toBeVisible();
    await expect(dialogo(page).getByText(/a cascata é simulada/)).toBeVisible();
    await dialogo(page).getByRole("button", { name: "Aprovar e oferecer" }).click();

    await expect(dialogo(page)).toBeHidden();
    await expect(ordem(page)).toHaveAttribute("data-voz", "humano");
    await expect(page.getByText(/Decidido por Marina Alves, coordenação de escala, 9h/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Ordem sugerida/ })).toBeFocused();
    await expect(page.getByText("Aprovado, 1º a receber a oferta")).toBeVisible();
    await expect(page.getByText("Aprovado, 2º a receber a oferta")).toBeVisible();
    await expect(page.getByText("Não recebe a oferta")).toHaveCount(3);
    await expect(page.getByRole("checkbox")).toHaveCount(0);

    // A decisão continua lá depois de recarregar, sem repetir o movimento.
    await page.reload();
    await expect(page.getByText(/Decidido por Marina Alves/)).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".assentar")).toHaveCount(0);
    await expect(page.getByRole("checkbox")).toHaveCount(0);

    await page.goto("/coordenador/vagas?status=andamento");
    await expect(page.getByRole("status").filter({ hasText: "Mostrando 3 de 7" })).toBeVisible({ timeout: 10_000 });
  });

  test("quem tem alerta de jornada exige justificativa, e a exceção fica registrada", async ({ page }) => {
    await abrirVaga(page, VAGA_COM_ALERTA);
    await expect(page.getByText(/Chances parecidas \(66% a 69%\)/)).toBeVisible();

    const ana = cartao(page, "Ana Ramos Tavares");
    await expect(ana.getByText("Alerta de jornada")).toBeVisible();
    await expect(ana.getByText(/carga recente alta: 9 plantões/)).toBeVisible();
    await ana.getByRole("checkbox").check();
    await aprovar(page).click();

    const confirmar = dialogo(page).getByRole("button", { name: "Aprovar e oferecer" });
    const campo = dialogo(page).getByLabel("Justificativa da exceção");
    await confirmar.click();
    await expect(dialogo(page).getByText(/com pelo menos 10 caracteres/)).toBeVisible();
    await expect(campo).toBeFocused();
    await expect(campo).toHaveAttribute("aria-invalid", "true");

    await campo.fill("Conferi a escala: a carga cabe nesta semana.");
    await confirmar.click();

    await expect(ordem(page)).toHaveAttribute("data-voz", "humano");
    await expect(page.getByText("Exceção registrada")).toBeVisible();
    await expect(page.getByText(/Conferi a escala: a carga cabe nesta semana\./)).toBeVisible();
  });

  test("Alterar volta para a lista, e a justificativa escrita não se perde", async ({ page }) => {
    await abrirVaga(page, VAGA_COM_ALERTA);
    await cartao(page, "Ana Ramos Tavares").getByRole("checkbox").check();
    await aprovar(page).click();
    await dialogo(page).getByLabel("Justificativa da exceção").fill("Rascunho da justificativa");

    await dialogo(page).getByRole("button", { name: "Alterar" }).click();
    await expect(dialogo(page)).toBeHidden();
    await expect(page.getByRole("heading", { name: /Ordem sugerida/ })).toBeFocused();
    await expect(ordem(page)).toHaveAttribute("data-voz", "ia");

    await aprovar(page).click();
    await expect(dialogo(page).getByLabel("Justificativa da exceção")).toHaveValue("Rascunho da justificativa");
  });

  test("sem alerta, o diálogo não pede justificativa", async ({ page }) => {
    await abrirVaga(page, VAGA_SEM_ALERTA);
    await page.getByRole("checkbox", { name: "Incluir na oferta" }).first().check();
    await aprovar(page).click();
    await expect(dialogo(page).getByLabel("Justificativa da exceção")).toHaveCount(0);
  });

  test("só com o teclado: Enter ao abrir o diálogo não aprova, e Esc devolve o foco ao botão", async ({ page, isMobile }) => {
    test.skip(isMobile, "o teclado não se aplica ao celular");
    await abrirVaga(page, VAGA_SEM_ALERTA);
    await page.getByRole("checkbox", { name: "Incluir na oferta" }).first().focus();
    await page.keyboard.press("Space");
    await expect(page.getByRole("checkbox", { name: "Incluir na oferta" }).first()).toBeChecked();

    await aprovar(page).focus();
    await page.keyboard.press("Enter");
    await expect(dialogo(page)).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialogo(page)).toBeVisible(); // quem aperta Enter sem ler não aprova ninguém

    await page.keyboard.press("Escape");
    await expect(dialogo(page)).toBeHidden();
    await expect(aprovar(page)).toBeFocused();
    await expect(ordem(page)).toHaveAttribute("data-voz", "ia");
  });
});

test.describe("pular é sempre possível e sem culpa", () => {
  test("pula, continua marcado depois de recarregar, sai da seleção, e dá para desfazer", async ({ page }) => {
    await abrirVaga(page, VAGA_SEM_ALERTA);
    const nome = await page.getByRole("heading", { level: 3 }).first().innerText();
    const pessoa = nome.replace(/^1\.\s*/, "");
    const item = cartao(page, pessoa);

    await item.getByRole("checkbox").check();
    await expect(aprovar(page)).toBeEnabled();
    await item.getByRole("button", { name: "Pular" }).click();

    await expect(item.getByText("Você pulou este nome.")).toBeVisible();
    await expect(item.getByRole("button", { name: "Desfazer" })).toBeFocused();
    await expect(aprovar(page)).toBeDisabled(); // quem foi pulado sai da seleção

    await page.reload();
    await expect(cartao(page, pessoa).getByText("Você pulou este nome.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("checkbox")).toHaveCount(4);

    await cartao(page, pessoa).getByRole("button", { name: "Desfazer" }).click();
    await expect(cartao(page, pessoa).getByRole("button", { name: "Pular" })).toBeFocused();
    await expect(page.getByRole("checkbox")).toHaveCount(5);
  });

  test("quem pulou todos os nomes é avisado e não consegue aprovar", async ({ page }) => {
    await abrirVaga(page, VAGA_SEM_ALERTA);
    for (let restantes = 5; restantes > 0; restantes -= 1) {
      await page.getByRole("button", { name: "Pular" }).first().click();
      await expect(page.getByRole("button", { name: "Pular" })).toHaveCount(restantes - 1);
    }
    await expect(page.getByText("Você pulou todos os nomes. Desfaça um pulo para aprovar.")).toBeVisible();
    await expect(aprovar(page)).toBeDisabled();
  });
});

test.describe("por que este nome, e por que os outros não", () => {
  test("Ver motivos abre o número, o que pesou, o que não entra e a ficha do modelo", async ({ page }) => {
    await abrirVaga(page, VAGA_COM_ALERTA);
    const ana = cartao(page, "Ana Ramos Tavares").first();
    await expect(ana.getByText("Chance estimada de aceitar")).toHaveCount(0);

    await ana.getByRole("button", { name: "Ver motivos" }).click();
    await expect(ana.getByText("Chance estimada de aceitar: 66% (simulação).")).toBeVisible();
    await expect(ana.getByText("Distância até o hospital")).toBeVisible();
    await expect(ana.getByText("1,4 km", { exact: true })).toBeVisible();
    await expect(ana.getByText("Valor do plantão e pagamento")).toBeVisible();

    await ana.getByRole("button", { name: "Ver a ficha do modelo" }).click();
    await expect(dialogo(page).getByRole("heading", { name: "Ficha do modelo" })).toBeVisible();
    await expect(dialogo(page).getByText("O Gemini só foi testado à parte, com textos sintéticos.")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialogo(page)).toBeHidden();
  });

  test("Esta explicação ajudou? diz o que acontece com a resposta", async ({ page }) => {
    await abrirVaga(page, VAGA_COM_ALERTA);
    const ana = cartao(page, "Ana Ramos Tavares").first();
    await ana.getByRole("button", { name: "Ver motivos" }).click();
    await ana.getByRole("button", { name: "Não", exact: true }).click();
    await ana.getByLabel("O que faltou? (opcional)").fill("Faltou dizer quando foi o último plantão.");
    await ana.getByRole("button", { name: "Enviar" }).click();
    await expect(ana.getByText("Fica registrado para revisão. Não treina o modelo agora.")).toBeVisible();
  });

  test("Quem ficou de fora mostra a regra e a evidência, com pseudônimo", async ({ page }) => {
    await abrirVaga(page, VAGA_COM_ALERTA);
    const fora = page.getByRole("region", { name: "Quem ficou de fora" });
    await expect(fora.getByText(/235 de 300 médicos barrados por regras fixas, sem IA/)).toBeVisible();
    await fora.getByRole("button", { name: /Fora do raio/ }).click();
    await expect(fora.getByText(/^Médico [0-9a-f]{8}:/).first()).toBeVisible();
    await expect(fora.getByText(/km/).first()).toBeVisible();
  });
});

test.describe("os estados da leitura", () => {
  test("texto com tentativa de injeção é sinalizado e o campo é lido mesmo assim", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Com tentativa de injeção" }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await expect(page.getByText("Este texto traz instruções para o sistema")).toBeVisible();
    await expect(page.getByText("pede para ignorar as regras")).toBeVisible();
    await expect(page.getByLabel("Especialidade", { exact: true })).toHaveValue("clinica_medica");
  });

  test("vaga ambígua: o campo que falta vira pergunta, e a tela não deixa seguir sem resposta", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Ambíguo" }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();

    const pergunta = page.getByLabel("Qual é a especialidade?");
    await expect(pergunta).toHaveValue("");
    await expect(page.getByText("Não está no texto").first()).toBeVisible();

    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("link", { name: "Escolha a especialidade." })).toBeVisible();
    await expect(page).toHaveURL(/\/coordenador\/vagas\/nova$/);

    await page.getByRole("link", { name: "Escolha a especialidade." }).click();
    await expect(pergunta).toBeFocused();
    await pergunta.selectOption("pediatria");
    await expect(page.getByText("Preenchido por você")).toBeVisible();
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Pediatria" })).toBeVisible();
  });

  test("falha da leitura: o formulário rápido aparece, sem culpar ninguém", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Simular falha da leitura" }).click();
    await expect(page.getByText("Não conseguimos ler a vaga com a IA. Preencha os campos abaixo.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Preencha os campos" })).toBeFocused();
    await expect(page.getByLabel("Hospital", { exact: true })).toHaveValue("");

    await page.getByLabel("Hospital", { exact: true }).selectOption({ label: "Hospital Modelo Norte" });
    await page.getByLabel("Especialidade", { exact: true }).selectOption("clinica_medica");
    await page.getByLabel("Início", { exact: true }).fill("2026-10-03T19:00");
    await page.getByLabel("Fim", { exact: true }).fill("2026-10-04T07:00");
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Clínica médica" })).toBeVisible();
  });

  test("pedido em branco e texto que mudou depois da leitura são barrados, com o motivo", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await expect(page.getByRole("link", { name: "Escreva o pedido antes de ler a vaga." })).toBeVisible();

    await page.getByRole("button", { name: "Formal", exact: true }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await expect(page.getByRole("heading", { name: "Confira o que foi lido" })).toBeVisible();
    await page.getByLabel("O pedido").fill("Outro pedido, escrito depois.");
    await expect(page.getByText(/Você mudou o texto depois da leitura/)).toBeVisible();
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("link", { name: /O texto mudou depois da leitura/ })).toBeVisible();
    await expect(page).toHaveURL(/\/coordenador\/vagas\/nova$/);
  });

  test("corrigir um campo passa à voz humana", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Formal", exact: true }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await page.getByLabel("Urgência", { exact: true }).selectOption("high");
    await expect(page.getByText("Corrigido por você")).toBeVisible();
  });

  test("fora da grade da demonstração, o erro diz o que dá para publicar", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Formal", exact: true }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await page.getByLabel("Início", { exact: true }).fill("2026-10-03T08:00");
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("link", { name: /as sugestões existem para plantões de 12 h/ })).toBeVisible();
    await expect(page.getByLabel("Início", { exact: true })).toHaveAttribute("aria-invalid", "true");
  });

  test("fim antes do início é barrado sem chamar a publicação", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Preencher os campos à mão" }).click();
    await page.getByLabel("Hospital", { exact: true }).selectOption({ label: "Hospital Modelo Centro" });
    await page.getByLabel("Especialidade", { exact: true }).selectOption("pediatria");
    await page.getByLabel("Início", { exact: true }).fill("2026-10-03T19:00");
    await page.getByLabel("Fim", { exact: true }).fill("2026-10-03T07:00");
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("link", { name: "O fim do plantão precisa ser depois do início." })).toBeVisible();
  });
});

test.describe("os outros estados da vaga", () => {
  test("publicar a mesma janela abre a vaga que existe, e a tela avisa", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByLabel("O pedido").fill(
      "Preciso de um pediatra para o plantão noturno de sexta, 19h às 7h, Hospital Modelo Centro, urgência alta",
    );
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page).toHaveURL(/vaga-demo-1\?existente=1$/);
    await expect(page.getByText("Esta janela já tinha uma vaga. Abrimos a que existe, sem criar outra.")).toBeVisible();
  });

  test("o rascunho continua do texto dele e, ao ser publicado, sai da lista", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/coordenador/vagas?status=rascunhos");
    await page.getByRole("link", { name: "Continuar a vaga" }).click();
    await expect(page).toHaveURL(/\/coordenador\/vagas\/nova\?rascunho=vaga-demo-5$/);
    await expect(page.getByLabel("O pedido")).toHaveValue(/médico clínico urgente/, { timeout: 10_000 });

    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await page.getByLabel("Em qual hospital é o plantão?").selectOption({ label: "Hospital Modelo Centro" });
    await page.getByLabel("Quando o plantão começa?").fill("2026-10-03T19:00");
    await page.getByLabel("Quando o plantão termina?").fill("2026-10-04T07:00");
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Clínica médica" })).toBeVisible();

    await page.goto("/coordenador/vagas?status=rascunhos");
    await expect(page.getByRole("heading", { name: "Nenhuma vaga neste filtro" })).toBeVisible({ timeout: 10_000 });
  });

  test("o rascunho aberto direto convida a continuar", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/coordenador/vagas/vaga-demo-5");
    await expect(page.getByRole("heading", { name: "Esta vaga ainda é um rascunho" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Continuar a vaga" })).toHaveAttribute(
      "href",
      "/coordenador/vagas/nova?rascunho=vaga-demo-5",
    );
  });

  test("sem ninguém elegível, a tela explica e mostra quem as regras barraram", async ({ page }) => {
    await abrirNovaVaga(page);
    await page.getByRole("button", { name: "Preencher os campos à mão" }).click();
    await page.getByLabel("Hospital", { exact: true }).selectOption({ label: "Hospital Modelo Centro" });
    await page.getByLabel("Especialidade", { exact: true }).selectOption("pediatria");
    await page.getByLabel("Início", { exact: true }).fill("2026-10-02T07:00");
    await page.getByLabel("Fim", { exact: true }).fill("2026-10-02T19:00");
    await page.getByRole("button", { name: "Confirmar e ver as sugestões" }).click();
    await expect(page.getByRole("heading", { name: "Nenhum médico passou nas regras" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("region", { name: "Quem ficou de fora" })).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(aprovar(page)).toHaveCount(0);
  });

  test("a vaga com oferta em andamento mostra a decisão, sem deixar decidir de novo", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/coordenador/vagas/vaga-demo-3");
    await expect(ordem(page)).toHaveAttribute("data-voz", "humano", { timeout: 10_000 });
    await expect(page.getByText(/Decidido por/)).toBeVisible();
    await expect(page.getByText("Oferta em andamento", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("checkbox")).toHaveCount(0);
    await expect(aprovar(page)).toHaveCount(0);
  });

  test("a vaga preenchida diz quem aceitou, em simulação", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/coordenador/vagas/vaga-demo-4");
    await expect(page.getByText(/^Aceita por .* \(simulado\)\.$/)).toBeVisible({ timeout: 10_000 });
  });

  test("uma vaga que não existe não deixa a pessoa sem saída", async ({ page }) => {
    await entrarComoCoordenador(page);
    await page.goto("/coordenador/vagas/nao-existe");
    await expect(page.getByRole("heading", { level: 1, name: "Não encontramos esta vaga" })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: "Voltar para as vagas" })).toBeVisible();
  });
});

test.describe("acessibilidade das telas do coordenador", () => {
  for (const esquema of ["light", "dark"] as const) {
    const nome = esquema === "light" ? "claro" : "escuro";

    test(`@a11y axe na conferência da nova vaga (${nome})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await abrirNovaVaga(page);
      await semViolacoesGraves(page, { boasPraticas: true });
      await page.getByRole("button", { name: "Com tentativa de injeção" }).click();
      await page.getByRole("button", { name: "Ler a vaga" }).click();
      await page.getByLabel("Urgência", { exact: true }).selectOption("high");
      await expect(page.getByText("Corrigido por você")).toBeVisible();
      await semViolacoesGraves(page, { boasPraticas: true });
    });

    test(`@a11y axe nas sugestões, nos motivos, no diálogo e depois da decisão (${nome})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: esquema });
      await abrirVaga(page, VAGA_COM_ALERTA);
      await semViolacoesGraves(page, { boasPraticas: true });

      const ana = cartao(page, "Ana Ramos Tavares").first();
      await ana.getByRole("button", { name: "Ver motivos" }).click();
      await page.getByRole("region", { name: "Quem ficou de fora" }).getByRole("button", { name: /Fora do raio/ }).click();
      await semViolacoesGraves(page, { boasPraticas: true });

      await ana.getByRole("checkbox").check();
      await aprovar(page).click();
      await expect(dialogo(page)).toBeVisible();
      await semViolacoesGraves(page);

      await dialogo(page).getByLabel("Justificativa da exceção").fill("Conferi a escala desta semana.");
      await dialogo(page).getByRole("button", { name: "Aprovar e oferecer" }).click();
      await expect(ordem(page)).toHaveAttribute("data-voz", "humano");
      // O fim da transição do contorno: o axe mediria as cores no meio da mudança.
      await page.waitForTimeout(600);
      await semViolacoesGraves(page, { boasPraticas: true });
    });
  }

  test("a 320 px, nada passa da largura da tela, nem com os motivos abertos", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const contexto = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await contexto.newPage();
    const rolagem = () =>
      page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

    await abrirVaga(page, VAGA_COM_ALERTA);
    await cartao(page, "Ana Ramos Tavares").first().getByRole("button", { name: "Ver motivos" }).click();
    expect(await rolagem()).toBeLessThanOrEqual(0);
    await cartao(page, "Ana Ramos Tavares").first().getByRole("checkbox").check();
    await aprovar(page).click();
    await expect(dialogo(page)).toBeVisible();
    expect(await rolagem()).toBeLessThanOrEqual(0);

    await page.goto("/coordenador/vagas/nova");
    await page.getByRole("button", { name: "Com tentativa de injeção" }).click();
    await page.getByRole("button", { name: "Ler a vaga" }).click();
    await expect(page.getByRole("heading", { name: "Confira o que foi lido" })).toBeVisible();
    expect(await rolagem()).toBeLessThanOrEqual(0);
    await contexto.close();
  });

  test("com a letra a 200%, as telas quebram a linha em vez de passar da tela", async ({ browser, isMobile }) => {
    test.skip(isMobile, "o teste cria o próprio tamanho de tela e roda uma vez só");
    const contexto = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await contexto.newPage();
    await page.addInitScript(() => {
      document.addEventListener("DOMContentLoaded", () => {
        document.documentElement.style.fontSize = "200%";
      });
    });
    await abrirVaga(page, VAGA_COM_ALERTA);
    const rolagem = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(rolagem).toBeLessThanOrEqual(0);
    await contexto.close();
  });
});
