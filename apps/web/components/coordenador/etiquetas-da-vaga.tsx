import {
  Ban,
  CircleCheck,
  Sparkles,
  FilePen,
  Send,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { StatusVaga, Vaga } from "@/lib/api/types";
import { ROTULO_STATUS_VAGA, ROTULO_URGENCIA } from "@/lib/copy/rotulos";
import { formatarIntervalo } from "@/lib/format/datas";

/**
 * A etiqueta de cada estado. O tom da IA marca a sugestão que espera uma decisão: a linha
 * inteira da vaga "Aguardando sua decisão" também ganha o fundo da IA.
 */
const ESTADO: Record<StatusVaga, { icone: LucideIcon; tone: NonNullable<BadgeProps["tone"]> }> = {
  rascunho: { icone: FilePen, tone: "neutro" },
  aguardando_decisao: { icone: Sparkles, tone: "ia" },
  oferta_em_andamento: { icone: Send, tone: "regra" },
  preenchida: { icone: CircleCheck, tone: "humano" },
  sem_cobertura: { icone: Ban, tone: "erro" },
};

/** A etiqueta do estado da vaga e, se for o caso, o alerta "Em risco". */
export function EtiquetasDaVaga({ vaga }: { vaga: Pick<Vaga, "status" | "emRisco"> }) {
  const { icone: Icone, tone } = ESTADO[vaga.status];
  return (
    <>
      <Badge tone={tone}>
        <Icone aria-hidden="true" />
        {ROTULO_STATUS_VAGA[vaga.status]}
      </Badge>
      {vaga.emRisco ? (
        <Badge tone="atencao">
          <TriangleAlert aria-hidden="true" />
          Em risco
        </Badge>
      ) : null}
    </>
  );
}

/** "Hospital Modelo Centro, sexta, 02/10, 19h às 7h, urgência alta". */
export function descreverVaga(vaga: Pick<Vaga, "unidade" | "inicio" | "fim" | "urgencia">): string {
  const horario =
    vaga.inicio && vaga.fim ? formatarIntervalo(vaga.inicio, vaga.fim) : "horário ainda não conferido";
  const urgencia = vaga.urgencia ? `, urgência ${ROTULO_URGENCIA[vaga.urgencia]}` : "";
  return `${vaga.unidade.nome}, ${horario}${urgencia}`;
}
