"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CampoExtraido, TextoComTrechos } from "@/components/dominio/campo-extraido";
import { VozTag } from "@/components/dominio/voz-tag";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ErrorSummary, type ErroDeCampo } from "@/components/ui/error-summary";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ForaDaGradeError, mensagemDoErro, MENSAGEM_FORA_DA_GRADE } from "@/lib/api/erros";
import {
  useConfirmarVaga,
  useExemplosDeVaga,
  useLerVaga,
  useUnidades,
  useVaga,
} from "@/lib/api/hooks";
import { useEstadoApi } from "@/lib/api/provider";
import {
  CHAVES_CAMPO,
  ESPECIALIDADES,
  LIMITE_TEXTO_VAGA,
  URGENCIAS,
  type ChaveCampo,
  type Leitura,
} from "@/lib/api/types";
import { AVISO_DADOS_REAIS } from "@/lib/copy/comum";
import {
  ERROS_DA_VAGA,
  ESCOLHA_DO_CAMPO,
  NOVA_VAGA,
  PERGUNTA_DO_CAMPO,
  ROTULO_SINAL,
  SINAIS_NO_TEXTO,
  VAGA,
} from "@/lib/copy/coordenador";
import { ROTULO_CAMPO, ROTULO_ESPECIALIDADE, ROTULO_URGENCIA } from "@/lib/copy/rotulos";
import { formatarInteiro } from "@/lib/format/datas";
import { InicioDaVaga } from "./inicio-da-vaga";

type Valores = Record<ChaveCampo, string>;

const VAZIO: Valores = { unidade: "", especialidade: "", inicio: "", fim: "", urgencia: "" };

/** O campo do navegador pede "AAAA-MM-DDTHH:MM", sem os segundos que o backend grava. */
function valoresDaLeitura(leitura: Leitura): Valores {
  const valores = { ...VAZIO };
  for (const campo of leitura.campos) {
    const valor = campo.valor ?? "";
    valores[campo.chave] = campo.chave === "inicio" || campo.chave === "fim" ? valor.slice(0, 16) : valor;
  }
  return valores;
}

/** O que a tela está conferindo. Sem `leitura`, é o formulário preenchido à mão. */
interface Conferencia {
  leitura: Leitura | null;
  /** A leitura falhou (ou foi simulada a falha): a tela diz isso sem culpar ninguém. */
  falhou: boolean;
}

function primeiraLetraMaiuscula(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** A janela que o seletor de data abre: no modo `demo`, o relógio é o simulado, não o de hoje. */
function janelaDaDemonstracao(agora: string): { min: string; max: string } {
  const noveDiasDepois = new Date(new Date(`${agora}Z`).getTime() + 9 * 24 * 60 * 60 * 1000);
  return { min: agora.slice(0, 16), max: noveDiasDepois.toISOString().slice(0, 16) };
}

/**
 * Nova vaga: a pessoa escreve o pedido, o sistema lê, ela confere campo a campo e só então
 * publica. Campo que não está no texto vira pergunta. Sem a confirmação dela, nada avança.
 */
export function NovaVaga({ rascunhoId }: { rascunhoId: string | null }) {
  const router = useRouter();
  const { api, falhou: apiFalhou, tentarDeNovo } = useEstadoApi();
  const { data: exemplos, isError: exemplosFalharam } = useExemplosDeVaga();
  const { data: unidades } = useUnidades();
  const { data: vagaDoLink } = useVaga(rascunhoId);
  const rascunho = vagaDoLink?.status === "rascunho" ? vagaDoLink : null;
  const ler = useLerVaga();
  const confirmar = useConfirmarVaga();

  // O texto só deixa de vir do rascunho quando a pessoa escreve: sem efeito para sincronizar.
  const [textoEscrito, setTextoEscrito] = React.useState<string | null>(null);
  const texto = textoEscrito ?? rascunho?.textoOriginal ?? "";
  const [conferencia, setConferencia] = React.useState<Conferencia | null>(null);
  const [valores, setValores] = React.useState<Valores>(VAZIO);
  const [erros, setErros] = React.useState<ErroDeCampo[]>([]);

  const conferirRef = React.useRef<HTMLHeadingElement>(null);
  const [leituras, setLeituras] = React.useState(0);
  React.useEffect(() => {
    if (leituras > 0) conferirRef.current?.focus();
  }, [leituras]);

  const abrirConferencia = (nova: Conferencia) => {
    setConferencia(nova);
    setValores(nova.leitura ? valoresDaLeitura(nova.leitura) : VAZIO);
    setErros([]);
    setLeituras((n) => n + 1);
  };

  const lerAVaga = async () => {
    if (!texto.trim()) {
      setErros([{ id: "texto-vaga", mensagem: ERROS_DA_VAGA.textoVazio }]);
      return;
    }
    try {
      abrirConferencia({ leitura: await ler.mutateAsync(texto), falhou: false });
    } catch {
      abrirConferencia({ leitura: null, falhou: true });
    }
  };

  const original = conferencia?.leitura ? valoresDaLeitura(conferencia.leitura) : VAZIO;
  const editados = CHAVES_CAMPO.filter((chave) => valores[chave] !== original[chave]);
  const textoMudou = Boolean(conferencia?.leitura && conferencia.leitura.texto !== texto);

  const validar = (): ErroDeCampo[] => {
    const novos: ErroDeCampo[] = [];
    if (textoMudou) novos.push({ id: "texto-vaga", mensagem: ERROS_DA_VAGA.textoMudou });
    if (!valores.unidade) novos.push({ id: "campo-unidade", mensagem: ERROS_DA_VAGA.unidade });
    if (!valores.especialidade) novos.push({ id: "campo-especialidade", mensagem: ERROS_DA_VAGA.especialidade });
    if (!valores.inicio) novos.push({ id: "campo-inicio", mensagem: ERROS_DA_VAGA.inicio });
    if (!valores.fim) novos.push({ id: "campo-fim", mensagem: ERROS_DA_VAGA.fim });
    if (valores.inicio && valores.fim && valores.fim <= valores.inicio) {
      novos.push({ id: "campo-fim", mensagem: ERROS_DA_VAGA.fimAntesDoInicio });
    }
    return novos;
  };

  const confirmarAVaga = async (evento: React.FormEvent) => {
    evento.preventDefault();
    const novos = validar();
    setErros(novos);
    if (novos.length > 0) return;
    try {
      const { vaga, jaExistia } = await confirmar.mutateAsync({
        texto,
        unidadeId: valores.unidade,
        especialidade: valores.especialidade as (typeof ESPECIALIDADES)[number],
        inicio: valores.inicio,
        fim: valores.fim,
        urgencia: (valores.urgencia || null) as (typeof URGENCIAS)[number] | null,
        editados,
        rascunhoId: rascunho?.id,
      });
      router.push(`/coordenador/vagas/${vaga.id}${jaExistia ? "?existente=1" : ""}`);
    } catch (erro) {
      setErros([
        {
          id: erro instanceof ForaDaGradeError ? "campo-inicio" : "texto-vaga",
          mensagem: mensagemDoErro(erro, ERROS_DA_VAGA.publicarFalhou),
        },
      ]);
    }
  };

  const erroDe = (id: string) => erros.find((erro) => erro.id === id)?.mensagem ?? null;
  const leitura = conferencia?.leitura ?? null;
  const janela = api?.modo === "demo" ? janelaDaDemonstracao(api.agora()) : undefined;

  const propsDoCampo = (chave: ChaveCampo) => {
    const campo = leitura?.campos.find((c) => c.chave === chave) ?? null;
    const trecho = campo?.trecho && leitura ? leitura.texto.slice(campo.trecho.inicio, campo.trecho.fim) : null;
    const faltou = campo?.origem === "nao_achei" || !leitura;
    return {
      id: `campo-${chave}`,
      campo,
      fonte: leitura?.fonte ?? null,
      // Quando a leitura não achou, a tela pergunta em vez de assumir.
      rotulo: faltou && leitura ? PERGUNTA_DO_CAMPO[chave] : ROTULO_CAMPO[chave],
      editado: Boolean(leitura) && editados.includes(chave),
      trecho: editados.includes(chave) ? null : trecho,
      erro: erroDe(`campo-${chave}`),
    };
  };

  const mudar = (chave: ChaveCampo) => (evento: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setValores((atuais) => ({ ...atuais, [chave]: evento.target.value }));

  if (apiFalhou) {
    return (
      <div className="mx-auto w-full max-w-[760px]">
        <h1 className="sr-only">{NOVA_VAGA.titulo}</h1>
        <Alert tone="erro" title={VAGA.erroTitulo}>
          <p>{VAGA.erro}</p>
          <Button className="mt-3" variant="secondary" size="sm" onClick={tentarDeNovo}>
            {VAGA.tentarDeNovo}
          </Button>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-[760px] grid-cols-1 gap-6">
      <ErrorSummary erros={erros} />
      <InicioDaVaga>
        <h1 className="font-serif text-3xl font-semibold">{NOVA_VAGA.titulo}</h1>
        <p className="mt-1 max-w-[60ch] text-tinta-suave">{NOVA_VAGA.apresentacao}</p>
      </InicioDaVaga>

      <section aria-labelledby="escrever-titulo" className="grid grid-cols-1 gap-4">
        <h2 id="escrever-titulo" className="font-serif text-xl font-semibold">
          {NOVA_VAGA.tituloEscrever}
        </h2>
        {rascunho ? <Alert tone="info">{NOVA_VAGA.continuandoRascunho}</Alert> : null}
        <Field
          id="texto-vaga"
          label={NOVA_VAGA.rotuloTexto}
          hint={`${AVISO_DADOS_REAIS} Até ${formatarInteiro(LIMITE_TEXTO_VAGA)} caracteres.`}
          error={erroDe("texto-vaga")}
        >
          {(aria) => (
            <Textarea
              {...aria}
              value={texto}
              // O campo cresce com o texto, para o pedido inteiro ficar à vista no celular.
              className="field-sizing-content"
              maxLength={LIMITE_TEXTO_VAGA}
              onChange={(evento) => setTextoEscrito(evento.target.value)}
            />
          )}
        </Field>

        <div className="grid grid-cols-1 gap-2">
          <p id="exemplos-titulo" className="font-semibold">
            {NOVA_VAGA.exemplos}
          </p>
          {exemplos ? (
            <ul role="list" aria-labelledby="exemplos-titulo" className="flex flex-wrap gap-2">
              {exemplos.map((exemplo) => (
                <li key={exemplo.id}>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setTextoEscrito(exemplo.texto);
                      setConferencia(null);
                      setErros([]);
                    }}
                  >
                    {exemplo.rotulo}
                  </Button>
                </li>
              ))}
            </ul>
          ) : exemplosFalharam ? null : (
            <Skeleton className="h-11 max-w-md" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Button loading={ler.isPending} disabled={!api} onClick={() => void lerAVaga()}>
            {NOVA_VAGA.ler}
          </Button>
          <Button
            variant="link"
            className="min-h-[var(--alvo-min)] px-0"
            onClick={() => abrirConferencia({ leitura: null, falhou: false })}
          >
            {NOVA_VAGA.preencherAMao}
          </Button>
          {api?.modo === "demo" ? (
            <Button
              variant="link"
              className="min-h-[var(--alvo-min)] px-0"
              onClick={() => abrirConferencia({ leitura: null, falhou: true })}
            >
              {NOVA_VAGA.simularFalha}
            </Button>
          ) : null}
        </div>
      </section>

      {conferencia ? (
        <form noValidate onSubmit={(evento) => void confirmarAVaga(evento)} aria-labelledby="conferir-titulo" className="grid grid-cols-1 gap-4 border-t border-divisor pt-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="conferir-titulo" ref={conferirRef} tabIndex={-1} className="font-serif text-xl font-semibold outline-none">
                {leitura ? NOVA_VAGA.tituloConferir : NOVA_VAGA.tituloPreencher}
              </h2>
              {leitura ? (
                <VozTag voz={leitura.fonte === "llm" ? "ia" : "regra"}>
                  {leitura.fonte === "llm" ? NOVA_VAGA.leituraPelaIA : NOVA_VAGA.leituraPorRegras}
                </VozTag>
              ) : null}
            </div>
            {/* Vazia, a região só perde a margem: continua lá para o aviso ser anunciado. */}
            <p role="status" className="mt-2 font-medium text-atencao empty:mt-0">
              {textoMudou ? NOVA_VAGA.textoMudou : ""}
            </p>
          </div>

          {conferencia.falhou ? <Alert tone="info">{NOVA_VAGA.falhaDaLeitura}</Alert> : null}
          {leitura?.erroIA ? <Alert tone="info">{NOVA_VAGA.iaIndisponivel}</Alert> : null}
          {leitura && leitura.sinais.length > 0 ? (
            <Alert tone="atencao" title={SINAIS_NO_TEXTO.titulo}>
              <p>{SINAIS_NO_TEXTO.explicacao}</p>
              <p className="mt-1">{SINAIS_NO_TEXTO.encontrado}</p>
              <ul className="list-disc pl-5">
                {leitura.sinais.map((sinal) => (
                  <li key={sinal}>{ROTULO_SINAL[sinal] ?? sinal}</li>
                ))}
              </ul>
            </Alert>
          ) : null}

          {leitura ? (
            <div className="rounded-cartao border border-divisor bg-papel p-3">
              <p className="mb-1 text-sm text-tinta-suave">{NOVA_VAGA.oQueFoiLido}</p>
              <TextoComTrechos
                texto={leitura.texto}
                trechos={leitura.campos.flatMap((campo) => (campo.trecho ? [campo.trecho] : []))}
              />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <CampoExtraido {...propsDoCampo("unidade")}>
              {(aria) => (
                <Select {...aria} value={valores.unidade} onChange={mudar("unidade")}>
                  <option value="">{ESCOLHA_DO_CAMPO.unidade}</option>
                  {unidades?.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </Select>
              )}
            </CampoExtraido>
            <CampoExtraido {...propsDoCampo("especialidade")}>
              {(aria) => (
                <Select {...aria} value={valores.especialidade} onChange={mudar("especialidade")}>
                  <option value="">{ESCOLHA_DO_CAMPO.especialidade}</option>
                  {ESPECIALIDADES.map((especialidade) => (
                    <option key={especialidade} value={especialidade}>
                      {ROTULO_ESPECIALIDADE[especialidade]}
                    </option>
                  ))}
                </Select>
              )}
            </CampoExtraido>
            <CampoExtraido {...propsDoCampo("inicio")}>
              {(aria) => (
                <Input {...aria} type="datetime-local" {...janela} value={valores.inicio} onChange={mudar("inicio")} />
              )}
            </CampoExtraido>
            <CampoExtraido {...propsDoCampo("fim")}>
              {(aria) => (
                <Input {...aria} type="datetime-local" {...janela} value={valores.fim} onChange={mudar("fim")} />
              )}
            </CampoExtraido>
            <CampoExtraido {...propsDoCampo("urgencia")}>
              {(aria) => (
                <Select {...aria} value={valores.urgencia} onChange={mudar("urgencia")}>
                  <option value="">{NOVA_VAGA.naoInformada}</option>
                  {URGENCIAS.map((urgencia) => (
                    <option key={urgencia} value={urgencia}>
                      {primeiraLetraMaiuscula(ROTULO_URGENCIA[urgencia])}
                    </option>
                  ))}
                </Select>
              )}
            </CampoExtraido>
          </div>

          {api?.modo === "demo" ? <p className="text-sm text-tinta-suave">{MENSAGEM_FORA_DA_GRADE}</p> : null}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="submit" loading={confirmar.isPending}>
              {NOVA_VAGA.confirmar}
            </Button>
            <p className="text-sm text-tinta-suave">{NOVA_VAGA.semConfirmacao}</p>
          </div>
        </form>
      ) : null}
    </div>
  );
}
