#!/usr/bin/env node
/**
 * Confere os contrastes das cores do PlantãoSeguro direto de `app/globals.css`.
 *
 * Texto: mínimo de 4,5:1 (WCAG 1.4.3); texto principal, 7:1 (meta do telão).
 * Componentes e contornos: mínimo de 3:1 (WCAG 1.4.11).
 * Também confere que o escuro do sistema e o escuro forçado (telão) têm os mesmos valores.
 * Sai com código 1 se algum par falhar.
 */
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

/** Devolve o conteúdo entre chaves do primeiro bloco que começa em `seletor`. */
function bloco(seletor) {
  const inicio = css.indexOf(seletor);
  if (inicio < 0) throw new Error(`Bloco não encontrado em globals.css: ${seletor}`);
  const abre = css.indexOf("{", inicio);
  let nivel = 0;
  for (let i = abre; i < css.length; i += 1) {
    if (css[i] === "{") nivel += 1;
    if (css[i] === "}") {
      nivel -= 1;
      if (nivel === 0) return css.slice(abre + 1, i);
    }
  }
  throw new Error(`Bloco sem fechamento: ${seletor}`);
}

function tokens(texto) {
  const saida = {};
  for (const m of texto.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    saida[m[1]] = m[2].toLowerCase();
  }
  return saida;
}

const claro = tokens(bloco(":root {"));
const escuroSistema = tokens(bloco("@media (prefers-color-scheme: dark)"));
const escuroForcado = tokens(bloco(':root[data-theme="dark"]'));

function luminancia(hex) {
  const n = Number.parseInt(hex.slice(1), 16);
  const canal = (c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
}

function razao(a, b) {
  const [claroLum, escuroLum] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claroLum + 0.05) / (escuroLum + 0.05);
}

// [primeiro plano, fundo, mínimo, o que é]
const TEXTO_PRINCIPAL = 7;
const TEXTO = 4.5;
const COMPONENTE = 3;
const pares = [
  ["tinta", "gaze", TEXTO_PRINCIPAL, "Texto principal sobre a página"],
  ["tinta", "papel", TEXTO_PRINCIPAL, "Texto principal sobre cartões"],
  ["tinta-suave", "gaze", TEXTO, "Texto secundário sobre a página"],
  ["tinta-suave", "papel", TEXTO, "Texto secundário sobre cartões"],
  ["ia", "papel", TEXTO, "Voz da IA: texto sobre papel"],
  ["ia", "gaze", TEXTO, "Voz da IA: texto sobre a página"],
  ["ia", "ia-tom", TEXTO, "Voz da IA: texto sobre o tom da IA"],
  ["ia-forte", "ia-tom", TEXTO, "Voz da IA: texto forte sobre o tom da IA"],
  ["humano", "papel", TEXTO, "Decisão humana: texto sobre papel"],
  ["humano", "gaze", TEXTO, "Decisão humana: texto sobre a página"],
  ["humano", "humano-tom", TEXTO, "Decisão humana: texto sobre o tom humano"],
  ["atencao", "atencao-tom", TEXTO, "Atenção: texto sobre o tom de atenção"],
  ["atencao", "papel", TEXTO, "Atenção: texto sobre papel"],
  ["erro", "erro-tom", TEXTO, "Erro: texto sobre o tom de erro"],
  ["erro", "papel", TEXTO, "Erro: texto sobre papel"],
  ["sobre-tinta", "tinta", TEXTO, "Botão primário (rótulo)"],
  ["sobre-humano", "humano", TEXTO, "Botão de decisão (rótulo)"],
  ["sobre-atencao", "atencao-fundo", TEXTO, "Preenchimento de atenção (rótulo)"],
  ["campo", "papel", COMPONENTE, "Borda de campo sobre papel"],
  ["campo", "gaze", COMPONENTE, "Borda de campo sobre a página"],
  ["ia", "papel", COMPONENTE, "Contorno tracejado da IA sobre papel"],
  ["ia", "gaze", COMPONENTE, "Contorno tracejado da IA sobre a página"],
  ["humano", "papel", COMPONENTE, "Contorno contínuo humano sobre papel"],
  ["humano", "gaze", COMPONENTE, "Contorno contínuo humano sobre a página"],
  ["foco", "papel", COMPONENTE, "Anel de foco sobre papel"],
  ["foco", "gaze", COMPONENTE, "Anel de foco sobre a página"],
];

let falhas = 0;

function conferir(nome, paleta) {
  console.log(`\n${nome}`);
  for (const [fg, bg, minimo, o] of pares) {
    if (!paleta[fg] || !paleta[bg]) {
      console.log(`  FALTA  token ausente em ${fg} ou ${bg}`);
      falhas += 1;
      continue;
    }
    const r = razao(paleta[fg], paleta[bg]);
    const ok = r >= minimo;
    if (!ok) falhas += 1;
    console.log(
      `  ${ok ? "ok    " : "FALHOU"} ${r.toFixed(2).padStart(5)}:1 (mín. ${minimo}:1)  ${o}`,
    );
  }
}

conferir("Tema claro", claro);
conferir("Tema escuro (telão e prefers-color-scheme)", escuroForcado);

console.log("\nEscuro do sistema igual ao escuro forçado?");
for (const [nome, valor] of Object.entries(escuroForcado)) {
  if (escuroSistema[nome] !== valor) {
    console.log(`  FALHOU --${nome}: sistema ${escuroSistema[nome]} e forçado ${valor}`);
    falhas += 1;
  }
}
if (falhas === 0) console.log("  ok");

console.log(
  `\nDivisor (decorativo, sem mínimo): claro ${razao(claro.divisor, claro.gaze).toFixed(2)}:1, escuro ${razao(escuroForcado.divisor, escuroForcado.gaze).toFixed(2)}:1`,
);

if (falhas > 0) {
  console.error(`\n${falhas} par(es) abaixo do mínimo.`);
  process.exit(1);
}
console.log("\nTodos os pares passaram.");
