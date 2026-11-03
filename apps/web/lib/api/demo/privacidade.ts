/**
 * Tira nome, CRM e telefone dos textos livres que vão para a trilha de auditoria (a
 * justificativa de uma exceção e o motivo de pular um nome). A trilha só guarda pseudônimos;
 * como a pessoa pode digitar qualquer coisa, o texto passa por aqui antes de ser gravado.
 *
 * É uma barreira de melhor esforço, não uma garantia: pega os nomes e CRM da demonstração e
 * telefones no formato brasileiro. O aviso "Não digite dados reais" continua valendo na tela.
 */
import { normalizar } from "./leitura";

export const MARCA_NOME = "[nome removido]";
export const MARCA_CRM = "[CRM removido]";
export const MARCA_TELEFONE = "[telefone removido]";

const CRM = /\b(?:SIM-[A-Z]{2}-\d{3,}|CRM[\s:/-]*(?:[A-Z]{2}[\s-]*)?\d{3,})\b/giu;
const TELEFONE = /(?:\+?55[\s-]?)?\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}\b/gu;

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

/** O texto sem os nomes dados, sem CRM e sem telefone. */
export function removerDadosPessoais(texto: string, nomes: readonly string[] = []): string {
  return removerNomes(texto, nomes).replace(CRM, MARCA_CRM).replace(TELEFONE, MARCA_TELEFONE);
}
