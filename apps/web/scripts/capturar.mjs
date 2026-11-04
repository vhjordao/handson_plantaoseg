#!/usr/bin/env node
/**
 * Tira capturas de uma rota para a autocrítica visual e para `docs/design/capturas/`.
 *
 * Uso (com o servidor rodando):
 *   node scripts/capturar.mjs /entrar --saida ../../docs/design/capturas --nome entrar
 *   node scripts/capturar.mjs / --largura 390 --altura 844 --escuro --secoes
 *
 * Opções: --largura, --altura, --escuro, --secoes (uma imagem por <section> e <header>),
 * --espera (ms), --porta, --canal (padrão msedge; vazio usa o Chromium do Playwright) e
 * --sessao coordenador|medico (entra com a primeira persona do papel, para telas protegidas).
 */
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const args = process.argv.slice(2);
// A rota é o primeiro argumento que não é opção. No Git Bash do Windows, "/entrar" chega como
// "C:/Program Files/Git/entrar" (conversão de caminho do MSYS); aqui isso é desfeito.
const primeiro = args.find((a) => !a.startsWith("--")) ?? "/";
const rota = primeiro.replace(/^[A-Za-z]:[\/]Program Files[\/]Git/i, "").replaceAll("\\", "/") || "/";
const opcao = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : padrao;
};
const bandeira = (nome) => args.includes(`--${nome}`);

const largura = Number(opcao("largura", 1440));
const altura = Number(opcao("altura", 900));
const escuro = bandeira("escuro");
const espera = Number(opcao("espera", 4500));
const porta = opcao("porta", "3100");
const canal = opcao("canal", "msedge");
const saida = opcao("saida", process.env.TEMP ?? ".");
const nome =
  opcao("nome", rota === "/" ? "landing" : rota.replaceAll("/", "-").replace(/^-/, "")) +
  `-${largura}${escuro ? "-escuro" : ""}`;

mkdirSync(saida, { recursive: true });

const navegador = await chromium.launch(canal ? { channel: canal } : {});
const contexto = await navegador.newContext({
  viewport: { width: largura, height: altura },
  colorScheme: escuro ? "dark" : "light",
  locale: "pt-BR",
  timezoneId: "America/Sao_Paulo",
  deviceScaleFactor: 1,
  hasTouch: largura < 768,
});
const papelDaSessao = opcao("sessao", "");
if (papelDaSessao) {
  const mundo = JSON.parse(readFileSync(new URL("../lib/demo/mundo.json", import.meta.url), "utf8"));
  const persona = mundo.personas.find((p) => p.papel === papelDaSessao);
  if (!persona) throw new Error(`Sem persona para o papel ${papelDaSessao}`);
  await contexto.addCookies([
    {
      name: "ps_sessao",
      value: encodeURIComponent(JSON.stringify({ papel: papelDaSessao, personaId: persona.id })),
      url: `http://localhost:${porta}`,
    },
  ]);
}
const pagina = await contexto.newPage();
const erros = [];
pagina.on("console", (m) => m.type() === "error" && erros.push(m.text()));
await pagina.goto(`http://localhost:${porta}${rota}`, { waitUntil: "networkidle" });
await pagina.waitForTimeout(espera);

await pagina.screenshot({ path: join(saida, `${nome}-topo.png`) });
console.log(`${nome}-topo.png`);

if (bandeira("secoes")) {
  const secoes = await pagina.locator("main > section, main > div > section, footer").all();
  let n = 1;
  for (const secao of secoes) {
    const arquivo = `${nome}-${String(n).padStart(2, "0")}.png`;
    await secao.scrollIntoViewIfNeeded();
    await pagina.waitForTimeout(200);
    await secao.screenshot({ path: join(saida, arquivo) });
    console.log(arquivo);
    n += 1;
  }
}

const rolagemHorizontal = await pagina.evaluate(
  () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
);
console.log(`rolagem horizontal: ${rolagemHorizontal ? "SIM (problema)" : "não"}`);
if (erros.length) console.log("erros no console:", erros.slice(0, 5));

await navegador.close();
