/**
 * Um busto humano de vidro, visto de frente: silhueta azul translúcida com borda iluminada,
 * crânio, clavículas, costelas, a coluna e uma rede de nervos em rosa que sai dela. É uma
 * ilustração original (gerada aqui, em SVG), no papel da figura anatômica do modelo visual.
 * Gera tudo de forma fixa, sem `Math.random`, para sair igual no servidor e no navegador.
 */

const CX = 560;

function espelhar(d: string): string {
  // Espelha um caminho em torno do eixo vertical do corpo (x = CX).
  return d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x: string, y: string) => {
    const nx = 2 * CX - Number(x);
    return `${nx.toFixed(1)} ${y}`;
  });
}

const SILHUETA =
  "M505 262 C505 302 496 322 466 333 C392 352 320 370 293 430 C268 492 258 600 252 760 L246 1000 L874 1000 L868 760 C862 600 852 492 827 430 C800 370 728 352 654 333 C624 322 615 302 615 262 C640 238 655 200 655 150 C655 82 615 30 560 30 C505 30 465 82 465 150 C465 200 480 238 505 262 Z";

// As linhas que separam os braços do tronco.
const BRACO = "M372 560 C380 680 384 820 386 1000";

// Costelas: arcos que saem da coluna, descem e abraçam o tronco.
const COSTELAS = Array.from({ length: 10 }, (_, i) => {
  const y = 418 + i * 36;
  const abre = 150 - Math.abs(i - 3.5) * 9;
  return `M${CX - 14} ${y} C${CX - 60} ${y - 14} ${CX - abre} ${y - 4} ${CX - abre - 22} ${y + 34}`;
});

// Nervos: saem da coluna em cada nível, seguem a costela e se ramificam.
const NERVOS = [
  ...Array.from({ length: 9 }, (_, i) => {
    const y = 440 + i * 40;
    const longe = 170 + (i % 3) * 22;
    return `M${CX} ${y} C${CX - 50} ${y + 6} ${CX - longe + 40} ${y + 18} ${CX - longe} ${y + 48}`;
  }),
  // Plexo do braço: do pescoço até o braço.
  "M548 300 C520 330 470 360 420 395 C388 418 368 470 362 540 C356 640 358 780 352 1000",
  "M540 320 C500 360 440 420 410 470 C392 500 392 560 398 640",
  // Do crânio para o pescoço.
  "M560 230 C552 250 552 270 556 300",
];

const VERTEBRAS = Array.from({ length: 26 }, (_, i) => 268 + i * 28);

export function CorpoTranslucido() {
  return (
    <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMin slice" className="size-full" focusable="false">
      <defs>
        <radialGradient id="corpo-vidro" cx="0.56" cy="0.42" r="0.6">
          <stop offset="0" stopColor="var(--arte-azul)" stopOpacity="0.42" />
          <stop offset="0.55" stopColor="var(--arte-azul)" stopOpacity="0.2" />
          <stop offset="1" stopColor="var(--arte-azul)" stopOpacity="0.08" />
        </radialGradient>
        <radialGradient id="corpo-cabeca" cx="0.5" cy="0.4" r="0.55">
          <stop offset="0" stopColor="var(--arte-rosa)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--arte-azul)" stopOpacity="0" />
        </radialGradient>
        <filter id="corpo-brilho" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="corpo-borda" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {/* O vidro: o corpo cheio, a borda com brilho e a borda nítida por cima. */}
      <path d={SILHUETA} fill="url(#corpo-vidro)" />
      <path d={SILHUETA} fill="none" stroke="var(--arte-azul)" strokeWidth="14" opacity="0.35" filter="url(#corpo-borda)" />
      <path d={SILHUETA} fill="none" stroke="var(--arte-azul-forte)" strokeWidth="1.6" opacity="0.7" />
      <ellipse cx={CX} cy="140" rx="70" ry="88" fill="url(#corpo-cabeca)" />

      {/* Os braços e as clavículas. */}
      <g fill="none" stroke="var(--arte-azul-forte)" strokeWidth="1.4" opacity="0.45">
        <path d={BRACO} />
        <path d={espelhar(BRACO)} />
        <path d={`M${CX} 352 C520 340 440 342 372 376`} />
        <path d={espelhar(`M${CX} 352 C520 340 440 342 372 376`)} />
      </g>

      {/* As costelas, finas e claras. */}
      <g fill="none" stroke="var(--arte-osso)" strokeWidth="5" strokeLinecap="round" opacity="0.38">
        {COSTELAS.map((d, i) => (
          <g key={i}>
            <path d={d} />
            <path d={espelhar(d)} />
          </g>
        ))}
      </g>

      {/* A coluna: vértebras em pílulas, do pescoço para baixo. */}
      <g fill="var(--arte-osso)" stroke="var(--arte-azul-forte)" strokeWidth="1" opacity="0.6">
        {VERTEBRAS.map((y, i) => (
          <rect key={i} x={CX - 15 + (i % 2)} y={y} width="30" height="18" rx="9" />
        ))}
      </g>

      {/* Os nervos: rosa com brilho, e a medula descendo pela coluna. */}
      <g fill="none" stroke="var(--arte-rosa)" strokeLinecap="round" filter="url(#corpo-brilho)" opacity="0.65" strokeWidth="6">
        <path d={`M${CX} 250 L${CX} 1000`} />
        {NERVOS.map((d, i) => (
          <g key={i}>
            <path d={d} />
            <path d={espelhar(d)} />
          </g>
        ))}
      </g>
      <g fill="none" stroke="var(--arte-rosa)" strokeLinecap="round" opacity="0.9" strokeWidth="1.8">
        <path d={`M${CX} 250 L${CX} 1000`} />
        {NERVOS.map((d, i) => (
          <g key={i}>
            <path d={d} />
            <path d={espelhar(d)} />
          </g>
        ))}
      </g>
    </svg>
  );
}
