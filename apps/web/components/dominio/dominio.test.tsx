import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FaixaDemonstracao } from "./faixa-demonstracao";
import { LegendaVozes } from "./legenda-vozes";
import { MarcaPlantao } from "./marca-plantao";
import { SeloDecisaoHumana } from "./selo-decisao-humana";
import { SuperficieVoz } from "./superficie-voz";
import { IconeDaVoz, VozTag } from "./voz-tag";

describe("SuperficieVoz", () => {
  it("a voz da IA tem o fundo da IA, e decidir troca para o fundo da decisão humana", () => {
    const { container, rerender } = render(<SuperficieVoz voz="ia">sugestão</SuperficieVoz>);
    const raiz = container.firstElementChild as HTMLElement;
    expect(raiz).toHaveAttribute("data-voz", "ia");
    expect(raiz).toHaveClass("voz-ia");

    // Mudar a voz é o que leva o bloco ao verde (a transição está em globals.css).
    rerender(<SuperficieVoz voz="humano">sugestão</SuperficieVoz>);
    expect(container.firstElementChild).toHaveAttribute("data-voz", "humano");
    expect(container.firstElementChild).toHaveClass("voz-humano");
  });

  it("a regra do sistema é só uma linha fina, sem o fundo de destaque", () => {
    const { container } = render(<SuperficieVoz voz="regra">limite</SuperficieVoz>);
    expect(container.firstElementChild).not.toHaveClass("voz-ia");
    expect(container.firstElementChild).toHaveClass("border");
  });

  it("não há mais contorno tracejado em SVG", () => {
    const { container } = render(<SuperficieVoz voz="ia">x</SuperficieVoz>);
    expect(container.querySelector("svg")).toBeNull();
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

  it("quem tem a própria região de status desliga o anúncio do selo, para não falar duas vezes", () => {
    render(<SeloDecisaoHumana nome="Marina Alves" cargo="coordenadora" hora="9h12" anunciar={false} />);
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.getByText(/Decidido por/)).toBeInTheDocument();
  });
});

describe("MarcaPlantao", () => {
  it("compacta: o nome continua no HTML (para o leitor de tela) e só some da tela em telas estreitas", () => {
    render(<MarcaPlantao compacta />);
    const nome = screen.getByText("PlantãoSeguro");
    expect(nome).toBeInTheDocument();
    expect(nome).toHaveClass("@max-[22rem]:sr-only");
  });

  it("sem compacta, o nome aparece sempre", () => {
    render(<MarcaPlantao />);
    expect(screen.getByText("PlantãoSeguro")).not.toHaveClass("@max-[22rem]:sr-only");
  });
});

describe("FaixaDemonstracao", () => {
  it("é uma região com nome, para ficar dentro de um marco e aparecer na lista de regiões", () => {
    render(<FaixaDemonstracao />);
    const faixa = screen.getByRole("region", { name: "Aviso de demonstração" });
    expect(faixa).toHaveTextContent("dados sintéticos");
  });
});

describe("IconeDaVoz", () => {
  it("é decorativo: a forma do ícone ajuda, mas o texto da etapa é quem informa", () => {
    const { container } = render(<IconeDaVoz voz="ia" className="size-7" />);
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("LegendaVozes", () => {
  it("lista as três vozes com a explicação de cada uma", () => {
    render(<LegendaVozes />);
    const lista = screen.getByRole("list", { name: "Como ler as telas" });
    expect(lista.querySelectorAll("li")).toHaveLength(3);
    expect(lista).toHaveTextContent("Azul, com o brilho da IA");
    expect(lista).toHaveTextContent("Verde e selo");
  });
});
