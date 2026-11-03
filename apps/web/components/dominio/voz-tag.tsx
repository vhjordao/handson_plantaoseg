import * as React from "react";
import { BadgeCheck, CircleDashed, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { VOZES, type ChaveVoz } from "@/lib/copy/comum";

const CONFIG = {
  ia: { Icone: CircleDashed, tone: "ia" },
  humano: { Icone: BadgeCheck, tone: "humano" },
  regra: { Icone: Ruler, tone: "regra" },
} as const;

/** O rótulo de quem falou: "Sugestão da IA", "Decisão humana" ou "Regra do sistema". */
export function VozTag({
  voz,
  children,
  className,
}: {
  voz: ChaveVoz;
  children?: React.ReactNode;
  className?: string;
}) {
  const { Icone, tone } = CONFIG[voz];
  return (
    <Badge tone={tone} className={className}>
      <Icone aria-hidden="true" />
      {children ?? VOZES[voz].rotulo}
    </Badge>
  );
}
