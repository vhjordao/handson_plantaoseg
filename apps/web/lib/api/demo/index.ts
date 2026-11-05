/**
 * Adaptador `demo` de `PlantaoApi`: roda no navegador, sem rede, sobre as fixtures do pipeline
 * real e com o relógio simulado. Ver `adaptador.ts` e `lib/demo/README.md`. Os erros de domínio
 * que ele lança são do contrato e ficam em `lib/api/erros.ts`.
 */
export { criarApiDemo } from "./adaptador";
export type { OpcoesApiDemo, PlantaoApiDemo } from "./adaptador";
