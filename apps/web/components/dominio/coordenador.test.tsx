import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Input } from "@/components/ui/field";
import type { CampoLido } from "@/lib/api/types";
import { obterMundo } from "@/lib/demo/mundo";
import { AlertaJornada } from "./alerta-jornada";
import { CampoExtraido, TextoComTrechos } from "./campo-extraido";
import { FatoresDeDecisao } from "./fatores-de-decisao";
import { FichaDoModelo } from "./ficha-do-modelo";
import { RegraBarrou } from "./regra-barrou";
import { SugestaoCard, type EstadoDaSugestao } from "./sugestao-card";

const mundo = obterMundo();
const recomendacao = mundo.recomendacoes["vaga-demo-1"]!;
const primeiro = recomendacao.candidatos[0]!;
const comAlerta = recomendacao.candidatos[3]!;

function cartao(
  estado: EstadoDaSugestao,
  extras: Partial<React.ComponentProps<typeof SugestaoCard>> = {},
) {
  return (
    <ol>
      <SugestaoCard candidato={primeiro} estado={estado} {...extras} />
    </ol>
  );
}

describe("SugestaoCard", () => {
  it("mostra a faixa de chance e o motivo do backend, sem o número e sem nada marcado", () => {
    render(cartao({ tipo: "decidindo", selecionado: false }));
    expect(screen.getByRole("heading", { name: `1. ${primeiro.medico.nome}` })).toBeInTheDocument();
    expect(screen.getByText("Chance média")).toBeInTheDocument();
    expect(screen.queryByText(/69%/)).toBeNull();
    expect(screen.getByText(primeiro.explicacao.texto)).toBeInTheDocument();
    expect(screen.getByText(/Motivo montado por regra/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Incluir na oferta" })).not.toBeChecked();
  });

  it("no modo de demonstração não há rodízio; no real, o nome que mudou de lugar diz por quê", () => {
    const { rerender } = render(cartao({ tipo: "decidindo", selecionado: false }));
    expect(screen.queryByText(/Rodízio:/)).toBeNull();
    rerender(
      <ol>
        <SugestaoCard
          candidato={{ ...primeiro, rodizio: { posicaoDoModelo: 3, indicacoesNaSemana: 0 } }}
          estado={{ tipo: "decidindo", selecionado: false }}
        />
      </ol>,
    );
    expect(
      screen.getByText(
        "Rodízio: só pelo modelo, seria o 3º. Entre chances a até 10 pontos, vai antes quem foi menos indicado nos últimos 7 dias (0 indicações).",
      ),
    ).toBeInTheDocument();
  });

  it("marcar um nome é um gesto da pessoa e diz de quem é", () => {
    const aoMarcar = vi.fn();
    render(cartao({ tipo: "decidindo", selecionado: false }, { aoMarcar }));
    const caixa = screen.getByRole("checkbox", { name: "Incluir na oferta" });
    expect(caixa).toHaveAccessibleDescription(`1. ${primeiro.medico.nome}`);
    fireEvent.click(caixa);
    expect(aoMarcar).toHaveBeenCalledWith(true);
  });

  it("o alerta de jornada usa o texto do backend e avisa que aprovar pede justificativa", () => {
    render(
      <ol>
        <SugestaoCard candidato={comAlerta} estado={{ tipo: "decidindo", selecionado: false }} />
      </ol>,
    );
    expect(screen.getByText("Alerta de jornada")).toBeInTheDocument();
    expect(screen.getByText(comAlerta.alertas[0]!)).toBeInTheDocument();
    expect(screen.getByText(/exige uma justificativa/)).toBeInTheDocument();
  });

  it("depois da decisão, o alerta fica e o aviso de justificativa sai", () => {
    render(
      <ol>
        <SugestaoCard candidato={comAlerta} estado={{ tipo: "aprovado", lugar: 1, totalAprovados: 1 }} />
      </ol>,
    );
    expect(screen.getByText(comAlerta.alertas[0]!)).toBeInTheDocument();
    expect(screen.queryByText(/exige uma justificativa/)).toBeNull();
    expect(screen.getByText("Aprovado")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: "Pular" })).toBeNull();
  });

  it("com vários aprovados, diz o lugar de cada um; quem ficou de fora não recebe a oferta", () => {
    const { rerender } = render(cartao({ tipo: "aprovado", lugar: 2, totalAprovados: 3 }));
    expect(screen.getByText("Aprovado, 2º a receber a oferta")).toBeInTheDocument();
    rerender(cartao({ tipo: "fora" }));
    expect(screen.getByText("Não recebe a oferta")).toBeInTheDocument();
  });

  it("os motivos só entram na página quando a pessoa pede", () => {
    render(cartao({ tipo: "decidindo", selecionado: false }, { motivos: <p>painel de motivos</p> }));
    const botao = screen.getByRole("button", { name: "Ver motivos" });
    expect(botao).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("painel de motivos")).toBeNull();
    fireEvent.click(botao);
    expect(screen.getByRole("button", { name: "Esconder motivos" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("painel de motivos")).toBeInTheDocument();
  });

  it("ao pular, o foco vai para Desfazer e, ao desfazer, volta para Pular", () => {
    const aoPular = vi.fn();
    const aoDesfazer = vi.fn();
    const props = { aoPular, aoDesfazer };
    const { rerender } = render(cartao({ tipo: "decidindo", selecionado: false }, props));
    fireEvent.click(screen.getByRole("button", { name: "Pular" }));
    expect(aoPular).toHaveBeenCalledOnce();

    rerender(cartao({ tipo: "pulado", podeDesfazer: true }, props));
    expect(screen.getByText("Você pulou este nome.")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).toBeNull();
    const desfazer = screen.getByRole("button", { name: "Desfazer" });
    expect(desfazer).toHaveFocus();

    fireEvent.click(desfazer);
    expect(aoDesfazer).toHaveBeenCalledOnce();
    rerender(cartao({ tipo: "decidindo", selecionado: false }, props));
    expect(screen.getByRole("button", { name: "Pular" })).toHaveFocus();
  });

  it("não rouba o foco ao abrir a tela com um nome já pulado", () => {
    render(cartao({ tipo: "pulado", podeDesfazer: true }));
    expect(screen.getByRole("button", { name: "Desfazer" })).not.toHaveFocus();
  });

  it("depois da decisão, um nome pulado não pode mais voltar", () => {
    render(cartao({ tipo: "pulado", podeDesfazer: false }));
    expect(screen.getByText("Pulado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Desfazer" })).toBeNull();
  });
});

describe("AlertaJornada", () => {
  it("sem alerta, não mostra nada", () => {
    const { container } = render(<AlertaJornada alertas={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("FatoresDeDecisao", () => {
  it("lista as sete variáveis, da que mais pesa para a que menos pesa, com o sentido por escrito", () => {
    render(<FatoresDeDecisao fatores={comAlerta.fatores} contribuicoes={comAlerta.contribuicoes} />);
    const linhas = screen.getAllByRole("listitem");
    expect(linhas).toHaveLength(7);
    expect(linhas[0]).toHaveTextContent("Distância até o hospital");
    expect(linhas[0]).toHaveTextContent("1,4 km");
    expect(linhas[0]).toHaveTextContent("a favor");
    const descanso = linhas.find((l) => l.textContent?.includes("Descanso desde o último plantão"))!;
    expect(descanso).toHaveTextContent("contra");
    expect(descanso.querySelector('[data-sentido="contra"]')).not.toBeNull();
  });

  it("a variável que não mexe na ordem não ganha barra", () => {
    render(<FatoresDeDecisao fatores={comAlerta.fatores} contribuicoes={comAlerta.contribuicoes} />);
    const disponibilidade = screen
      .getAllByRole("listitem")
      .find((l) => l.textContent?.includes("Disponibilidade para o horário"))!;
    expect(disponibilidade).toHaveTextContent("neutro");
    expect(disponibilidade.querySelector("[data-sentido]")).toBeNull();
  });

  it("não mostra o número da contribuição, que seria falsa precisão", () => {
    const { container } = render(
      <FatoresDeDecisao fatores={comAlerta.fatores} contribuicoes={comAlerta.contribuicoes} />,
    );
    expect(container.textContent).not.toMatch(/0[,.]\d{3}/);
  });
});

describe("RegraBarrou", () => {
  it("resume quantos ficaram de fora e ordena as regras da que mais barrou para a que menos", () => {
    render(<RegraBarrou recomendacao={recomendacao} />);
    expect(screen.getByText(/235 de 300 médicos barrados por regras fixas, sem IA/)).toBeInTheDocument();
    const regras = screen.getAllByRole("button");
    expect(regras.map((r) => r.textContent)).toEqual([
      "131Especialidade diferente da vaga",
      "64Sem disponibilidade declarada para o horário da vaga",
      "25Fora do raio de deslocamento do médico",
      "15CRM não está ativo",
    ]);
  });

  it("os exemplos mostram o pseudônimo e a evidência, nunca o nome de quem não foi sugerido", () => {
    render(<RegraBarrou recomendacao={recomendacao} />);
    const excluido = recomendacao.exemplosExcluidos.find((e) => e.codigoRegra === "specialty_mismatch")!;
    fireEvent.click(screen.getByRole("button", { name: /Especialidade diferente/ }));
    const secao = screen.getByRole("region", { name: "Quem ficou de fora" });
    expect(within(secao).getByText(`Médico ${excluido.medico.pseudonimo}:`)).toBeInTheDocument();
    expect(within(secao).getAllByText(excluido.evidencia!).length).toBeGreaterThan(0);
    expect(secao).not.toHaveTextContent(excluido.medico.nome);
  });

  it("uma janela da grade guarda só a contagem, e a tela diz isso", () => {
    render(<RegraBarrou recomendacao={{ ...recomendacao, exemplosExcluidos: [] }} />);
    fireEvent.click(screen.getByRole("button", { name: /CRM não está ativo/ }));
    expect(screen.getByText(/guarda só a contagem/)).toBeInTheDocument();
  });

  it("sem ninguém barrado, diz isso em vez de mostrar uma lista vazia", () => {
    render(
      <RegraBarrou
        recomendacao={{ totalPool: 10, totalElegiveis: 10, exclusoesPorRegra: {}, exemplosExcluidos: [] }}
      />,
    );
    expect(screen.getByText("Nenhum médico foi barrado pelas regras.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("CampoExtraido", () => {
  const achado: CampoLido = { chave: "unidade", valor: "x", origem: "achei", trecho: { inicio: 0, fim: 1 } };

  function campo(extras: Partial<React.ComponentProps<typeof CampoExtraido>>) {
    return render(
      <CampoExtraido
        id="campo"
        rotulo="Hospital"
        campo={achado}
        fonte="regras"
        editado={false}
        trecho="Modelo Centro"
        erro={null}
        {...extras}
      >
        {(aria) => <Input {...aria} defaultValue="" />}
      </CampoExtraido>,
    );
  }

  it("a leitura por regras é cinza, diz a origem e mostra o trecho ligado ao campo", () => {
    const { container } = campo({});
    expect(container.firstElementChild).toHaveAttribute("data-voz", "regra");
    const controle = screen.getByLabelText("Hospital");
    expect(controle).toHaveAccessibleDescription(/Está no texto.*Modelo Centro/);
  });

  it("a leitura pela IA é tracejada", () => {
    const { container } = campo({ fonte: "llm" });
    expect(container.firstElementChild).toHaveAttribute("data-voz", "ia");
  });

  it("o campo que a pessoa corrigiu passa à voz humana", () => {
    const { container } = campo({ editado: true, trecho: null });
    expect(container.firstElementChild).toHaveAttribute("data-voz", "humano");
    expect(screen.getByText("Corrigido por você")).toBeInTheDocument();
  });

  it("o campo que não estava no texto diz isso e, preenchido, diz quem preencheu", () => {
    const faltou: CampoLido = { chave: "unidade", valor: null, origem: "nao_achei", trecho: null };
    const { unmount } = campo({ campo: faltou, trecho: null });
    expect(screen.getByText("Não está no texto")).toBeInTheDocument();
    unmount();
    campo({ campo: faltou, trecho: null, editado: true });
    expect(screen.getByText("Preenchido por você")).toBeInTheDocument();
  });

  it("não inventa percentual de confiança", () => {
    const { container } = campo({});
    expect(container.textContent).not.toContain("%");
  });

  it("o erro fica ligado ao campo e o marca como inválido", () => {
    campo({ erro: "Escolha o hospital." });
    const controle = screen.getByLabelText("Hospital");
    expect(controle).toHaveAttribute("aria-invalid", "true");
    expect(controle).toHaveAccessibleDescription(/Escolha o hospital\./);
  });
});

describe("TextoComTrechos", () => {
  it("destaca os trechos na ordem do texto", () => {
    const { container } = render(
      <TextoComTrechos
        texto="pediatra de sexta, 19h às 7h"
        trechos={[
          { inicio: 18, fim: 28 },
          { inicio: 0, fim: 8 },
        ]}
      />,
    );
    expect([...container.querySelectorAll("mark")].map((m) => m.textContent)).toEqual(["pediatra", " 19h às 7h"]);
    expect(container.textContent).toBe("pediatra de sexta, 19h às 7h");
  });

  it("trechos sobrepostos não repetem texto", () => {
    const { container } = render(
      <TextoComTrechos
        texto="abcdefgh"
        trechos={[
          { inicio: 0, fim: 4 },
          { inicio: 2, fim: 6 },
          { inicio: 1, fim: 3 },
        ]}
      />,
    );
    expect(container.textContent).toBe("abcdefgh");
  });

  it("o texto é entrada hostil: marcação vira texto, nunca HTML", () => {
    const hostil = '<img src=x onerror="alert(1)"> pediatra';
    const { container } = render(<TextoComTrechos texto={hostil} trechos={[{ inicio: 31, fim: 39 }]} />);
    expect(container.querySelector("img")).toBeNull();
    expect(container.textContent).toBe(hostil);
  });
});

describe("FichaDoModelo", () => {
  it("diz o que o modelo usa, o que não usa, as medidas em simulação e os limites", () => {
    render(<FichaDoModelo ficha={mundo.fichaModelo} />);
    expect(screen.getByText(mundo.fichaModelo.versao)).toBeInTheDocument();
    expect(screen.getByText("Medidas, em simulação")).toBeInTheDocument();
    expect(screen.getByText(/Valor do plantão e pagamento/)).toBeInTheDocument();
    expect(screen.getByText("O Gemini só foi testado à parte, com textos sintéticos.")).toBeInTheDocument();
    expect(screen.getAllByText(/validar com jurídico/).length).toBeGreaterThan(0);
  });
});
