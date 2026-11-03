import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LegendaVozes } from "./legenda-vozes";
import { SeloDecisaoHumana } from "./selo-decisao-humana";
import { SuperficieVoz } from "./superficie-voz";
import { VozTag } from "./voz-tag";

describe("SuperficieVoz", () => {
  it("a voz da IA tem contorno tracejado (SVG) e a decisão humana também, mas contínua", () => {
    const { container, rerender } = render(<SuperficieVoz voz="ia">sugestão</SuperficieVoz>);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz).toHaveAttribute("data-voz", "ia");
    expect(raiz.querySelector("svg.contorno rect.contorno-rect")).not.toBeNull();

    // Mudar a voz é o que fecha o tracejado (a transição está em globals.css).
    rerender(<SuperficieVoz voz="humano">sugestão</SuperficieVoz>);
    expect(container.firstElementChild).toHaveAttribute("data-voz", "humano");
  });

  it("a regra do sistema é só uma linha fina, sem contorno de destaque", () => {
    const { container } = render(<SuperficieVoz voz="regra">limite</SuperficieVoz>);
    expect(container.querySelector("svg.contorno")).toBeNull();
    expect(container.firstElementChild).toHaveClass("border");
  });

  it("o contorno decorativo fica escondido do leitor de tela", () => {
    const { container } = render(<SuperficieVoz voz="ia">x</SuperficieVoz>);
    expect(container.querySelector("svg.contorno")).toHaveAttribute("aria-hidden", "true");
  });

  it("aceita outra etiqueta HTML, como li dentro de uma lista", () => {
    render(
      <ul>
        <SuperficieVoz as="li" voz="ia">
          item
        </SuperficieVoz>
      </ul>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("item");
  });
});

describe("VozTag", () => {
  it("diz em texto, e não só em cor, quem falou", () => {
    render(
      <>
        <VozTag voz="ia" />
        <VozTag voz="humano" />
        <VozTag voz="regra" />
      </>,
    );
    expect(screen.getByText("Sugestão da IA")).toBeInTheDocument();
    expect(screen.getByText("Decisão humana")).toBeInTheDocument();
    expect(screen.getByText("Regra do sistema")).toBeInTheDocument();
  });

  it("deixa trocar o texto sem perder a forma da voz", () => {
    render(<VozTag voz="humano">Você decide</VozTag>);
    expect(screen.getByText("Você decide")).toBeInTheDocument();
  });
});

describe("SeloDecisaoHumana", () => {
  it("mostra quem decidiu, o cargo e a hora, e é anunciado como status", () => {
    render(<SeloDecisaoHumana nome="Marina Alves" cargo="coordenadora" hora="9h12" />);
    const selo = screen.getByRole("status");
    expect(selo).toHaveTextContent("Decidido por Marina Alves, coordenadora, 9h12");
  });

  it("sem animação, não leva a classe que assenta o selo", () => {
    render(<SeloDecisaoHumana nome="A" cargo="b" hora="1h" animar={false} />);
    expect(screen.getByRole("status")).not.toHaveClass("assentar");
  });
});

describe("LegendaVozes", () => {
  it("lista as três vozes com a explicação de cada uma", () => {
    render(<LegendaVozes />);
    const lista = screen.getByRole("list", { name: "Como ler as telas" });
    expect(lista.querySelectorAll("li")).toHaveLength(3);
    expect(lista).toHaveTextContent("Traço tracejado");
    expect(lista).toHaveTextContent("Traço contínuo e selo");
  });
});
