import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, ListChecks, MessageSquareWarning, ShieldCheck, UserLock } from "lucide-react";
import { BaixarMeusDados } from "@/components/medico/baixar-meus-dados";
import { CabecalhoDoPainel, Painel } from "@/components/ui/painel";
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

/** O nível de risco (Res. CFM 2.454, art. 13) e o que a LGPD pede que o titular saiba. */
const DADOS_E_DIREITOS = [
  [
    "Nível de risco: médio (preliminar)",
    "O sistema ordena pessoas e apoia uma decisão operacional importante, mas não executa nada sozinho: sem a aprovação do coordenador, nenhuma oferta sai. A classificação formal é do hospital.",
  ],
  [
    "Quem responde pelos seus dados",
    "O hospital, que decide sobre o tratamento. A plataforma trata os dados por instrução dele. O contato do encarregado do hospital vem no contrato; nesta demonstração não há hospital real.",
  ],
  [
    "O que fica guardado",
    "O seu cadastro, a disponibilidade que você declarou, as ofertas e as suas respostas, as contestações e uma trilha de auditoria que só traz um pseudônimo. Nenhum dado de paciente. O prazo de guarda ainda não foi definido e será combinado com o hospital antes de qualquer dado real.",
  ],
  [
    "Seus direitos (LGPD, art. 18)",
    "Acesso: baixe os seus dados abaixo. Correção, eliminação e informação sobre com quem os dados são compartilhados: peça ao encarregado do hospital. Revisão humana de uma recomendação: use a contestação.",
  ],
] as const;

/** As iniciais do nome, para o círculo do perfil (os dados são fictícios e não há foto). */
function iniciais(nome: string): string {
  const partes = nome.split(" ").filter(Boolean);
  return `${partes[0]?.[0] ?? ""}${partes.length > 1 ? partes[partes.length - 1][0] : ""}`.toUpperCase();
}

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
    <div className="grid grid-cols-1 gap-3">
      <div className="mb-2">
        <h1 className="font-titulo text-[1.75rem] leading-9 font-medium sm:text-[2rem] sm:leading-10">
          Minha conta e transparência
        </h1>
        <p className="mt-2 text-tinta-suave">
          O que o sistema sabe sobre você, o que usa e o que nunca usa.
        </p>
      </div>

      {medico ? (
        <Painel aria-label="Seu perfil" className="flex items-start gap-4">
          <span
            aria-hidden="true"
            className="inline-flex size-16 shrink-0 items-center justify-center rounded-full bg-acento-tom text-xl font-semibold text-acento-forte shadow-cartao"
          >
            {iniciais(medico.nome)}
          </span>
          <div className="min-w-0">
          <h2 className="font-titulo text-xl font-semibold">{medico.nome}</h2>
          <p className="mt-1 text-tinta-suave">
            {ROTULO_ESPECIALIDADE[medico.especialidade]}
            {medico.especialidadeSecundaria
              ? `, com ${ROTULO_ESPECIALIDADE[medico.especialidadeSecundaria].toLowerCase()} como secundária`
              : ""}
          </p>
          <p className="text-tinta-suave">{medico.crm}</p>
          <p className="mt-2">
            <Link
              href="/medico/conta/credenciais"
              className="inline-flex min-h-[var(--alvo-min)] items-center gap-2 font-semibold underline underline-offset-4 hover:no-underline"
            >
              <BadgeCheck aria-hidden="true" className="size-[18px] shrink-0" />
              Ver as minhas credenciais
            </Link>
          </p>
          <p className="mt-2 text-sm text-tinta-suave">
            Persona fictícia. Os dados desta demonstração são todos sintéticos.
          </p>
          </div>
        </Painel>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">

      <Painel aria-labelledby="conta-usa">
        <CabecalhoDoPainel icone={ListChecks} tom="ia" id="conta-usa" titulo="O que o sistema usa para sugerir você" />
        <ul role="list" className="mt-3 divide-y divide-divisor">
          {USADOS.map(([titulo, texto]) => (
            <li key={titulo} className="py-3">
              <p className="font-semibold">{titulo}</p>
              <p className="text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </Painel>

      <Painel aria-labelledby="conta-nao-usa">
        <CabecalhoDoPainel icone={ShieldCheck} tom="humano" id="conta-nao-usa" titulo="O que o sistema não usa" />
        <ul role="list" className="mt-3 divide-y divide-divisor">
          {NAO_USADOS.map(([titulo, texto]) => (
            <li key={titulo} className="py-3">
              <p className="font-semibold">{titulo}</p>
              <p className="text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ul>
      </Painel>
      </div>

      <Painel aria-labelledby="conta-dados">
        <CabecalhoDoPainel icone={UserLock} tom="humano" id="conta-dados" titulo="Seus dados e seus direitos" />
        <dl className="mt-3 grid max-w-[68ch] gap-3">
          {DADOS_E_DIREITOS.map(([titulo, texto]) => (
            <div key={titulo}>
              <dt className="font-semibold">{titulo}</dt>
              <dd className="text-tinta-suave">{texto}</dd>
            </div>
          ))}
        </dl>
        {medico ? <BaixarMeusDados medico={medico} /> : null}
      </Painel>

      <Painel aria-labelledby="conta-revisao">
        <CabecalhoDoPainel icone={MessageSquareWarning} tom="acao" id="conta-revisao" titulo="Como pedir revisão humana" />
        <p className="mt-3 max-w-[62ch]">
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
      </Painel>
    </div>
  );
}
