"use client";

import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CircleCheck,
  CircleX,
  FlaskConical,
  Hash,
  ListFilter,
  MapPin,
  Stethoscope,
  type LucideIcon,
} from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CabecalhoDePagina } from "@/components/ui/cabecalho-de-pagina";
import { Fato } from "@/components/ui/fato";
import { CabecalhoDoPainel, Painel, type TomDoIcone } from "@/components/ui/painel";
import { Skeleton } from "@/components/ui/skeleton";
import { useCredenciais } from "@/lib/api/hooks";
import { NaoImplementadoError } from "@/lib/api/plantao-api";
import type { Credenciais, SituacaoCredencial } from "@/lib/api/types";
import { CREDENCIAIS, ROTULO_STATUS_CRM, SITUACAO_CREDENCIAL } from "@/lib/copy/medico";
import { ROTULO_ESPECIALIDADE } from "@/lib/copy/rotulos";
import { formatarData } from "@/lib/format/datas";

/** O ícone e o tom de cada situação. O texto da etiqueta diz o estado; a cor só acompanha. */
const SITUACAO: Record<
  SituacaoCredencial,
  { icone: LucideIcon; tom: TomDoIcone; badge: "regra" | "atencao" | "erro" }
> = {
  em_dia: { icone: CircleCheck, tom: "acao", badge: "regra" },
  vence_em_breve: { icone: CircleAlert, tom: "atencao", badge: "atencao" },
  suspensa: { icone: CircleX, tom: "erro", badge: "erro" },
  vencida: { icone: CircleX, tom: "erro", badge: "erro" },
};

function Registro({ credenciais }: { credenciais: Credenciais }) {
  const { medico, situacao, validaAte, diasRestantes } = credenciais;
  const estado = SITUACAO[situacao];
  const IconeDoEstado = estado.icone;
  const dia = formatarData(validaAte);
  return (
    <Painel aria-labelledby="credenciais-crm">
      <CabecalhoDoPainel
        icone={BadgeCheck}
        tom={estado.tom}
        id="credenciais-crm"
        titulo={CREDENCIAIS.crmTitulo}
        acessorio={
          <Badge tone={estado.badge} data-situacao={situacao}>
            <IconeDoEstado aria-hidden="true" />
            {SITUACAO_CREDENCIAL[situacao].rotulo}
          </Badge>
        }
      />
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <Fato icone={Hash} rotulo={CREDENCIAIS.registro}>
          <span className="font-semibold [overflow-wrap:anywhere]">{medico.crm}</span>
        </Fato>
        {credenciais.uf ? (
          <Fato icone={MapPin} rotulo={CREDENCIAIS.uf}>
            <span className="font-semibold">{credenciais.uf}</span>
          </Fato>
        ) : null}
        <Fato icone={estado.icone} tom={estado.tom} rotulo={CREDENCIAIS.status}>
          <span className="font-semibold">{ROTULO_STATUS_CRM[credenciais.statusCrm]}</span>
          <span className="block text-sm text-tinta-suave">{CREDENCIAIS.fonte[credenciais.fonteDoStatus]}</span>
        </Fato>
        <Fato icone={CalendarClock} tom={estado.tom} rotulo={CREDENCIAIS.validade}>
          <span className="font-semibold">
            {diasRestantes < 0 ? CREDENCIAIS.venceu(dia) : CREDENCIAIS.validaAte(dia)}
          </span>
          <span className="block text-sm text-tinta-suave">
            {diasRestantes < 0 ? CREDENCIAIS.passou(-diasRestantes) : CREDENCIAIS.faltam(diasRestantes)}
            {". "}
            {CREDENCIAIS.validadeSimulada}.
          </span>
        </Fato>
      </dl>
    </Painel>
  );
}

function Especialidades({ credenciais }: { credenciais: Credenciais }) {
  const { especialidade, especialidadeSecundaria } = credenciais.medico;
  return (
    <Painel aria-labelledby="credenciais-especialidades">
      <CabecalhoDoPainel
        icone={Stethoscope}
        tom="acao"
        id="credenciais-especialidades"
        titulo={CREDENCIAIS.especialidadesTitulo}
      />
      <dl className="mt-4 grid gap-3">
        <div>
          <dt className="text-sm text-tinta-suave">{CREDENCIAIS.principal}</dt>
          <dd className="font-semibold">{ROTULO_ESPECIALIDADE[especialidade]}</dd>
        </div>
        <div>
          <dt className="text-sm text-tinta-suave">{CREDENCIAIS.secundaria}</dt>
          <dd className={especialidadeSecundaria ? "font-semibold" : "text-tinta-suave"}>
            {especialidadeSecundaria
              ? ROTULO_ESPECIALIDADE[especialidadeSecundaria]
              : CREDENCIAIS.semSecundaria}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-tinta-suave">{CREDENCIAIS.usoDaEspecialidade}</p>
    </Painel>
  );
}

/**
 * As credenciais do médico: o registro no CRM, o status do cadastro e a validade. É a conferência
 * de cadastro que a referência de mercado anuncia; aqui, com dados sintéticos e validade simulada.
 * O id vem da sessão, no servidor: a tela nunca escolhe de quem são as credenciais.
 */
export function TelaDeCredenciais({ medicoId }: { medicoId: string }) {
  const credenciais = useCredenciais(medicoId);

  let corpo: React.ReactNode;
  if (credenciais.error instanceof NaoImplementadoError) {
    corpo = <Alert tone="info">{CREDENCIAIS.naDemonstracao}</Alert>;
  } else if (credenciais.isError) {
    corpo = (
      <Alert tone="erro" title={CREDENCIAIS.erroTitulo}>
        <p>{CREDENCIAIS.erro}</p>
        <Button className="mt-3" variant="secondary" size="sm" onClick={() => void credenciais.refetch()}>
          Tentar de novo
        </Button>
      </Alert>
    );
  } else if (!credenciais.data) {
    corpo = (
      <div role="status">
        <span className="sr-only">{CREDENCIAIS.carregando}</span>
        <Skeleton className="h-56 rounded-cartao" />
      </div>
    );
  } else {
    const dados = credenciais.data;
    corpo = (
      <>
        <Registro credenciais={dados} />
        <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
          <Especialidades credenciais={dados} />
          <Painel aria-labelledby="credenciais-efeito">
            <CabecalhoDoPainel
              icone={ListFilter}
              tom="neutro"
              id="credenciais-efeito"
              titulo={CREDENCIAIS.efeitoTitulo}
            />
            <p className="mt-3 max-w-[62ch]">{SITUACAO_CREDENCIAL[dados.situacao].efeito}</p>
          </Painel>
        </div>
        <Painel aria-labelledby="credenciais-simulacao">
          <CabecalhoDoPainel
            icone={FlaskConical}
            tom="neutro"
            id="credenciais-simulacao"
            titulo={CREDENCIAIS.simulacaoTitulo}
          />
          <p className="mt-3 max-w-[68ch] text-tinta-suave">{CREDENCIAIS.simulacao}</p>
        </Painel>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      <CabecalhoDePagina titulo={CREDENCIAIS.titulo} descricao={CREDENCIAIS.descricao} className="mb-2" />
      {corpo}
    </div>
  );
}
