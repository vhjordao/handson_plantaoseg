import { cn } from "@/lib/utils";
import { SimboloPlantao } from "./marca-plantao";

/**
 * O selo de quem decidiu: "Decidido por Marina Alves, coordenadora, 9h12". Aparece quando uma
 * pessoa responsável assume a decisão e assenta com um movimento curto.
 *
 * Por padrão o selo é uma região de status, e o leitor de tela o anuncia ao surgir. Quem o
 * monta já com o texto (a região viva precisa existir **antes** de o texto entrar, senão o
 * anúncio pode se perder) mantém a sua própria região e passa `anunciar={false}`.
 */
export function SeloDecisaoHumana({
  nome,
  cargo,
  hora,
  animar = true,
  anunciar = true,
  className,
}: {
  nome: string;
  cargo: string;
  /** Hora já formatada, por exemplo "9h12". */
  hora: string;
  animar?: boolean;
  anunciar?: boolean;
  className?: string;
}) {
  return (
    <p
      role={anunciar ? "status" : undefined}
      className={cn(
        "inline-flex items-center gap-2 rounded-campo border-2 border-humano bg-humano-tom px-3 py-1.5 text-sm text-humano",
        animar && "assentar",
        className,
      )}
    >
      <SimboloPlantao variante="fechado" className="size-5" />
      <span>
        Decidido por <strong className="font-semibold">{nome}</strong>, {cargo}, {hora}
      </span>
    </p>
  );
}
