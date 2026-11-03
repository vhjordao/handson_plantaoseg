/**
 * SHA-256 em hexadecimal, para os ids das vagas e para a cadeia de hash da trilha.
 *
 * Usa a Web Crypto quando existe. Ela só existe em contexto seguro (HTTPS ou localhost); se o
 * notebook da apresentação servir a demonstração por HTTP na rede local (o plano B do
 * auditório), `crypto.subtle` não está disponível e entra o cálculo em JavaScript abaixo, que
 * os testes comparam com a Web Crypto.
 */

/** Os 64 primeiros primos: de suas raízes saem as constantes do algoritmo (FIPS 180-4). */
const PRIMOS = (() => {
  const achados: number[] = [];
  for (let n = 2; achados.length < 64; n++) {
    if (achados.every((p) => n % p !== 0)) achados.push(n);
  }
  return achados;
})();

/** Os 32 primeiros bits da parte fracionária de `x`. */
const fracao32 = (x: number): number => Math.floor((x - Math.floor(x)) * 2 ** 32);

const K = PRIMOS.map((p) => fracao32(Math.cbrt(p)));
const H0 = PRIMOS.slice(0, 8).map((p) => fracao32(Math.sqrt(p)));

const girar = (x: number, n: number): number => (x >>> n) | (x << (32 - n));

function paraHex(palavras: ArrayLike<number>): string {
  return Array.from(palavras, (p) => (p >>> 0).toString(16).padStart(8, "0")).join("");
}

/** SHA-256 em JavaScript puro, sobre bytes. */
export function sha256PuroHex(bytes: Uint8Array): string {
  const blocos = Math.ceil((bytes.length + 9) / 64);
  const total = new Uint8Array(blocos * 64);
  total.set(bytes);
  total[bytes.length] = 0x80;
  const visao = new DataView(total.buffer);
  visao.setUint32(total.length - 8, Math.floor(bytes.length / 2 ** 29)); // tamanho em bits
  visao.setUint32(total.length - 4, (bytes.length * 8) >>> 0);

  const h = [...H0];
  const w = new Uint32Array(64);
  for (let bloco = 0; bloco < blocos; bloco++) {
    for (let i = 0; i < 16; i++) w[i] = visao.getUint32(bloco * 64 + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = girar(w[i - 15]!, 7) ^ girar(w[i - 15]!, 18) ^ (w[i - 15]! >>> 3);
      const s1 = girar(w[i - 2]!, 17) ^ girar(w[i - 2]!, 19) ^ (w[i - 2]! >>> 10);
      w[i] = w[i - 16]! + s0 + w[i - 7]! + s1;
    }
    let [a, b, c, d, e, f, g, hh] = h as [number, number, number, number, number, number, number, number];
    for (let i = 0; i < 64; i++) {
      const s1 = girar(e, 6) ^ girar(e, 11) ^ girar(e, 25);
      const escolha = (e & f) ^ (~e & g);
      const t1 = (hh + s1 + escolha + K[i]! + w[i]!) | 0;
      const s0 = girar(a, 2) ^ girar(a, 13) ^ girar(a, 22);
      const maioria = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (s0 + maioria) | 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) | 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) | 0;
    }
    [a, b, c, d, e, f, g, hh].forEach((valor, i) => {
      h[i] = (h[i]! + valor) | 0;
    });
  }
  return paraHex(h);
}

/** SHA-256 de um texto (UTF-8), em hexadecimal minúsculo. */
export async function sha256Hex(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    try {
      return paraHex(new Uint32Array(await subtle.digest("SHA-256", bytes)).map(trocarOrdem));
    } catch {
      // Contexto sem Web Crypto utilizável: cai no cálculo em JavaScript.
    }
  }
  return sha256PuroHex(bytes);
}

/** A Web Crypto devolve bytes; lidos como palavras de 32 bits em ordem de rede. */
function trocarOrdem(palavra: number): number {
  return ((palavra & 0xff) << 24) | ((palavra & 0xff00) << 8) | ((palavra >>> 8) & 0xff00) | (palavra >>> 24);
}
