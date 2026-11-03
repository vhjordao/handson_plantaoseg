const REPOSITORY = "https://github.com/vhjordao/handson_plantaoseg";

const STATEMENT = "text-[clamp(1.5rem,4vw,2.5rem)] leading-tight font-bold";
const BODY = "mt-4 max-w-[60ch] text-lg leading-relaxed text-pretty";
const GUTTER = "px-4 sm:px-12 lg:px-20";

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col">
      <section
        className={`flex grow-3 flex-col justify-end bg-wall pt-16 pb-10 text-ink sm:pb-14 ${GUTTER}`}
      >
        <h1 className="text-[clamp(2.4rem,12vw,9rem)] leading-none font-extrabold tracking-tight">
          PlantãoSeguro
        </h1>
        <p className={`mt-4 ${STATEMENT}`}>Protótipo em construção.</p>
        <p className={BODY}>
          Hospitais publicam vagas de plantão, e a IA recomenda quais médicos chamar e explica o
          motivo. Quem decide é o coordenador.
        </p>
      </section>

      <div aria-hidden="true" className="caution-tape h-4" />

      <section className={`grow-2 bg-band pt-10 pb-12 text-chalk sm:pb-14 ${GUTTER}`}>
        <h2 className={STATEMENT}>Tudo aqui é simulação.</h2>
        <p className={BODY}>
          Nenhum dado real de médico, paciente ou hospital é usado, e nada do que aparecer aqui tem
          validade médica ou legal.
        </p>
        <p className={BODY}>
          Projeto acadêmico da disciplina Hands&nbsp;On&nbsp;– Aplicação de IA nos negócios, da
          pós-graduação do Mackenzie.
        </p>
        <a
          href={REPOSITORY}
          className="mt-6 inline-block text-lg font-bold underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-tape"
        >
          Ver o código no GitHub
        </a>
      </section>
    </main>
  );
}
