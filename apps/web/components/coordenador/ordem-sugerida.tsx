"use client";

import * as React from "react";
import { SeloDecisaoHumana } from "@/components/dominio/selo-decisao-humana";
import { SugestaoCard, type EstadoDaSugestao } from "@/components/dominio/sugestao-card";
import { SuperficieVoz } from "@/components/dominio/superficie-voz";
import { VozTag } from "@/components/dominio/voz-tag";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { JustificativaObrigatoriaError, MIN_CARACTERES_JUSTIFICATIVA, mensagemDoErro } from "@/lib/api/erros";
import { useAprovar, useDesfazerPulo, usePolitica, usePular } from "@/lib/api/hooks";
import { useApi } from "@/lib/api/provider";
import type { Candidato, EstadoDaDecisao, Recomendacao, Vaga } from "@/lib/api/types";
import { DIALOGO_DE_DECISAO, ORDEM } from "@/lib/copy/coordenador";
import { formatarHora } from "@/lib/format/datas";
import { chancesParecidas } from "@/lib/format/sugestoes";
import { DialogoDeDecisao } from "./dialogo-de-decisao";
import { PainelDeMotivos } from "./painel-de-motivos";

/** O cargo entra no meio da frase do selo: "Decidido por Marina Alves, coordenação de escala, 9h". */
const noMeioDaFrase = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1);

/**
 * A tela mais importante: a ordem sugerida e a decisão. Enquanto ninguém decidiu, o contorno é
 * tracejado. Quando a pessoa confirma, o tracejado fecha, a cor passa ao verde e o selo assenta:
 * é o único movimento que a interface conta como seu. Nenhum nome vem marcado.
 */
export function OrdemSugerida({
  vaga,
  recomendacao,
  estado,
}: {
  vaga: Vaga;
  recomendacao: Recomendacao;
  estado: EstadoDaDecisao;
}) {
  const api = useApi();
  const { data: politica } = usePolitica();
  const aprovar = useAprovar();
  const pular = usePular();
  const desfazer = useDesfazerPulo();

  const { decisao, pulados } = estado;
  const aguardando = vaga.status === "aguardando_decisao";

  const [marcados, setMarcados] = React.useState<ReadonlySet<string>>(new Set());
  const [dialogoAberto, setDialogoAberto] = React.useState(false);
  const [justificativa, setJustificativa] = React.useState("");
  const [erroDaJustificativa, setErroDaJustificativa] = React.useState<string | null>(null);
  const [erroGeral, setErroGeral] = React.useState<string | null>(null);
  const [erroDeAcao, setErroDeAcao] = React.useState<string | null>(null);
  // O selo só assenta com movimento se a decisão aconteceu agora, não ao recarregar a página.
  const [decidiuAgora, setDecidiuAgora] = React.useState(false);

  const tituloRef = React.useRef<HTMLHeadingElement>(null);
  const aprovarRef = React.useRef<HTMLButtonElement>(null);
  const focoNaLista = React.useRef(false);

  const disponiveis = recomendacao.candidatos.filter((c) => !pulados.includes(c.medico.id));
  const selecionados = disponiveis.filter((c) => marcados.has(c.medico.id));
  const exigeJustificativa = selecionados.some((c) => c.alertas.length > 0);
  const parecidas = chancesParecidas(recomendacao.candidatos.map((c) => c.score));

  const marcar = (medicoId: string, marcado: boolean) =>
    setMarcados((atuais) => {
      const novos = new Set(atuais);
      if (marcado) novos.add(medicoId);
      else novos.delete(medicoId);
      return novos;
    });

  const confirmar = async () => {
    if (exigeJustificativa && justificativa.trim().length < MIN_CARACTERES_JUSTIFICATIVA) {
      setErroDaJustificativa(new JustificativaObrigatoriaError().message);
      return;
    }
    setErroDaJustificativa(null);
    setErroGeral(null);
    try {
      await aprovar.mutateAsync({
        vagaId: vaga.id,
        medicoIds: selecionados.map((c) => c.medico.id),
        justificativa: exigeJustificativa ? justificativa.trim() : undefined,
      });
      setDecidiuAgora(true);
      focoNaLista.current = true;
      setDialogoAberto(false);
    } catch (erro) {
      const mensagem = mensagemDoErro(erro, DIALOGO_DE_DECISAO.erroGeral);
      if (erro instanceof JustificativaObrigatoriaError) setErroDaJustificativa(mensagem);
      else setErroGeral(mensagem);
    }
  };

  const executar = async (acao: () => Promise<void>) => {
    setErroDeAcao(null);
    try {
      await acao();
    } catch (erro) {
      setErroDeAcao(mensagemDoErro(erro, ORDEM.acaoFalhou));
    }
  };

  const estadoDe = (candidato: Candidato): EstadoDaSugestao => {
    const id = candidato.medico.id;
    if (decisao) {
      const lugar = decisao.medicoIds.indexOf(id);
      if (lugar >= 0) return { tipo: "aprovado", lugar: lugar + 1, totalAprovados: decisao.medicoIds.length };
      return pulados.includes(id) ? { tipo: "pulado", podeDesfazer: false } : { tipo: "fora" };
    }
    if (pulados.includes(id)) return { tipo: "pulado", podeDesfazer: aguardando };
    return aguardando ? { tipo: "decidindo", selecionado: marcados.has(id) } : { tipo: "fora" };
  };

  return (
    <SuperficieVoz as="section" voz={decisao ? "humano" : "ia"} aria-labelledby="ordem-titulo">
      <div className="grid grid-cols-1 gap-3 p-4 md:px-5">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="ordem-titulo" ref={tituloRef} tabIndex={-1} className="font-serif text-xl font-semibold outline-none">
              {ORDEM.titulo(recomendacao.candidatos.length, recomendacao.totalElegiveis)}
            </h2>
            <VozTag voz={decisao ? "humano" : "ia"} />
          </div>

          {/*
            A região de status já existe antes da decisão, e visível para o leitor de tela: é o
            que garante o anúncio do selo. Por isso ela não usa `hidden`; vazia, só perde a margem.
          */}
          <div role="status" className="mt-3 empty:mt-0">
            {decisao ? (
              <SeloDecisaoHumana
                nome={decisao.decididoPor.nome}
                cargo={noMeioDaFrase(decisao.decididoPor.cargo)}
                hora={formatarHora(decisao.em)}
                animar={decidiuAgora}
                anunciar={false}
              />
            ) : null}
          </div>
        </div>

        {decisao?.excecao ? (
          <div className="text-sm">
            <p className="font-semibold">{ORDEM.excecaoTitulo}</p>
            <p>
              {ORDEM.excecaoAlerta} {decisao.excecao.alertas.join("; ")}.
            </p>
            <p className="break-words">
              {ORDEM.excecaoJustificativa} {decisao.excecao.justificativa}
            </p>
          </div>
        ) : null}

        <p className="text-sm text-tinta-suave">{ORDEM.modelo(recomendacao.modeloVersao)}</p>
        {!decisao && parecidas ? <p className="font-medium">{ORDEM.parecidas(parecidas.menor, parecidas.maior)}</p> : null}
        {erroDeAcao ? <Alert tone="erro">{erroDeAcao}</Alert> : null}
      </div>

      <ol role="list" className="grid grid-cols-1">
        {recomendacao.candidatos.map((candidato) => (
          <SugestaoCard
            key={candidato.medico.id}
            candidato={candidato}
            estado={estadoDe(candidato)}
            ocupado={
              (pular.isPending && pular.variables?.medicoId === candidato.medico.id) ||
              (desfazer.isPending && desfazer.variables?.medicoId === candidato.medico.id)
            }
            aoMarcar={(marcado) => marcar(candidato.medico.id, marcado)}
            aoPular={() =>
              void executar(async () => {
                await pular.mutateAsync({ vagaId: vaga.id, medicoId: candidato.medico.id });
                marcar(candidato.medico.id, false);
              })
            }
            aoDesfazer={() =>
              void executar(() => desfazer.mutateAsync({ vagaId: vaga.id, medicoId: candidato.medico.id }))
            }
            motivos={<PainelDeMotivos vagaId={vaga.id} candidato={candidato} />}
          />
        ))}
      </ol>

      <div className="grid grid-cols-1 gap-3 border-t border-divisor p-4 md:px-5">
        {aguardando ? (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p id="ajuda-aprovar" role="status" className="font-medium">
              {disponiveis.length === 0
                ? ORDEM.todosPulados
                : selecionados.length === 0
                  ? ORDEM.marqueUm
                  : ORDEM.escolhidos(selecionados.length)}
            </p>
            <Button
              ref={aprovarRef}
              variant="decision"
              size="lg"
              className="w-full md:w-auto"
              disabled={selecionados.length === 0}
              aria-describedby="ajuda-aprovar"
              onClick={() => {
                setErroGeral(null);
                setDialogoAberto(true);
              }}
            >
              {ORDEM.aprovar}
            </Button>
          </div>
        ) : null}
        <p className="text-sm text-tinta-suave">{ORDEM.neutralidade}</p>
      </div>

      <DialogoDeDecisao
        aberto={dialogoAberto}
        vaga={vaga}
        selecionados={selecionados}
        politica={politica}
        justificativa={justificativa}
        aoMudarJustificativa={setJustificativa}
        erroDaJustificativa={erroDaJustificativa}
        erroGeral={erroGeral}
        enviando={aprovar.isPending}
        aoConfirmar={() => void confirmar()}
        aoAlterar={() => {
          focoNaLista.current = true;
          setDialogoAberto(false);
        }}
        aoFechar={() => setDialogoAberto(false)}
        aoFecharFoco={(evento) => {
          // Depois de aprovar ou de "Alterar", o foco vai para a lista; senão, volta ao botão.
          evento.preventDefault();
          (focoNaLista.current ? tituloRef : aprovarRef).current?.focus();
          focoNaLista.current = false;
        }}
        simulacao={api?.modo === "demo"}
      />
    </SuperficieVoz>
  );
}
