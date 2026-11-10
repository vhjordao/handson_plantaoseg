import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { encontrarPersona, personaDoLogin } from "@/lib/session/personas";
import { lerSessao } from "@/lib/session/servidor";

export const metadata: Metadata = { title: "Minha conta" };

/** Os sete fatores do ranking, em linguagem de quem é ranqueado (`ranking/features.py`). */
const USADOS = [
  ["Especialidade", "Se você tem a especialidade principal da vaga ou só a secundária."],
  ["Distância", "Quantos quilômetros separam a sua casa do hospital."],
  ["Disponibilidade", "Quantas horas da vaga cabem na agenda que você declarou."],
  ["Aceite", "Quanto você aceitou das ofertas dos últimos 90 dias."],
  ["Comparecimento", "Quanto você compareceu nos últimos 90 dias."],
  ["Descanso", "Há quantas horas foi o seu último plantão."],
  ["Preferência", "Se o período da vaga (noturno, fim de semana) é o que você prefere."],
] as const;

const NAO_USADOS = [
  [
    "O valor do plantão e o pagamento",
    "Ficam fora da ordem, por desenho e por um teste automático. A Res. CFM 2.460/2026 veda influenciar a escala por vantagem econômica (leitura de engenharia: validar com jurídico).",
  ],
  [
    "Gênero, idade e outros atributos protegidos",
    "O conjunto sintético guarda gênero, faixa etária e zona só para medir se o sistema trata grupos de forma desigual. Nunca ordenam ninguém.",
  ],
  [
    "Seu nome, CRM e telefone",
    "Nunca vão ao modelo de linguagem, e a trilha de auditoria guarda só um pseudônimo.",
  ],
  [
    "A carga recente (plantões dos últimos 30 dias)",
    "Não ordena: só gera um alerta de jornada para o coordenador.",
  ],
] as const;

export default async function MinhaConta() {
  const sessao = await lerSessao();
  // No sistema real, o médico vem do login; no modo de demonstração, da persona escolhida.
  const persona = !sessao
    ? null
    : sessao.modo === "live"
      ? personaDoLogin("medico", sessao.personaId)
      : encontrarPersona("medico", sessao.personaId);
  const medico = persona?.papel === "medico" ? persona.medico : null;

  return (
    <div className="grid gap-8">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Minha conta e transparência</h1>
        <p className="mt-2 text-tinta-suave">
          O que o sistema sabe sobre você, o que usa e o que nunca usa.
        </p>
      </div>

      {medico ? (
        <Card className="p-4">
          <h2 className="font-serif text-xl font-semibold">{medico.nome}</h2>
          <p className="mt-1 text-tinta-suave">
            {ROTULO_ESPECIALIDADE[medico.especialidade]}
            {medico.especialidadeSecundaria
              ? `, com ${ROTULO_ESPECIALIDADE[medico.especialidadeSecundaria].toLowerCase()} como secundária`
              : ""}
          </p>
          <p className="text-tinta-suave">{medico.crm}</p>
          <p className="mt-2 text-sm text-tinta-suave">
            Persona fictícia. Os dados desta demonstração são todos sintéticos.
          </p>
        </Card>
      ) : null}

      <section aria-labelledby="conta-usa">
        <h2 id="conta-usa" className="font-serif text-xl font-semibold">
          O que o sistema usa para sugerir você
        </h2>
        <ul role="list" className="mt-3 divide-y divide-divisor border-y border-divisor">
          {USADOS.map(([titulo, texto]) => (
            <li key={titulo} className="py-3">
              <p className="font-semibold">{titulo}</p>
              <p className="text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="conta-nao-usa">
        <h2 id="conta-nao-usa" className="font-serif text-xl font-semibold">
          O que o sistema não usa
        </h2>
        <ul role="list" className="mt-3 divide-y divide-divisor border-y border-divisor">
          {NAO_USADOS.map(([titulo, texto]) => (
            <li key={titulo} className="py-3">
              <p className="font-semibold">{titulo}</p>
              <p className="text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="conta-revisao">
        <h2 id="conta-revisao" className="font-serif text-xl font-semibold">
          Como pedir revisão humana
        </h2>
        <p className="mt-2 max-w-[62ch]">
          Em cada oferta, o botão “Contestar a recomendação” pede uma revisão humana: você diz o que
          não está certo, a coordenação responde por escrito, e a contestação e a resposta ficam na
          trilha de auditoria. Contestar não muda a sua resposta à oferta. A resposta aparece em
          Contestações.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/medico/contestacoes" className="font-semibold underline underline-offset-4 hover:no-underline">
            Ver as minhas contestações
          </Link>
          <Link href="/ajuda" className="font-semibold underline underline-offset-4 hover:no-underline">
            Ver a ajuda e as perguntas frequentes
          </Link>
        </p>
      </section>
    </div>
  );
}
