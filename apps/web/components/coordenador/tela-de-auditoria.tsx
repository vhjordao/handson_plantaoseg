"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Download, Ruler, ScrollText, ShieldCheck, Sparkles, type LucideIcon } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Select } from "@/components/ui/field";
import { CabecalhoDoPainel, Painel } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { mensagemDoErro } from "@/lib/api/erros";
import { useAuditoria, useVagas, useVerificarCadeia } from "@/lib/api/hooks";
import type { AcaoAuditoria, RegistroAuditoria, VerificacaoCadeia } from "@/lib/api/types";
import { ROTULO_ACAO_AUDITORIA, ROTULO_ESPECIALIDADE, ROTULO_PAPEL_ATOR } from "@/lib/copy/rotulos";
import { trilhaEmCsv } from "@/lib/format/csv";
import { formatarDiaHora, formatarInteiro } from "@/lib/format/datas";
import { descreverVaga } from "./etiquetas-da-vaga";

/** De quem é a voz de cada ação: o modelo (IA), uma pessoa ou uma regra do sistema. */
const VOZ_DA_ACAO: Record<AcaoAuditoria, { tone: NonNullable<BadgeProps["tone"]>; icone: LucideIcon }> = {
  recommendation_generated: { tone: "ia", icone: Sparkles },
  explanation_generated: { tone: "ia", icone: Sparkles },
  extraction_confirmed: { tone: "humano", icone: BadgeCheck },
  recommendation_approved: { tone: "humano", icone: BadgeCheck },
  recommendation_rejected: { tone: "humano", icone: BadgeCheck },
  recommendation_restored: { tone: "humano", icone: BadgeCheck },
  explanation_feedback: { tone: "humano", icone: BadgeCheck },
  contestation_opened: { tone: "humano", icone: BadgeCheck },
  contestation_answered: { tone: "humano", icone: BadgeCheck },
  offer_accepted: { tone: "humano", icone: BadgeCheck },
  offer_declined: { tone: "humano", icone: BadgeCheck },
  shift_published: { tone: "regra", icone: Ruler },
  offer_sent: { tone: "regra", icone: Ruler },
  offer_expired: { tone: "regra", icone: Ruler },
  shift_uncovered: { tone: "regra", icone: Ruler },
};

function Acao({ acao }: { acao: AcaoAuditoria }) {
  const { tone, icone: Icone } = VOZ_DA_ACAO[acao] ?? { tone: "neutro", icone: Ruler };
  return (
    <Badge tone={tone}>
      <Icone aria-hidden="true" />
      {ROTULO_ACAO_AUDITORIA[acao] ?? acao}
    </Badge>
  );
}

const curto = (texto: string, n = 8) => (texto.length > n ? `${texto.slice(0, n)}…` : texto);

/** O tipo da entidade em português; o código original fica no CSV. */
const ENTIDADE: Record<string, string> = {
  shift: "vaga",
  shift_request: "pedido",
  recommendation: "recomendação",
  offer: "oferta",
  contestation: "contestação",
  explanation: "motivo",
};
const entidade = (tipo: string, id: string) => `${ENTIDADE[tipo] ?? tipo} ${curto(id, 14)}`;

function Detalhes({ registro }: { registro: RegistroAuditoria }) {
  const vazio = Object.keys(registro.detalhes).length === 0;
  if (vazio) return <span className="text-tinta-suave">—</span>;
  return (
    <details className="group">
      <summary className="inline-flex min-h-[var(--alvo-min)] cursor-pointer items-center rounded-campo text-sm font-semibold text-acento underline-offset-4 hover:underline">
        Ver detalhes <span className="sr-only">do registro {registro.seq}</span>
      </summary>
      <pre className="mt-1 max-w-[36rem] overflow-x-auto rounded-campo bg-recuo p-3 text-xs leading-5 whitespace-pre-wrap [overflow-wrap:anywhere] text-tinta">
        {JSON.stringify(registro.detalhes, null, 2)}
      </pre>
    </details>
  );
}

/** O resultado da verificação, dito com franqueza: inteira, inteira com lacunas, ou quebrada. */
function ResultadoDaVerificacao({ resultado }: { resultado: VerificacaoCadeia }) {
  if (!resultado.integra) {
    return (
      <Alert tone="erro" title={`A cadeia não confere a partir do registro nº ${resultado.primeiroInvalido}`}>
        O hash desse registro, ou o elo com o anterior, não bate. Algum registro foi alterado ou falta na sequência.
      </Alert>
    );
  }
  const lacunas = resultado.lacunas ?? 0;
  return (
    <Alert tone="sucesso" title="A cadeia confere">
      {lacunas > 0 ? (
        <>
          Os {formatarInteiro(resultado.registros)} registros que você vê conferem, um a um, no seu navegador (SHA-256), e
          cada elo entre vizinhos também. Outros {formatarInteiro(lacunas)} registros da cadeia são de outra organização e
          ficam fora da sua visão: neles, o elo não pode ser conferido daqui.
        </>
      ) : (
        <>Os {formatarInteiro(resultado.registros)} registros conferem no seu navegador (SHA-256), do primeiro ao último.</>
      )}
    </Alert>
  );
}

function baixar(nome: string, conteudo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/**
 * A auditoria (6.1): a trilha somente de inserção, do mais novo para o mais antigo, com filtro por
 * vaga (no endereço, `?vaga=`), exportação em CSV e a verificação da cadeia de hash no navegador.
 */
export function TelaDeAuditoria() {
  const parametros = useSearchParams();
  const roteador = useRouter();
  const caminho = usePathname();
  const vagaId = parametros.get("vaga");
  const vagas = useVagas();
  const trilha = useAuditoria(vagaId);
  const verificar = useVerificarCadeia();

  const registros = React.useMemo(() => [...(trilha.data ?? [])].sort((a, b) => b.seq - a.seq), [trilha.data]);
  const vagaEscolhida = vagas.data?.find((v) => v.id === vagaId) ?? null;

  const trocarVaga = (id: string) => {
    roteador.replace(id ? `${caminho}?vaga=${encodeURIComponent(id)}` : caminho, { scroll: false });
  };

  const exportar = () => {
    const nome = vagaId ? `auditoria-plantaoseguro-vaga-${vagaId.slice(0, 8)}.csv` : "auditoria-plantaoseguro.csv";
    baixar(nome, trilhaEmCsv([...registros].reverse()));
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <CabecalhoDePagina
        titulo="Auditoria"
        descricao="A trilha somente de inserção: quem fez, o quê, quando e com qual versão do modelo. Cada registro guarda o hash do anterior, então alterar um quebra a cadeia."
        acoes={
          <>
            <Button variant="secondary" onClick={exportar} disabled={registros.length === 0}>
              <Download aria-hidden="true" />
              Exportar CSV
            </Button>
            <Button variant="escuro" onClick={() => verificar.mutate()} loading={verificar.isPending}>
              <ShieldCheck aria-hidden="true" />
              Verificar a cadeia
            </Button>
          </>
        }
      />

      {/* A região de status já existe antes do resultado: é o que garante o anúncio. */}
      <div role="status" className="empty:hidden">
        {verificar.isSuccess ? <ResultadoDaVerificacao resultado={verificar.data} /> : null}
        {verificar.isError ? (
          <Alert tone="erro" title="Não foi possível verificar a cadeia">
            {mensagemDoErro(verificar.error, "Tente de novo em instantes. Se continuar, o sistema pode estar fora do ar.")}
          </Alert>
        ) : null}
      </div>

      <Painel aria-labelledby="trilha-titulo" className="grid grid-cols-1 gap-4">
        <CabecalhoDoPainel icone={ScrollText} tom="acao" id="trilha-titulo" titulo="Trilha de auditoria" />
        <Field
          id="filtro-vaga"
          label="Vaga"
          hint="Mostra só o que aconteceu com uma vaga: publicação, ordem sugerida, decisão e ofertas."
          className="max-w-xl"
        >
          {(aria) => (
            <Select {...aria} value={vagaId ?? ""} onChange={(e) => trocarVaga(e.target.value)}>
              <option value="">Todas as vagas (os 200 registros mais recentes)</option>
              {(vagas.data ?? []).map((vaga) => (
                <option key={vaga.id} value={vaga.id}>
                  {vaga.especialidade ? ROTULO_ESPECIALIDADE[vaga.especialidade] : "Vaga sem especialidade"},{" "}
                  {descreverVaga(vaga)}
                </option>
              ))}
            </Select>
          )}
        </Field>

        <p role="status" className="text-sm text-tinta-suave">
          {trilha.data
            ? vagaEscolhida
              ? `${formatarInteiro(registros.length)} registros desta vaga.`
              : `Mostrando os ${formatarInteiro(registros.length)} registros mais recentes.`
            : ""}
        </p>

        {trilha.isError ? (
          <Alert tone="erro" title="Não foi possível carregar a trilha">
            {mensagemDoErro(trilha.error, "Tente de novo em instantes. Se continuar, use o modo de demonstração.")}
          </Alert>
        ) : !trilha.data ? (
          <div role="status" className="grid gap-2">
            <span className="sr-only">Carregando a trilha…</span>
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : registros.length === 0 ? (
          <EmptyState icon={ScrollText} title="Nenhum registro" headingLevel="h3">
            Nada aconteceu com esta vaga ainda.
          </EmptyState>
        ) : (
          <>
            {/* Computador: tabela. */}
            <div
              role="region"
              aria-label="Tabela da trilha de auditoria"
              tabIndex={0}
              className="hidden overflow-x-auto rounded-campo md:block"
            >
              <table className="w-full text-left text-sm">
                <caption className="sr-only">Registros da trilha de auditoria, do mais novo para o mais antigo</caption>
                <thead className="text-tinta-suave">
                  <tr className="border-b border-divisor">
                    <th scope="col" className="py-2 pr-3 font-medium">Nº</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Quando</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Quem</th>
                    <th scope="col" className="py-2 pr-3 font-medium">O que</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Modelo</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Hash</th>
                    <th scope="col" className="py-2 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.seq} className="border-b border-divisor/70 align-top last:border-0">
                      <td className="tnum py-2.5 pr-3 font-semibold">{r.seq}</td>
                      <td className="tnum py-2.5 pr-3 whitespace-nowrap">{formatarDiaHora(r.ocorridoEm)}</td>
                      <td className="py-2.5 pr-3">
                        {ROTULO_PAPEL_ATOR[r.papelAtor]}
                        <span className="block text-xs text-tinta-suave" title={r.atorPseudoId}>
                          {curto(r.atorPseudoId)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Acao acao={r.acao} />
                        <span className="mt-1 block text-xs text-tinta-suave" title={r.entidadeId}>
                          {entidade(r.entidadeTipo, r.entidadeId)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">{r.modeloVersao ?? <span className="text-tinta-suave">—</span>}</td>
                      <td className="tnum py-2.5 pr-3 text-tinta-suave" title={r.hash}>
                        {curto(r.hash, 10)}
                      </td>
                      <td className="py-2.5">
                        <Detalhes registro={r} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Celular: um cartão por registro. */}
            <ol className="grid gap-2 md:hidden">
              {registros.map((r) => (
                <li key={r.seq} className="rounded-cartao border border-painel-borda bg-papel/80 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="tnum font-semibold">Nº {r.seq}</span>
                    <span className="tnum text-sm text-tinta-suave">{formatarDiaHora(r.ocorridoEm)}</span>
                  </div>
                  <div className="mt-2">
                    <Acao acao={r.acao} />
                  </div>
                  <dl className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                    <dt className="text-tinta-suave">Quem</dt>
                    <dd>
                      {ROTULO_PAPEL_ATOR[r.papelAtor]} {curto(r.atorPseudoId)}
                    </dd>
                    <dt className="text-tinta-suave">Sobre</dt>
                    <dd className="[overflow-wrap:anywhere]">{entidade(r.entidadeTipo, r.entidadeId)}</dd>
                    <dt className="text-tinta-suave">Modelo</dt>
                    <dd>{r.modeloVersao ?? "—"}</dd>
                    <dt className="text-tinta-suave">Hash</dt>
                    <dd className="tnum">{curto(r.hash, 10)}</dd>
                  </dl>
                  <div className="mt-1">
                    <Detalhes registro={r} />
                  </div>
                </li>
              ))}
            </ol>
          </>
        )}
      </Painel>
    </div>
  );
}
