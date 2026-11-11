import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileQuestion } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./button";
import { EmptyState } from "./empty-state";
import { ErrorSummary } from "./error-summary";
import { Field, Input } from "./field";

describe("EmptyState", () => {
  it("o título é h2 por padrão e h1 quando a página inteira é o estado (404, erro)", () => {
    const { rerender } = render(<EmptyState icon={FileQuestion} title="Nada por aqui" />);
    expect(screen.getByRole("heading", { level: 2, name: "Nada por aqui" })).toBeInTheDocument();
    rerender(<EmptyState icon={FileQuestion} title="Nada por aqui" headingLevel="h1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Nada por aqui" })).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("o rótulo pode quebrar em duas linhas, em vez de passar da largura da tela", () => {
    render(<Button>Entrar como coordenador</Button>);
    const botao = screen.getByRole("button", { name: "Entrar como coordenador" });
    expect(botao).not.toHaveClass("whitespace-nowrap");
    expect(botao).not.toHaveClass("shrink-0");
    expect(botao).toHaveClass("min-h-[var(--alvo-min)]");
  });

  it("o botão de decisão é verde e o primário é tinta", () => {
    render(
      <>
        <Button variant="decision">Aprovar e oferecer</Button>
        <Button>Entrar</Button>
      </>,
    );
    expect(screen.getByRole("button", { name: "Aprovar e oferecer" })).toHaveClass("bg-humano");
    expect(screen.getByRole("button", { name: "Entrar" })).toHaveClass("bg-acento");
  });

  it("carregando desabilita o clique, avisa por aria-busy e mantém o texto", async () => {
    const aoClicar = vi.fn();
    render(
      <Button loading onClick={aoClicar}>
        Aprovar
      </Button>,
    );
    const botao = screen.getByRole("button", { name: "Aprovar" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("aria-busy", "true");
    await userEvent.click(botao);
    expect(aoClicar).not.toHaveBeenCalled();
  });

  it("com asChild vira o próprio link, sem botão dentro de link", () => {
    render(
      <Button asChild>
        <a href="/entrar">Entrar na demonstração</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Entrar na demonstração" })).toHaveAttribute("href", "/entrar");
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("Field", () => {
  it("liga rótulo, ajuda e erro ao campo", () => {
    render(
      <Field id="texto" label="Pedido" hint="Escreva do seu jeito." error="Escreva o pedido para continuar.">
        {(aria) => <Input {...aria} />}
      </Field>,
    );
    const campo = screen.getByLabelText("Pedido");
    expect(campo).toHaveAttribute("aria-invalid", "true");
    const descricao = campo.getAttribute("aria-describedby") ?? "";
    expect(descricao).toContain("texto-ajuda");
    expect(descricao).toContain("texto-erro");
    expect(screen.getByText("Escreva o pedido para continuar.")).toBeInTheDocument();
  });

  it("sem erro, o campo não é marcado como inválido", () => {
    render(
      <Field id="a" label="A">
        {(aria) => <Input {...aria} />}
      </Field>,
    );
    expect(screen.getByLabelText("A")).not.toHaveAttribute("aria-invalid");
  });
});

describe("ErrorSummary", () => {
  it("não aparece sem erros", () => {
    const { container } = render(<ErrorSummary erros={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("recebe o foco, anuncia por alert e leva o foco ao campo pelo link", async () => {
    render(
      <>
        <ErrorSummary erros={[{ id: "texto", mensagem: "Escreva o pedido para continuar." }]} />
        <label htmlFor="texto">Pedido</label>
        <input id="texto" />
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Há um problema");
    const resumo = screen.getByRole("alert").parentElement as HTMLElement;
    expect(resumo).toHaveFocus();
    await userEvent.click(screen.getByRole("link", { name: "Escreva o pedido para continuar." }));
    expect(screen.getByLabelText("Pedido")).toHaveFocus();
  });
});
