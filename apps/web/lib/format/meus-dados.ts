import type { Contestacao, Medico, Oferta } from "@/lib/api/types";

/**
 * O que o médico pode baixar sobre si (LGPD, art. 18, II e V): o perfil, as ofertas que recebeu e as
 * contestações que abriu, em JSON, um formato aberto. Só traz o que a RLS já mostra a ele.
 */
export function arquivoDosMeusDados(
  medico: Medico,
  ofertas: Oferta[],
  contestacoes: Contestacao[],
  geradoEm: string,
): string {
  return JSON.stringify(
    {
      aviso:
        "Dados desta conta no PlantãoSeguro. Na demonstração, todos são sintéticos. A trilha de " +
        "auditoria guarda só o seu pseudônimo e não entra neste arquivo.",
      geradoEm,
      medico: {
        pseudonimo: medico.pseudonimo,
        nome: medico.nome,
        crm: medico.crm,
        especialidade: medico.especialidade,
        especialidadeSecundaria: medico.especialidadeSecundaria,
      },
      ofertas,
      contestacoes,
    },
    null,
    2,
  );
}

/** O nome do arquivo, com a data (AAAA-MM-DD). */
export function nomeDoArquivoDosMeusDados(geradoEm: string): string {
  return `meus-dados-plantaoseguro-${geradoEm.slice(0, 10)}.json`;
}
