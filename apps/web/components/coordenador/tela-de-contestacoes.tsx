"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BadgeCheck, MessageSquareWarning, Sparkles } from "lucide-react";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { VozTag } from "@/components/dominio/voz-tag";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Textarea } from "@/components/ui/field";
import { IconeEmCirculo } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { mensagemDoErro } from "@/lib/api/erros";
import { useContestacoes, useResponderContestacao, useVagas } from "@/lib/api/hooks";
import type { Contestacao, Vaga } from "@/lib/api/types";
import { ROTULO_ESPECIALIDADE, ROTULO_MOTIVO_CONTESTACAO } from "@/lib/copy/rotulos";
import { formatarDiaHora } from "@/lib/format/datas";
import { cn } from "@/lib/utils";
import { descreverVaga } from "./etiquetas-da-vaga";

const FILTROS = [
  { id: "abertas", rotulo: "Esperando resposta", serve: (c: Contestacao) => c.status === "aberta" },
  { id: "respondidas", rotulo: "Respondidas", serve: (c: Contestacao) => c.status === "respondida" },
  { id: "todas", rotulo: "Todas", serve: () => true },
] as const;

const LIMITE_RESPOSTA = 1000;

function Resposta({ contestacao }: { contestacao: Contestacao }) {
  const [texto, setTexto] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const responder = useResponderContestacao();
  const id = `resposta-${contestacao.id}`;

  const enviar = (evento: React.FormEvent) => {
    evento.preventDefault();
    if (texto.trim().length < 10) {
      setErro("Escreva a resposta, com pelo menos 10 caracteres.");
      return;
    }
    setErro(null);
    responder.mutate(
      { id: contestacao.id, texto },
      { onError: (e) => setErro(mensagemDoErro(e, "Não foi possível enviar a resposta. Tente de novo.")) },
    );
  };

  return (
    <form noValidate onSubmit={enviar} className="mt-4 grid gap-3 border-t border-divisor pt-4">
      <Field
        id={id}
        label="Sua resposta"
        hint="O médico vê esta resposta em Contestações. Ela fica na trilha de auditoria e não pode ser editada depois. Não escreva nome, CRM ou telefone."
        error={erro}
      >
        {(aria) => (
          <Textarea
            {...aria}
            value={texto}
            maxLength={LIMITE_RESPOSTA}
            onChange={(e) => setTexto(e.target.value)}
            rows={4}
          />
        )}
      </Field>
      <div>
        <Button type="submit" variant="decision" loading={responder.isPending}>
          <BadgeCheck aria-hidden="true" />
          Enviar resposta
        </Button>
      </div>
    </form>
  );
}

function CartaoDaContestacao({ contestacao: c, vaga }: { contestacao: Contestacao; vaga: Vaga | undefined }) {
  const tituloId = `contestacao-${c.id}`;
  const respondida = c.status === "respondida";
  return (
    <article aria-labelledby={tituloId} className="superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <IconeEmCirculo icone={MessageSquareWarning} tom={respondida ? "humano" : "atencao"} />
          <div className="min-w-0">
            <h2 id={tituloId} className="font-titulo text-lg font-semibold">
              {ROTULO_MOTIVO_CONTESTACAO[c.motivo]}
            </h2>
            <p className="text-sm text-tinta-suave">
              Protocolo {c.protocolo}. Enviada em {formatarDiaHora(c.criadaEm)}.
            </p>
          </div>
        </div>
        <Badge tone={respondida ? "humano" : "atencao"}>{respondida ? "Respondida" : "Esperando resposta"}</Badge>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-tinta-suave">Médico</dt>
          <dd className="font-medium">
            {c.medico.nome} <span className="font-normal text-tinta-suave">({c.medico.crm}, fictício)</span>
          </dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">Vaga</dt>
          <dd>
            {vaga ? (
              <>
                {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga"}, {descreverVaga(vaga)}.{" "}
              </>
            ) : null}
            <Link
              href={`/coordenador/vagas/${c.vagaId}`}
              className="inline-flex min-h-[var(--alvo-min)] items-center font-semibold text-acento underline underline-offset-4 hover:no-underline"
            >
              Abrir a vaga
            </Link>
          </dd>
        </div>
      </dl>

      <h3 className="mt-3 text-sm font-semibold">O relato do médico</h3>
      <p className="mt-1 break-words">{c.texto}</p>

      <SuperficieVoz voz="ia" className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles aria-hidden="true" className="size-4 text-ia" />
            A recomendação contestada: {c.recomendacao.posicao}º na ordem sugerida
          </h3>
          <VozTag voz="ia" />
        </div>
        <p className="mt-2">{c.recomendacao.explicacao.texto || "Sem o texto do motivo."}</p>
      </SuperficieVoz>

      {c.resposta ? (
        <SuperficieVoz voz="humano" className="mt-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Resposta da coordenação</h3>
            <VozTag voz="humano" />
          </div>
          <p className="mt-2 break-words">{c.resposta.texto}</p>
          <p className="mt-1 text-sm text-tinta-suave">
            {c.resposta.porNome}, em {formatarDiaHora(c.resposta.em)}. Registrada na trilha de auditoria.
          </p>
        </SuperficieVoz>
      ) : (
        <Resposta contestacao={c} />
      )}
    </article>
  );
}

/**
 * A caixa de contestações do coordenador (6.2): o relato do médico, a recomendação contestada e
 * a resposta, que fica na trilha (`contestation_answered`). O filtro fica no endereço (`?status=`).
 */
export function TelaDeContestacoesDoCoordenador() {
  const parametros = useSearchParams();
  const caminho = usePathname();
  const contestacoes = useContestacoes();
  const vagas = useVagas();
  const lista = contestacoes.data ?? [];
  const escolhido = FILTROS.find((f) => f.id === parametros.get("status")) ?? FILTROS[0];
  const visiveis = lista.filter(escolhido.serve);
  const vagaDe = (id: string) => vagas.data?.find((v) => v.id === id);

  let corpo: React.ReactNode;
  if (contestacoes.isError) {
    corpo = (
      <Alert tone="erro" title="Não foi possível carregar as contestações">
        <p>Tente de novo em instantes.</p>
        <Button className="mt-3" variant="secondary" size="sm" onClick={() => void contestacoes.refetch()}>
          Tentar de novo
        </Button>
      </Alert>
    );
  } else if (!contestacoes.data) {
    corpo = (
      <div role="status">
        <span className="sr-only">Carregando as contestações…</span>
        <Skeleton className="h-48 rounded-cartao" />
      </div>
    );
  } else if (visiveis.length === 0) {
    corpo = (
      <EmptyState
        icon={MessageSquareWarning}
        title={escolhido.id === "abertas" ? "Nenhuma contestação esperando resposta" : "Nenhuma contestação neste filtro"}
      >
        Quando um médico discordar de uma recomendação, o pedido aparece aqui, com o relato e o motivo que o sistema
        deu para sugeri-lo.
      </EmptyState>
    );
  } else {
    corpo = (
      <ul role="list" className="grid gap-3">
        {visiveis.map((c) => (
          <li key={c.id}>
            <CartaoDaContestacao contestacao={c} vaga={vagaDe(c.vagaId)} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[960px] grid-cols-1 gap-4">
      <CabecalhoDePagina
        titulo="Contestações"
        descricao="Quando um médico discorda de uma recomendação, o pedido chega aqui. A sua resposta fica na trilha de auditoria, e o médico a vê na tela dele."
      />
      <nav aria-label="Filtrar as contestações">
        <ul role="list" className="flex max-w-full flex-wrap gap-1.5">
          {FILTROS.map((filtro) => {
            const ativo = filtro.id === escolhido.id;
            return (
              <li key={filtro.id}>
                <Link
                  href={filtro.id === "abertas" ? caminho : `${caminho}?status=${filtro.id}`}
                  aria-current={ativo ? "true" : undefined}
                  scroll={false}
                  className={cn(
                    "inline-flex min-h-[var(--alvo-min)] items-center gap-2 rounded-full border px-3.5 text-sm transition-[background-color,color,box-shadow] duration-150",
                    ativo
                      ? "border-acento bg-acento font-semibold text-sobre-acento shadow-botao"
                      : "border-painel-borda bg-papel/60 font-medium text-tinta hover:bg-papel",
                  )}
                >
                  {filtro.rotulo}
                  <span className="tnum text-sm">{lista.filter(filtro.serve).length}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <p role="status" className="text-sm text-tinta-suave">
        {contestacoes.data ? `Mostrando ${visiveis.length} de ${lista.length}.` : ""}
      </p>
      {corpo}
    </div>
  );
}
