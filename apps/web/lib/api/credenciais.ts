import type { Credenciais, DataHora, Medico, SituacaoCredencial, StatusCrm } from "./types";

/** `doctors.crm_status` do banco para o vocabulário da tela. */
export const STATUS_CRM_DO_BANCO: Record<string, StatusCrm> = {
  active: "ativo",
  suspended: "suspenso",
  expired: "vencido",
};

/** A tela avisa quando faltam 60 dias ou menos para a validade. */
export const DIAS_DE_AVISO = 60;

const DIA_MS = 24 * 60 * 60 * 1000;

/** Um número estável a partir do id: a validade simulada não muda entre uma visita e outra. */
function semente(id: string): number {
  let soma = 0;
  for (const letra of id) soma = (soma * 31 + letra.charCodeAt(0)) % 9973;
  return soma;
}

/** O último dia do mês que fica `meses` depois (ou antes, se negativo) do mês de `hoje`. */
function fimDoMes(hoje: Date, meses: number): Date {
  return new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + meses + 1, 0));
}

function comoDataHora(data: Date): DataHora {
  return `${data.toISOString().slice(0, 10)}T00:00:00`;
}

/** "SIM-SP-000083" traz a UF no meio; outro formato (o login sem persona) não traz. */
export function ufDoCrm(crm: string): string | null {
  return /^SIM-([A-Z]{2})-\d{6}$/.exec(crm)?.[1] ?? null;
}

/**
 * A validade **simulada** do registro. O banco guarda o status do CRM, mas não uma data: para a
 * demonstração, ela sai do id do médico e do status, sempre coerente com ele (ativo e suspenso
 * vencem de 1 a 24 meses à frente; vencido venceu de 1 a 10 meses atrás). Num hospital de
 * verdade, viria do credenciamento.
 */
export function validadeSimulada(medicoId: string, status: StatusCrm, hoje: DataHora): DataHora {
  const base = new Date(`${hoje.slice(0, 10)}T00:00:00Z`);
  const n = semente(medicoId);
  const meses = status === "vencido" ? -(1 + (n % 10)) : 1 + (n % 24);
  return comoDataHora(fimDoMes(base, meses));
}

function situacaoDe(status: StatusCrm, diasRestantes: number): SituacaoCredencial {
  if (status === "vencido") return "vencida";
  if (status === "suspenso") return "suspensa";
  return diasRestantes <= DIAS_DE_AVISO ? "vence_em_breve" : "em_dia";
}

/** Junta o cadastro e a validade simulada no que a tela de credenciais mostra. */
export function montarCredenciais(
  medico: Medico,
  statusCrm: StatusCrm,
  hoje: DataHora,
  fonteDoStatus: Credenciais["fonteDoStatus"],
): Credenciais {
  const validaAte = validadeSimulada(medico.id, statusCrm, hoje);
  const diasRestantes = Math.round(
    (Date.parse(`${validaAte}Z`) - Date.parse(`${hoje.slice(0, 10)}T00:00:00Z`)) / DIA_MS,
  );
  return {
    medico,
    uf: ufDoCrm(medico.crm),
    statusCrm,
    situacao: situacaoDe(statusCrm, diasRestantes),
    validaAte,
    diasRestantes,
    elegivel: statusCrm === "ativo",
    fonteDoStatus,
  };
}
