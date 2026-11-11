import {
  ClipboardList,
  FilePlus2,
  Inbox,
  LayoutDashboard,
  MessageSquareWarning,
  Scale,
  ScrollText,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export type AreaDeNavegacao = "coordenador" | "medico";

export interface ItemDeNavegacao {
  /** Identificador estável: é o que atravessa a fronteira servidor/cliente (funções não atravessam). */
  id: string;
  href: string;
  rotulo: string;
  icone: LucideIcon;
  /** Diz se a rota atual pertence a este item (a lista de vagas inclui o detalhe de uma vaga). */
  ativo: (caminho: string) => boolean;
}

const NAV_COORDENADOR: ItemDeNavegacao[] = [
  {
    id: "vagas",
    href: "/coordenador/vagas",
    rotulo: "Vagas",
    icone: ClipboardList,
    ativo: (c) =>
      c === "/coordenador/vagas" ||
      (c.startsWith("/coordenador/vagas/") && c !== "/coordenador/vagas/nova"),
  },
  {
    id: "nova-vaga",
    href: "/coordenador/vagas/nova",
    rotulo: "Nova vaga",
    icone: FilePlus2,
    ativo: (c) => c === "/coordenador/vagas/nova",
  },
  {
    id: "contestacoes",
    href: "/coordenador/contestacoes",
    rotulo: "Contestações",
    icone: MessageSquareWarning,
    ativo: (c) => c.startsWith("/coordenador/contestacoes"),
  },
  {
    id: "auditoria",
    href: "/coordenador/auditoria",
    rotulo: "Auditoria",
    icone: ScrollText,
    ativo: (c) => c.startsWith("/coordenador/auditoria"),
  },
  {
    id: "equidade",
    href: "/coordenador/equidade",
    rotulo: "Equidade",
    icone: Scale,
    ativo: (c) => c.startsWith("/coordenador/equidade"),
  },
];

const NAV_MEDICO: ItemDeNavegacao[] = [
  {
    id: "inicio",
    href: "/medico",
    rotulo: "Início",
    icone: LayoutDashboard,
    ativo: (c) => c === "/medico",
  },
  {
    id: "ofertas",
    href: "/medico/ofertas",
    rotulo: "Ofertas",
    icone: Inbox,
    ativo: (c) => c.startsWith("/medico/ofertas"),
  },
  {
    id: "contestacoes",
    href: "/medico/contestacoes",
    rotulo: "Contestações",
    icone: MessageSquareWarning,
    ativo: (c) => c.startsWith("/medico/contestacoes"),
  },
  {
    id: "conta",
    href: "/medico/conta",
    rotulo: "Minha conta",
    icone: UserRound,
    ativo: (c) => c.startsWith("/medico/conta"),
  },
];

export function itensDaArea(area: AreaDeNavegacao): ItemDeNavegacao[] {
  return area === "coordenador" ? NAV_COORDENADOR : NAV_MEDICO;
}

export function encontrarItem(area: AreaDeNavegacao, id: string): ItemDeNavegacao | undefined {
  return itensDaArea(area).find((item) => item.id === id);
}
