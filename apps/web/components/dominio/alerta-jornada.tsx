import { Alert } from "@/components/ui/alert";
import { ALERTA_JORNADA } from "@/lib/copy/coordenador";

/**
 * O alerta de jornada de um nome sugerido, no texto do backend: a interface não reescreve fatos.
 * Âmbar, com ícone e título: a cor nunca é o único sinal. Sem alerta, não aparece nada.
 */
export function AlertaJornada({
  alertas,
  exigeJustificativa = false,
  className,
}: {
  alertas: readonly string[];
  /** Enquanto a vaga espera a decisão, avisa que aprovar pede justificativa. */
  exigeJustificativa?: boolean;
  className?: string;
}) {
  if (alertas.length === 0) return null;
  return (
    <Alert tone="atencao" title={ALERTA_JORNADA.titulo} className={className}>
      <ul className="grid gap-0.5">
        {alertas.map((alerta) => (
          <li key={alerta} className="first-letter:uppercase">
            {alerta}
          </li>
        ))}
      </ul>
      {exigeJustificativa ? <p className="mt-1">{ALERTA_JORNADA.exigeJustificativa}</p> : null}
    </Alert>
  );
}
