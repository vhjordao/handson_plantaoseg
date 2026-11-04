/**
 * Tira nome, CRM, telefone, e-mail e número de documento dos textos livres que a demonstração
 * guarda (a justificativa de uma exceção e o motivo de pular um nome, que vão para a trilha de
 * auditoria, e o comentário sobre uma explicação, que fica na sessão). A trilha só guarda
 * pseudônimos; como a pessoa pode digitar qualquer coisa, o texto passa por aqui antes de ser
 * gravado.
 *
 * É uma barreira de melhor esforço, não uma garantia: pega os nomes da demonstração, CRM, e-mail
 * e os formatos brasileiros de telefone e documento. Prefere apagar a mais a deixar passar: um
 * número comprido que não seja telefone também some. O aviso "Não digite dados reais" continua
 * valendo na tela.
 */
import { normalizar } from "./leitura";

export const MARCA_NOME = "[nome removido]";
export const MARCA_CRM = "[CRM removido]";
export const MARCA_TELEFONE = "[telefone removido]";
export const MARCA_EMAIL = "[e-mail removido]";
export const MARCA_NUMERO = "[número removido]";

const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)+/gu;

/** CPF (000.000.000-00) e CNPJ (00.000.000/0000-00), com a pontuação. */
const CPF_CNPJ = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/gu;

/**
 * "CRM 123456", "CRM-SP 123.456", "CRM/SP: 123456-SP", "CRM nº 123456" e o pseudo-CRM das
 * personas ("SIM-SP-014"). A UF depois do número só entra se vier colada por "/" ou "-", para
 * não apagar uma palavra de duas letras ("de") que venha depois.
 */
const CRM =
  /\b(?:SIM-[A-Z]{2}-\d{3,}|CRM[\s:/.-]*(?:[A-Z]{2}\b[\s:/.-]*)?(?:n[º°o]?\.?\s*)?\d[\d.]*\d(?:[/-][A-Z]{2}\b)?)/giu;

/**
 * Telefone com DDD (e +55) opcionais, mais o de 8 ou 9 dígitos sem DDD ("99999-8888"). Um
 * intervalo de anos ("2025-2026") não conta como telefone.
 */
const TELEFONE =
  /(?:\+?55[\s-]?)?\(?\b\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}\b|\b(?!(?:19|20)\d{2}[\s-](?:19|20)\d{2}\b)\d{4,5}[\s-]\d{4}\b/gu;

/** Oito dígitos seguidos ou mais (CPF sem pontos, telefone colado) não são texto de escala. */
const NUMERO_LONGO = /\d{8,}/gu;

function escapar(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function removerNomes(texto: string, nomes: readonly string[]): string {
  let resultado = texto;
  for (const nome of nomes) {
    const alvo = normalizar(nome);
    if (alvo.length < 5) continue; // nome curto demais casaria com palavras comuns
    resultado = resultado.replace(new RegExp(escapar(nome), "giu"), MARCA_NOME);
    // Sem acento e sem diferença de caixa: só se cada caractere mantém o tamanho ao normalizar.
    for (;;) {
      const comparavel = normalizar(resultado);
      const posicao = comparavel.length === resultado.length ? comparavel.indexOf(alvo) : -1;
      if (posicao < 0) break;
      resultado = resultado.slice(0, posicao) + MARCA_NOME + resultado.slice(posicao + alvo.length);
    }
  }
  return resultado;
}

/** O texto sem os nomes dados, sem CRM, e-mail, telefone nem número de documento. */
export function removerDadosPessoais(texto: string, nomes: readonly string[] = []): string {
  return removerNomes(texto, nomes)
    .replace(EMAIL, MARCA_EMAIL)
    .replace(CPF_CNPJ, MARCA_NUMERO)
    .replace(CRM, MARCA_CRM)
    .replace(TELEFONE, MARCA_TELEFONE)
    .replace(NUMERO_LONGO, MARCA_NUMERO);
}
