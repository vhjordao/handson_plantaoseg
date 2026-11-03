import {
  ClipboardList,
  FilePlus2,
  Inbox,
  MessageSquareWarning,
  Scale,
  ScrollText,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface ItemDeNavegacao {
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Diz se a rota atual pertence a este item (a lista de vagas inclui o detalhe de uma vaga). */
  ativo: (caminho: string) => boolean;
}

export const NAV_COORDENADOR: ItemDeNavegacao[] = [
  {
    href: "/coordenador/vagas",
    rotulo: "Vagas",
    icone: ClipboardList,
    ativo: (c) => c === "/coordenador/vagas" || (c.startsWith("/coordenador/vagas/") && c !== "/coordenador/vagas/nova"),
  },
  {
    href: "/coordenador/vagas/nova",
    rotulo: "Nova vaga",
    icone: FilePlus2,
    ativo: (c) => c === "/coordenador/vagas/nova",
  },
  {
    href: "/coordenador/contestacoes",
    rotulo: "Contestações",
    icone: MessageSquareWarning,
    ativo: (c) => c.startsWith("/coordenador/contestacoes"),
  },
  {
    href: "/coordenador/auditoria",
    rotulo: "Auditoria",
    icone: ScrollText,
    ativo: (c) => c.startsWith("/coordenador/auditoria"),
  },
  {
    href: "/coordenador/equidade",
    rotulo: "Equidade",
    icone: Scale,
    ativo: (c) => c.startsWith("/coordenador/equidade"),
  },
];

export const NAV_MEDICO: ItemDeNavegacao[] = [
  {
    href: "/medico/ofertas",
    rotulo: "Ofertas",
    icone: Inbox,
    ativo: (c) => c.startsWith("/medico/ofertas"),
  },
  {
    href: "/medico/contestacoes",
    rotulo: "Contestações",
    icone: MessageSquareWarning,
    ativo: (c) => c.startsWith("/medico/contestacoes"),
  },
  {
    href: "/medico/conta",
    rotulo: "Minha conta",
    icone: UserRound,
    ativo: (c) => c.startsWith("/medico/conta"),
  },
];
