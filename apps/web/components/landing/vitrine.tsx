"use client";

import * as React from "react";
import Link from "next/link";
import { HeroDemo } from "./hero-demo";

/*
 * A vitrine da página inicial: splash, três seções de tela cheia e "cartões mascarados" (vários
 * cartões mostram janelas diferentes da mesma imagem de fundo, como um mosaico). Segue o formato
 * que o Victor pediu, com o conteúdo do PlantãoSeguro. Os fundos são desenhos originais em SVG
 * (public/vitrine), a fonte é a Open Sauce One servida pelo próprio site e a demonstração viva
 * continua no cartão grande da seção 3.
 */

const FUNDO_SECAO_1 = "/vitrine/esfera.svg";
const FUNDO_SECAO_2 = "/vitrine/anel.svg";

const BARRAS = ["Lê o pedido em texto livre", "Explica cada nome sugerido", "Só oferece com o seu clique"];

const ETAPAS = [
  { nome: "Leitura\ndo pedido", num: "01", ativa: true },
  { nome: "Filtro\npor regras", num: "02", ativa: false },
  { nome: "Ordem\nexplicada", num: "03", ativa: false },
  { nome: "Cascata\nde ofertas", num: null, ativa: false },
];

const CURVA = "cubic-bezier(0.16,1,0.3,1)";

/* ------------------------------------------------------------------ ganchos */

interface Posicao {
  x: number;
  y: number;
  sw: number;
  sh: number;
}

/** A posição de cada cartão dentro da seção, refeita sempre que a seção muda de tamanho. */
function useMaskPositions(
  el: HTMLElement | null,
  cartoes: React.RefObject<(HTMLElement | null)[]>,
): Posicao[] {
  const [posicoes, setPosicoes] = React.useState<Posicao[]>([]);
  React.useEffect(() => {
    if (!el) return;
    const medir = () => {
      const caixa = el.getBoundingClientRect();
      setPosicoes(
        (cartoes.current ?? []).map((c) => {
          if (!c) return { x: 0, y: 0, sw: caixa.width, sh: caixa.height };
          const r = c.getBoundingClientRect();
          return { x: r.left - caixa.left, y: r.top - caixa.top, sw: caixa.width, sh: caixa.height };
        }),
      );
    };
    const observador = new ResizeObserver(medir);
    observador.observe(el);
    medir();
    return () => observador.disconnect();
  }, [el, cartoes]);
  return posicoes;
}

/** As medidas naturais da imagem, para calcular quanto ela cresce ao cobrir a seção. */
function useImageSize(src: string): { w: number; h: number } | null {
  const [tamanho, setTamanho] = React.useState<{ w: number; h: number } | null>(null);
  React.useEffect(() => {
    const img = new Image();
    img.onload = () => setTamanho({ w: img.naturalWidth || 1600, h: img.naturalHeight || 1000 });
    img.src = src;
  }, [src]);
  return tamanho;
}

function useIsMobile(): boolean {
  return React.useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia("(max-width: 767px)");
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(max-width: 767px)").matches,
    () => false,
  );
}

function usePrefereMenosMovimento(): boolean {
  return React.useSyncExternalStore(
    (avisar) => {
      const consulta = window.matchMedia("(prefers-reduced-motion: reduce)");
      consulta.addEventListener("change", avisar);
      return () => consulta.removeEventListener("change", avisar);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

/** Revela os cartões de uma seção um a um (120 ms entre eles) quando ela entra na tela, uma vez. */
function useStaggeredReveal(limiar = 0.15) {
  const [el, containerRef] = React.useState<HTMLElement | null>(null);
  const [visivel, setVisivel] = React.useState(false);
  const menosMovimento = usePrefereMenosMovimento();
  React.useEffect(() => {
    if (!el || menosMovimento) return;
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          setVisivel(true);
          observador.disconnect();
        }
      },
      { threshold: limiar },
    );
    observador.observe(el);
    return () => observador.disconnect();
  }, [el, limiar, menosMovimento]);
  const mostrar = visivel || menosMovimento;
  const getAnimStyle = (i: number): React.CSSProperties => ({
    opacity: mostrar ? 1 : 0,
    transform: mostrar ? "translateY(0)" : "translateY(24px)",
    transition: `opacity 0.6s ${CURVA} ${i * 120}ms, transform 0.6s ${CURVA} ${i * 120}ms`,
  });
  return { containerRef, getAnimStyle };
}

/* --------------------------------------------------------- cartão mascarado */

function MaskedCard({
  fundo,
  posicao,
  imagem,
  focalX,
  className,
  style,
  cardRef,
  as: Tag = "div",
  children,
  ...props
}: {
  fundo: string;
  posicao: Posicao | undefined;
  imagem: { w: number; h: number } | null;
  focalX: number;
  className?: string;
  style?: React.CSSProperties;
  cardRef: (el: HTMLElement | null) => void;
  as?: "div" | "li" | "section";
  children?: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "style" | "className">) {
  let fundoEstilo: React.CSSProperties = {};
  if (posicao && imagem) {
    // A imagem cobre a seção: pela altura e, se ainda faltar largura, pela largura.
    const escala = Math.max(posicao.sh / imagem.h, posicao.sw / imagem.w);
    const largura = imagem.w * escala;
    const altura = imagem.h * escala;
    const sobra = largura > posicao.sw ? largura - posicao.sw : 0;
    const deslocamento = sobra * focalX;
    fundoEstilo = {
      backgroundImage: `url(${fundo})`,
      backgroundSize: `${largura}px ${altura}px`,
      backgroundPosition: `-${posicao.x + deslocamento}px -${posicao.y}px`,
      backgroundRepeat: "no-repeat",
    };
  }
  const Componente = Tag as React.ElementType;
  return (
    <Componente ref={cardRef} className={className} style={{ ...fundoEstilo, ...style }} {...props}>
      {children}
    </Componente>
  );
}

function useCartoes(quantos: number) {
  const refs = React.useRef<(HTMLElement | null)[]>(Array.from({ length: quantos }, () => null));
  const registrar = React.useCallback(
    (i: number) => (el: HTMLElement | null) => {
      refs.current[i] = el;
    },
    [],
  );
  return { refs, registrar };
}

/* ------------------------------------------------------------------- splash */

const CHAVE_SPLASH = "plantaoseg-splash-visto";

/**
 * O contador de 0 a 100 em 2 s, no canto inferior esquerdo, que some em seguida. Aparece uma vez
 * por sessão e nunca para quem pede menos movimento (o script do <head> já o esconde nesses casos,
 * antes da primeira pintura). É decoração: fora da leitura de tela.
 */
function SplashScreen() {
  const [numero, setNumero] = React.useState(0);
  const [saindo, setSaindo] = React.useState(false);
  const [fim, setFim] = React.useState(false);

  React.useEffect(() => {
    const raiz = document.documentElement;
    // Já visto nesta sessão ou com menos movimento: o CSS esconde o splash, e o contador nem roda.
    if (raiz.dataset.splash === "visto") return;
    let atual = 0;
    let saida: number | undefined;
    let remocao: number | undefined;
    const passo = window.setInterval(() => {
      atual += 1;
      setNumero(atual);
      if (atual >= 100) {
        window.clearInterval(passo);
        saida = window.setTimeout(() => setSaindo(true), 200);
        remocao = window.setTimeout(() => {
          setFim(true);
          raiz.dataset.splash = "visto";
          try {
            window.sessionStorage.setItem(CHAVE_SPLASH, "1");
          } catch {
            // Sem armazenamento: o splash volta na próxima página, sem prejuízo.
          }
        }, 900);
      }
    }, 20);
    return () => {
      window.clearInterval(passo);
      window.clearTimeout(saida);
      window.clearTimeout(remocao);
    };
  }, []);

  if (fim) return null;
  return (
    <div
      aria-hidden="true"
      className={`splash fixed inset-0 z-[100] flex items-end justify-start bg-papel transition-opacity duration-700 ${saindo ? "opacity-0" : "opacity-100"}`}
    >
      <span className="p-6 text-7xl leading-none font-bold text-tinta tabular-nums md:p-10 md:text-9xl">{numero}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ seções */

function Secao1() {
  const [secao, setSecao] = React.useState<HTMLElement | null>(null);
  const { refs, registrar } = useCartoes(4);
  const posicoes = useMaskPositions(secao, refs);
  const imagem = useImageSize(FUNDO_SECAO_1);
  const celular = useIsMobile();
  const { containerRef, getAnimStyle } = useStaggeredReveal();
  const focal = celular ? 0.35 : 0.8;
  const juntarRefs = React.useCallback(
    (el: HTMLElement | null) => {
      setSecao(el);
      containerRef(el);
    },
    [containerRef],
  );

  return (
    <section
      ref={juntarRefs}
      aria-labelledby="titulo-hero"
      className="flex h-[calc(100svh-7.5rem)] min-h-[34rem] w-full md:h-[calc(100svh-6rem)] flex-col gap-1.5 overflow-hidden px-3 pt-1.5 pb-1.5 md:min-h-[40rem] md:gap-2 md:px-5 md:pt-2 md:pb-2"
    >
      {BARRAS.map((texto, i) => (
        <MaskedCard
          key={texto}
          cardRef={registrar(i)}
          fundo={FUNDO_SECAO_1}
          posicao={posicoes[i]}
          imagem={imagem}
          focalX={focal}
          style={getAnimStyle(i)}
          className="relative h-14 w-full shrink-0 overflow-hidden rounded-xl bg-recuo md:h-20 md:rounded-2xl"
        >
          <span className="relative z-10 flex h-full items-center justify-center px-4 text-center text-lg font-bold text-[#0b1220] md:text-3xl">
            {texto}
          </span>
        </MaskedCard>
      ))}

      <MaskedCard
        cardRef={registrar(3)}
        fundo={FUNDO_SECAO_1}
        posicao={posicoes[3]}
        imagem={imagem}
        focalX={focal}
        style={getAnimStyle(3)}
        className="relative min-h-0 w-full flex-1 overflow-hidden rounded-xl bg-recuo md:rounded-2xl"
      >
        <p className="absolute top-4 left-4 z-10 max-w-[220px] text-xs leading-4 font-semibold text-[#0b1220] md:top-7 md:left-7 md:max-w-[340px] md:text-sm md:leading-5">
          Uma plataforma acadêmica para cobrir plantões médicos,
          <br />
          com IA que explica cada sugestão e decisão humana.
        </p>
        <div className="absolute bottom-5 left-3 z-10 md:bottom-8 md:left-4">
          <span className="mb-1 block text-xs font-semibold text-[#0b1220] md:mb-2 md:text-sm">
            Escala médica com supervisão humana
          </span>
          <h1
            id="titulo-hero"
            className="text-[clamp(2.6rem,10.5vw,10.5rem)] leading-[0.82] font-bold tracking-tight text-[#0b1220]"
          >
            A IA sugere.
            <br />
            Você decide.
          </h1>
        </div>
        <Link
          href="/entrar"
          className="absolute top-24 right-4 z-10 rounded-full bg-[#ffffff] px-4 py-2.5 text-xs font-semibold text-[#0b1220] shadow-flutuante transition-transform duration-200 hover:scale-105 md:top-auto md:right-8 md:bottom-9 md:px-6 md:py-3 md:text-sm"
        >
          Entrar no sistema
        </Link>
      </MaskedCard>
    </section>
  );
}

function Secao2() {
  const [secao, setSecao] = React.useState<HTMLElement | null>(null);
  const { refs, registrar } = useCartoes(4);
  const posicoes = useMaskPositions(secao, refs);
  const imagem = useImageSize(FUNDO_SECAO_2);
  const celular = useIsMobile();
  const { containerRef, getAnimStyle } = useStaggeredReveal();
  const focal = celular ? 0.65 : 0.8;
  const juntarRefs = React.useCallback(
    (el: HTMLElement | null) => {
      setSecao(el);
      containerRef(el);
    },
    [containerRef],
  );
  const base = { fundo: FUNDO_SECAO_2, imagem, focalX: focal };

  return (
    <section
      ref={juntarRefs}
      aria-label="O caminho da vaga até a oferta"
      className="flex min-h-screen w-full flex-col gap-1.5 overflow-hidden px-3 pt-1.5 pb-1.5 md:h-screen md:gap-2 md:px-5 md:pt-2 md:pb-2"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[auto_auto_auto_auto] gap-1.5 md:grid-cols-2 md:grid-rows-[1fr_1fr_0.8fr] md:gap-2">
        <MaskedCard
          {...base}
          cardRef={registrar(0)}
          posicao={posicoes[0]}
          style={getAnimStyle(0)}
          className="relative min-h-[160px] overflow-hidden rounded-xl bg-[#11285c] md:min-h-0 md:rounded-2xl"
        >
          <h2 className="absolute top-4 left-5 z-10 text-2xl font-bold text-[#ffffff] md:top-6 md:left-7 md:text-3xl">
            <Link href="#como-funciona" className="inline-flex min-h-[var(--alvo-min)] items-center rounded-md underline-offset-4 hover:underline">
              Como funciona
            </Link>
          </h2>
          <p className="absolute bottom-4 left-5 z-10 text-xs font-semibold text-[#ffffff] md:bottom-6 md:left-7 md:text-sm">
            Do pedido em texto livre à oferta aceita
          </p>
        </MaskedCard>

        <MaskedCard
          {...base}
          cardRef={registrar(1)}
          posicao={posicoes[1]}
          style={getAnimStyle(1)}
          className="relative min-h-[220px] overflow-hidden rounded-xl bg-[#11285c] md:row-span-2 md:min-h-0 md:rounded-2xl"
        >
          <p className="absolute bottom-20 left-5 z-10 max-w-[30ch] text-xs leading-4 font-semibold text-[#ffffff] md:bottom-24 md:left-7 md:text-sm md:leading-5">
            Quer ver a ordem sugerida, os motivos e a cascata?
            <br />
            Use o modo de demonstração, sem senha.
          </p>
          <Link
            href="/entrar/demonstracao"
            className="absolute right-4 bottom-4 z-10 rounded-full bg-[#ffffff] px-5 py-3 text-base font-bold text-[#0b1220] transition-transform hover:scale-105 md:right-6 md:bottom-6 md:px-8 md:py-5 md:text-xl"
          >
            Ver a demonstração
          </Link>
        </MaskedCard>

        <MaskedCard
          {...base}
          cardRef={registrar(2)}
          posicao={posicoes[2]}
          style={getAnimStyle(2)}
          className="relative min-h-[160px] overflow-hidden rounded-xl bg-[#11285c] md:min-h-0 md:rounded-2xl"
        >
          <p className="absolute top-4 right-5 left-5 z-10 text-[clamp(2.6rem,6.5vw,6rem)] leading-[0.9] font-bold [overflow-wrap:anywhere] text-[#ffffff] md:top-6 md:right-7 md:left-7">
            Decisão
            <br />
            humana
          </p>
        </MaskedCard>

        <MaskedCard
          {...base}
          cardRef={registrar(3)}
          posicao={posicoes[3]}
          style={getAnimStyle(3)}
          className="relative col-span-1 min-h-[220px] overflow-hidden rounded-xl bg-[#11285c] md:col-span-2 md:min-h-0 md:rounded-2xl"
        >
          <ul className="absolute inset-0 z-10 flex flex-wrap gap-1.5 p-2 md:flex-nowrap md:gap-2 md:p-3">
            {ETAPAS.map((etapa) => (
              <li
                key={etapa.nome}
                className={`flex min-w-[calc(50%-4px)] flex-1 flex-col justify-between rounded-xl p-3 md:min-w-0 md:rounded-2xl md:p-5 ${
                  etapa.ativa ? "bg-[#ffffff]/90 backdrop-blur-md" : "bg-[#ffffff]/15 backdrop-blur-xl"
                }`}
              >
                <h3
                  className={`text-xl leading-[1.05] font-bold whitespace-pre-line md:text-4xl ${
                    etapa.ativa ? "text-[#0b1220]" : "text-[#ffffff]"
                  }`}
                >
                  {etapa.nome}
                </h3>
                {etapa.num ? (
                  <span
                    aria-hidden="true"
                    className={`flex size-8 items-center justify-center self-end rounded-full border text-xs font-semibold md:size-12 md:text-sm ${
                      etapa.ativa ? "border-[#0b1220] text-[#0b1220]" : "border-[#ffffff] text-[#ffffff]"
                    }`}
                  >
                    {etapa.num}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </MaskedCard>
      </div>
    </section>
  );
}

function Seta({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className={`rotate-[-45deg] ${className ?? ""}`}>
      <path d="M1 7h12m0 0L8 2m5 5L8 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Secao3() {
  const { containerRef, getAnimStyle } = useStaggeredReveal();
  return (
    <section
      ref={containerRef}
      aria-labelledby="titulo-auditavel"
      className="flex min-h-screen w-full flex-col gap-1.5 px-3 pt-1.5 pb-1.5 md:gap-2 md:px-5 md:pt-2 md:pb-2"
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-1.5 md:grid-cols-2 md:gap-2">
        <div className="flex flex-col gap-1.5 md:gap-2">
          <div
            style={getAnimStyle(0)}
            className="flex min-h-[180px] flex-[1.2] flex-col justify-between rounded-xl bg-recuo p-5 md:min-h-0 md:rounded-2xl md:p-7"
          >
            <h2 id="titulo-auditavel" className="text-[clamp(2.6rem,6.5vw,6.5rem)] leading-[0.95] font-bold text-tinta">
              Decisão
              <br />
              auditável
            </h2>
            <p className="text-xs font-semibold text-tinta md:text-sm">Toda decisão fica na trilha de auditoria</p>
          </div>

          <div style={getAnimStyle(1)} className="flex min-h-[150px] flex-1 flex-wrap gap-1.5 md:min-h-0 md:gap-2">
            <Link
              href="#compromissos"
              className="group flex min-w-[9rem] flex-1 flex-col justify-between gap-3 rounded-xl border border-divisor bg-papel p-3 transition-transform hover:scale-[1.02] md:rounded-2xl md:p-5"
            >
              <span className="text-lg leading-5 font-bold [overflow-wrap:anywhere] text-tinta md:text-2xl md:leading-7">
                O que
                <br />
                prometemos
                <br />e como conferir
              </span>
              <span className="flex size-9 items-center justify-center self-end rounded-full border border-tinta text-tinta md:size-12">
                <Seta />
              </span>
            </Link>
            <Link
              href="#evidencia"
              className="group flex min-w-[9rem] flex-1 flex-col justify-between gap-3 rounded-xl bg-[linear-gradient(135deg,var(--acento),var(--ia))] p-3 transition-transform hover:scale-[1.02] md:rounded-2xl md:p-5"
            >
              <span className="text-lg leading-5 font-bold [overflow-wrap:anywhere] text-sobre-acento md:text-2xl md:leading-7">
                O que a<br />
                simulação
                <br />
                mostra
              </span>
              <span className="flex size-9 items-center justify-center self-end rounded-full border border-sobre-acento text-sobre-acento md:size-12">
                <Seta />
              </span>
            </Link>
          </div>

          <div
            style={getAnimStyle(2)}
            className="flex min-h-[160px] flex-[0.8] flex-wrap items-end justify-between gap-4 rounded-xl bg-divisor p-5 md:min-h-0 md:rounded-2xl md:p-7"
          >
            <div>
              <p className="mb-2 text-xs font-semibold text-tinta md:mb-3 md:text-sm">Projeto acadêmico</p>
              <p className="text-xl leading-6 font-bold text-tinta md:text-3xl md:leading-8">
                Dados
                <br />
                100%
                <br />
                sintéticos
              </p>
            </div>
            <Link
              href="/ajuda"
              className="shrink-0 rounded-full bg-papel px-5 py-3 text-base font-bold text-tinta transition-transform hover:scale-105 md:px-8 md:py-5 md:text-xl"
            >
              Ler a ajuda
            </Link>
          </div>
        </div>

        {/* A demonstração viva, sobre o fundo da esfera: é o produto, não uma foto. */}
        <div
          style={getAnimStyle(3)}
          className="relative flex min-h-[350px] items-center rounded-xl bg-[url(/vitrine/esfera.svg)] bg-cover bg-[position:80%_center] p-3 md:min-h-0 md:rounded-2xl md:p-6"
        >
          <div className="relative w-full">
            <HeroDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

/** A vitrine: splash, as três seções e, abaixo, o conteúdo de sempre da página inicial. */
export function Vitrine() {
  return (
    <>
      <SplashScreen />
      <Secao1 />
      <Secao2 />
      <Secao3 />
    </>
  );
}
