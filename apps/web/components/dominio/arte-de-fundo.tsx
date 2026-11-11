import { cn } from "@/lib/utils";

/**
 * A arte de fundo: a rede de plantão vista de cima. Um hospital no centro e fibras que saem
 * dele até os médicos (pontos), em azul e rosa, com brilho. Faz o papel da ilustração grande do
 * modelo visual, mas conta o nosso assunto: quem pode cobrir esta vaga.
 *
 * É só decoração: fica atrás de tudo, sem foco, sem leitura de tela e sem receber cliques. Os
 * painéis translúcidos deixam a rede aparecer desfocada.
 */

// Gerador fixo (sem Math.random): a arte sai igual no servidor e no navegador.
function sementes(semente: number) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

interface Fibra {
  d: string;
  cor: "azul" | "rosa";
  fim: [number, number];
  largura: number;
}

function gerarRede(): { fibras: Fibra[]; centro: [number, number] } {
  const aleatorio = sementes(17);
  const centro: [number, number] = [560, 360];
  const fibras: Fibra[] = [];
  const total = 34;
  for (let i = 0; i < total; i += 1) {
    const angulo = (i / total) * Math.PI * 2 + (aleatorio() - 0.5) * 0.35;
    const raio = 230 + aleatorio() * 330;
    const fim: [number, number] = [
      centro[0] + Math.cos(angulo) * raio,
      centro[1] + Math.sin(angulo) * raio * 0.82,
    ];
    // Duas curvas de controle afastadas para o lado: a fibra ondula como um nervo.
    const lado = (aleatorio() - 0.5) * 220;
    const perp = [-Math.sin(angulo), Math.cos(angulo)];
    const c1: [number, number] = [
      centro[0] + Math.cos(angulo) * raio * 0.33 + perp[0] * lado,
      centro[1] + Math.sin(angulo) * raio * 0.33 + perp[1] * lado,
    ];
    const c2: [number, number] = [
      centro[0] + Math.cos(angulo) * raio * 0.7 - perp[0] * lado * 0.6,
      centro[1] + Math.sin(angulo) * raio * 0.7 - perp[1] * lado * 0.6,
    ];
    const r = (n: number) => n.toFixed(1);
    fibras.push({
      d: `M${r(centro[0])} ${r(centro[1])} C${r(c1[0])} ${r(c1[1])} ${r(c2[0])} ${r(c2[1])} ${r(fim[0])} ${r(fim[1])}`,
      cor: i % 3 === 0 ? "rosa" : "azul",
      fim,
      largura: 0.8 + aleatorio() * 1.6,
    });
  }
  return { fibras, centro };
}

const REDE = gerarRede();

export function ArteDeFundo({ className }: { className?: string }) {
  const { fibras, centro } = REDE;
  return (
    <div
      aria-hidden="true"
      className={cn(
        "arte-de-fundo pointer-events-none fixed top-0 right-0 -z-10 h-[min(100dvh,980px)] w-[min(64vw,1000px)] select-none",
        className,
      )}
    >
      <svg viewBox="0 0 1000 900" preserveAspectRatio="xMidYMin slice" className="size-full" focusable="false">
        <defs>
          <radialGradient id="arte-nucleo" cx="0.56" cy="0.4" r="0.45">
            <stop offset="0" stopColor="var(--arte-azul)" stopOpacity="0.5" />
            <stop offset="0.45" stopColor="var(--arte-azul)" stopOpacity="0.12" />
            <stop offset="1" stopColor="var(--arte-azul)" stopOpacity="0" />
          </radialGradient>
          <filter id="arte-brilho" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <rect width="1000" height="900" fill="url(#arte-nucleo)" />
        <g filter="url(#arte-brilho)" opacity="0.4">
          {fibras.map((f, i) => (
            <path
              key={i}
              d={f.d}
              fill="none"
              stroke={f.cor === "rosa" ? "var(--arte-rosa)" : "var(--arte-azul)"}
              strokeWidth={f.largura * 5}
              strokeLinecap="round"
            />
          ))}
        </g>
        <g opacity="0.7">
          {fibras.map((f, i) => (
            <path
              key={i}
              d={f.d}
              fill="none"
              stroke={f.cor === "rosa" ? "var(--arte-rosa)" : "var(--arte-azul-forte)"}
              strokeWidth={f.largura}
              strokeLinecap="round"
            />
          ))}
          {fibras.map((f, i) => (
            <circle
              key={i}
              cx={f.fim[0]}
              cy={f.fim[1]}
              r={2.5 + (i % 4)}
              fill={f.cor === "rosa" ? "var(--arte-rosa)" : "var(--arte-azul-forte)"}
            />
          ))}
        </g>
        <circle cx={centro[0]} cy={centro[1]} r="34" fill="var(--arte-azul)" opacity="0.25" filter="url(#arte-brilho)" />
        <circle cx={centro[0]} cy={centro[1]} r="11" fill="var(--arte-azul-forte)" opacity="0.8" />
      </svg>
    </div>
  );
}
