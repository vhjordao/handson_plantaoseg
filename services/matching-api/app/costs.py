"""Custo total, preço e retorno para o hospital (feedback da Entrega 3).

O professor apontou três lacunas: o custo anual não contemplava implantação, treinamento nem parecer
jurídico; a estimativa de custo total de implantação e operação estava incompleta; e faltava mostrar
como o preço da solução será estabelecido e como o hospital contrata depois do piloto.

Este módulo é uma calculadora, e não uma previsão. Cada item de custo diz de onde vem o valor:

* **pública:** preço de tabela conferido na página do fornecedor em 11/11/2026 (Supabase, Vercel,
  Hostinger, Gemini) ou lido em fonte pública pelo grupo (consulta ao CFM);
* **premissa:** valor nosso, sem fonte, em três cenários (baixo, base e alto) para mostrar o quanto
  ele pesa. O principal é a hora de trabalho e o parecer jurídico, que ainda não foram cotados.

O custo é do fornecedor (o que custa entregar e manter o serviço a um hospital). O preço sai dele
e do benefício do hospital: o piso cobre o custo com margem e imposto, o teto é a parcela do
benefício que o hospital aceitaria pagar. Quando o piso passa do teto, o relatório diz que não
fecha. Nada aqui é parecer jurídico, contábil nem proposta comercial.
"""

from dataclasses import dataclass
from typing import Any

SCENARIOS = ("low", "base", "high")
SCENARIO_NAMES = {"low": "Baixo", "base": "Base", "high": "Alto"}

# --- Premissas gerais (nossas, sem fonte; mudam o resultado e por isso ficam à vista) ------
USD_BRL = 5.50  # premissa da Entrega 3
HOURLY = 150.0  # hora de desenvolvimento, suporte e treinamento, a preço de mercado (premissa)
COORDINATION_HOURLY = 60.0  # hora do coordenador no hospital (premissa da Entrega 3)
TAX = 0.10  # impostos sobre a receita (premissa; validar com contador)
MARGIN = 0.30  # margem sobre a receita (premissa)
VALUE_SHARE = 0.30  # parcela do benefício do hospital que ele aceitaria pagar (premissa)
AMORTIZATION_YEARS = 3  # a implantação e o parecer se diluem no contrato de 3 anos
CONTINGENCY = {"low": 0.10, "base": 0.15, "high": 0.20}

# --- Dados da simulação e da Entrega 3 ---------------------------------------------------
UNCOVERED_MANUAL = 0.054  # vagas sem cobertura no processo manual simulado
OFFERS_AVOIDED_PER_SHIFT = 3.31 - 1.32  # ofertas por vaga: manual contra o fluxo recomendado
MINUTES_PER_OFFER = 5  # premissa da Entrega 3
SHIFT_VALUE = 1500.0  # referência pública do plantão de 12 h (Fhemig, 2024), a usar como V central
CENTRAL_PREVENTED = 0.5  # metade das vagas descobertas evitada
REFERENCE_SHIFTS_PER_YEAR = 816  # o hospital da simulação (2.448 vagas em 3 hospitais)

# --- Preços públicos conferidos em 11/11/2026 -------------------------------------------
SUPABASE_PRO_USD_MONTH = 25  # inclui diária de backup por 7 dias, 8 GB e projeto sem pausa
SUPABASE_SMALL_COMPUTE_USD_MONTH = 15
SUPABASE_PITR_USD_MONTH = 100  # recuperação em ponto no tempo, 7 dias
VERCEL_PRO_USD_MONTH = 20  # por desenvolvedor; o plano gratuito é só para uso não comercial
KVM2_RENEWAL_BRL_MONTH = 77.99  # Hostinger, 2 vCPU e 8 GB, preço de renovação
KVM4_RENEWAL_BRL_MONTH = 149.99  # Hostinger, 4 vCPU e 16 GB, preço de renovação
GEMINI_INPUT_USD_PER_M = 0.25  # Gemini 3.1 Flash-Lite, camada paga (conteúdo não usado p/ treino)
GEMINI_OUTPUT_USD_PER_M = 1.50
CFM_BRL_YEAR = 948.0  # consulta de CRM para empresa particular, lido em 03/11/2026 (Entrega 3)
GEMINI_CALLS_PER_SHIFT = 2  # extrair o pedido e reescrever o motivo (premissa da Entrega 3)
GEMINI_TOKENS_IN, GEMINI_TOKENS_OUT = 1500, 300  # por chamada (premissa)
# Referência de mercado: ferramenta de escala de plantões, "preço inicial" de um comparador.
COMPETITOR_BRL_MONTH = 5740.0


@dataclass(frozen=True)
class Item:
    key: str
    label: str
    recurring: bool
    source: str  # "pública" ou "premissa"
    note: str
    shared: float  # parcela do custo que se divide entre os hospitais da plataforma
    low: float
    base: float
    high: float

    def value(self, scenario: str) -> float:
        return float(getattr(self, scenario))


def _usd(amount: float) -> float:
    return amount * USD_BRL


def _hours(hours: float) -> float:
    return hours * HOURLY


def gemini_cost_year(shifts_per_year: float, token_factor: float = 1.0) -> float:
    per_call = (
        GEMINI_TOKENS_IN * GEMINI_INPUT_USD_PER_M + GEMINI_TOKENS_OUT * GEMINI_OUTPUT_USD_PER_M
    ) / 1_000_000
    return shifts_per_year * GEMINI_CALLS_PER_SHIFT * per_call * token_factor * USD_BRL


def items(shifts_per_year: float = REFERENCE_SHIFTS_PER_YEAR) -> list[Item]:
    """Todos os itens de custo de um hospital, por ano (recorrentes) ou uma vez (implantação)."""
    return [
        Item(
            "supabase",
            "Banco e login (Supabase)",
            True,
            "pública",
            "Pro: backup diário por 7 dias e sem pausa. Alto soma Small e PITR (7 dias).",
            1.0,
            _usd(SUPABASE_PRO_USD_MONTH * 12),
            _usd(SUPABASE_PRO_USD_MONTH * 12),
            _usd(
                (
                    SUPABASE_PRO_USD_MONTH
                    + SUPABASE_SMALL_COMPUTE_USD_MONTH
                    + SUPABASE_PITR_USD_MONTH
                )
                * 12
            ),
        ),
        Item(
            "servidor",
            "Servidor da API e do n8n",
            True,
            "pública",
            "Hostinger, preço de renovação. Baixo e base: KVM 2. Alto: dois KVM 4 (redundância).",
            1.0,
            KVM2_RENEWAL_BRL_MONTH * 12,
            KVM2_RENEWAL_BRL_MONTH * 12,
            2 * KVM4_RENEWAL_BRL_MONTH * 12,
        ),
        Item(
            "web",
            "Hospedagem da web (Vercel Pro)",
            True,
            "pública",
            "O plano gratuito é só para uso não comercial; um desenvolvedor.",
            1.0,
            _usd(VERCEL_PRO_USD_MONTH * 12),
            _usd(VERCEL_PRO_USD_MONTH * 12),
            _usd(VERCEL_PRO_USD_MONTH * 12),
        ),
        Item(
            "gemini",
            "Gemini (camada paga)",
            True,
            "pública",
            "Preço por token público; os tokens por chamada são premissa. Alto: 3 vezes mais.",
            0.0,
            gemini_cost_year(shifts_per_year),
            gemini_cost_year(shifts_per_year),
            gemini_cost_year(shifts_per_year, 3.0),
        ),
        Item(
            "cfm",
            "Consulta de CRM no CFM",
            True,
            "pública",
            "Valor lido em 03/11/2026 para empresa particular; o hospital talvez já tenha acesso.",
            0.0,
            0.0,
            CFM_BRL_YEAR,
            CFM_BRL_YEAR,
        ),
        Item(
            "observabilidade",
            "Domínio, e-mail e monitoramento",
            True,
            "premissa",
            "Alertas de queda, registro de erros e e-mail de aviso.",
            1.0,
            600.0,
            1800.0,
            6000.0,
        ),
        Item(
            "suporte",
            "Operação e suporte",
            True,
            "premissa",
            "Horas por semana: 2, 4 e 8 (plantão de sobreaviso), a R$ 150 por hora.",
            0.5,
            _hours(2 * 52),
            _hours(4 * 52),
            _hours(8 * 52),
        ),
        Item(
            "modelo",
            "Manutenção do modelo e do monitoramento de vieses",
            True,
            "premissa",
            "Retreino mensal, revisão de contestações e da concentração: 4, 8 e 16 horas por mês.",
            0.8,
            _hours(4 * 12),
            _hours(8 * 12),
            _hours(16 * 12),
        ),
        Item(
            "juridico_anual",
            "Revisão jurídica anual",
            True,
            "premissa",
            "As normas do CFM mudam (a 2.462 já foi suspensa). Sem cotação ainda.",
            0.8,
            3000.0,
            8000.0,
            20000.0,
        ),
        Item(
            "implantacao",
            "Implantação no hospital",
            False,
            "premissa",
            "Cadastros, política de jornada, importação de planilhas: 60, 120 e 240 horas.",
            0.0,
            _hours(60),
            _hours(120),
            _hours(240),
        ),
        Item(
            "integracao",
            "Integração com escala e ponto",
            False,
            "premissa",
            "Fica fora no baixo e no base (fase 3 do roteiro); o alto inclui 160 horas.",
            0.0,
            0.0,
            0.0,
            _hours(160),
        ),
        Item(
            "treinamento",
            "Treinamento de coordenadores e médicos",
            False,
            "premissa",
            "Horas do instrutor (8, 16 e 40) mais material. O tempo dos médicos é do hospital.",
            0.0,
            _hours(8) + 500,
            _hours(16) + 1500,
            _hours(40) + 4000,
        ),
        Item(
            "parecer",
            "Parecer jurídico e minuta de contrato",
            False,
            "premissa",
            "LGPD, Res. CFM 2.454 e 2.460, acordo de tratamento de dados. Sem cotação ainda.",
            0.9,
            8000.0,
            20000.0,
            45000.0,
        ),
        Item(
            "ripd",
            "Relatório de impacto e avaliação de risco algorítmico",
            False,
            "premissa",
            "24, 60 e 120 horas, com apoio do jurídico.",
            0.7,
            _hours(24),
            _hours(60),
            _hours(120),
        ),
        Item(
            "seguranca",
            "Revisão de segurança antes de dados reais",
            False,
            "premissa",
            "Teste de invasão e revisão de configuração. Baixo: só revisão interna.",
            0.9,
            0.0,
            15000.0,
            40000.0,
        ),
        Item(
            "producao",
            "Passagem para produção",
            False,
            "premissa",
            "Plano pago do banco, backups, monitoramento e esteira de deploy: 40, 80 e 160 horas.",
            0.9,
            _hours(40),
            _hours(80),
            _hours(160),
        ),
    ]


def per_hospital(item: Item, scenario: str, hospitals: int) -> float:
    """O custo do item para um hospital, quando `hospitals` dividem a parte compartilhada."""
    return item.value(scenario) * (item.shared / hospitals + (1 - item.shared))


def costs(
    scenario: str, hospitals: int = 1, shifts_per_year: float = REFERENCE_SHIFTS_PER_YEAR
) -> dict[str, Any]:
    """Custo recorrente por ano, único (ano 1) e o total de três anos, por hospital."""
    rows = items(shifts_per_year)
    recurring_items = [i for i in rows if i.recurring]
    once_items = [i for i in rows if not i.recurring]
    recurring = sum(per_hospital(i, scenario, hospitals) for i in recurring_items)
    once = sum(per_hospital(i, scenario, hospitals) for i in once_items)
    contingency = CONTINGENCY[scenario]
    recurring_total = recurring * (1 + contingency)
    once_total = once * (1 + contingency)
    return {
        "scenario": scenario,
        "hospitals": hospitals,
        "recurring": recurring_total,
        "once": once_total,
        "year1": recurring_total + once_total,
        "three_years": 3 * recurring_total + once_total,
        "lines": {i.key: per_hospital(i, scenario, hospitals) for i in rows},
    }


# --- Benefício, preço e retorno ------------------------------------------------------------


@dataclass(frozen=True)
class Tier:
    key: str
    label: str
    shifts_per_year: float
    doctors: int


TIERS: tuple[Tier, ...] = (
    Tier("pequeno", "Pequeno: o hospital da simulação", REFERENCE_SHIFTS_PER_YEAR, 100),
    Tier("medio", "Médio: 3 unidades, cerca de 7 vagas por dia", 2446.0, 300),
    Tier("grande", "Grande: hospital de referência, 40 vagas por dia", 14600.0, 1500),
)
PREVENTED = (0.25, 0.5, 1.0)  # parcela das vagas descobertas que o sistema evita
SHIFT_VALUES = (1000.0, 1500.0, 2000.0)  # V: o custo, para o hospital, de uma vaga descoberta


def benefit(shifts_per_year: float, prevented: float, shift_value: float) -> float:
    """Benefício anual do hospital: vagas descobertas evitadas e horas de coordenação poupadas."""
    avoided = shifts_per_year * UNCOVERED_MANUAL * prevented
    hours = shifts_per_year * OFFERS_AVOIDED_PER_SHIFT * MINUTES_PER_OFFER / 60
    return avoided * shift_value + hours * COORDINATION_HOURLY


def _round_up(value: float, step: float = 500.0) -> float:
    return step * -(-value // step)


def pricing(tier: Tier, scenario: str = "base", hospitals: int = 1) -> dict[str, Any]:
    """O piso (custo com margem e imposto), o teto (parcela do benefício) e se fecha."""
    cost = costs(scenario, hospitals, tier.shifts_per_year)
    annual_cost = cost["recurring"] + cost["once"] / AMORTIZATION_YEARS
    floor = annual_cost / (1 - TAX - MARGIN)
    central = benefit(tier.shifts_per_year, CENTRAL_PREVENTED, SHIFT_VALUE)
    ceiling = VALUE_SHARE * central
    viable = floor <= ceiling
    suggested = _round_up((floor + ceiling) / 2) if viable else None
    # O retorno do hospital ao preço sugerido (ou ao piso, se não fecha), como na Entrega 3.
    price = suggested if suggested is not None else _round_up(floor)
    returns = {
        f"{prevented}:{value}": (benefit(tier.shifts_per_year, prevented, value) - price) / price
        for prevented in PREVENTED
        for value in (SHIFT_VALUES[0], SHIFT_VALUES[-1])
    }
    return {
        "tier": tier.key,
        "label": tier.label,
        "shifts_per_year": tier.shifts_per_year,
        "scenario": scenario,
        "hospitals": hospitals,
        "annual_cost": annual_cost,
        "floor": floor,
        "central_benefit": central,
        "ceiling": ceiling,
        "viable": viable,
        "suggested": suggested,
        "price_used": price,
        "returns": returns,
    }


def break_even_shifts(
    scenario: str = "base", hospitals: int = 1, prevented: float = CENTRAL_PREVENTED
) -> float:
    """Vagas por ano a partir das quais o piso cabe no teto (benefício central e V de R$ 1.500)."""
    per_shift = VALUE_SHARE * benefit(1.0, prevented, SHIFT_VALUE)
    floor = pricing(TIERS[0], scenario, hospitals)["floor"]
    # O custo quase não depende do volume (só o Gemini), então a conta fecha em uma passada.
    return floor / per_shift


def needed_shift_value(tier: Tier, scenario: str = "base", hospitals: int = 1) -> float:
    """O V (custo de uma vaga descoberta) que faria o piso caber no teto, com a metade evitada."""
    floor = pricing(tier, scenario, hospitals)["floor"]
    hours = tier.shifts_per_year * OFFERS_AVOIDED_PER_SHIFT * MINUTES_PER_OFFER / 60
    avoided = tier.shifts_per_year * UNCOVERED_MANUAL * CENTRAL_PREVENTED
    return (floor / VALUE_SHARE - hours * COORDINATION_HOURLY) / avoided


def break_even_hospitals(tier: Tier, scenario: str = "base", limit: int = 200) -> int | None:
    """Quantos hospitais dividindo a plataforma fazem o preço fechar, ou None se nunca fecha."""
    for hospitals in range(1, limit + 1):
        if pricing(tier, scenario, hospitals)["viable"]:
            return hospitals
    return None


def evaluate_costs() -> dict[str, Any]:
    lines = items()
    totals = {scenario: {n: costs(scenario, n) for n in (1, 3, 10)} for scenario in SCENARIOS}
    prices = {
        tier.key: {
            scenario: {n: pricing(tier, scenario, n) for n in (1, 3, 10)} for scenario in SCENARIOS
        }
        for tier in TIERS
    }
    return {
        "label": "premissas",
        "items": [
            {
                "key": i.key,
                "label": i.label,
                "recurring": i.recurring,
                "source": i.source,
                "note": i.note,
                "shared": i.shared,
                "low": i.low,
                "base": i.base,
                "high": i.high,
            }
            for i in lines
        ],
        "totals": {s: {str(n): v for n, v in rows.items()} for s, rows in totals.items()},
        "prices": {
            t: {s: {str(n): v for n, v in rows.items()} for s, rows in by_scenario.items()}
            for t, by_scenario in prices.items()
        },
        "break_even": {
            tier.key: {s: break_even_hospitals(tier, s) for s in SCENARIOS} for tier in TIERS
        },
        "break_even_shifts": {
            s: {str(n): break_even_shifts(s, n) for n in (1, 3, 10)} for s in SCENARIOS
        },
        "needed_shift_value": {
            tier.key: {str(n): needed_shift_value(tier, "base", n) for n in (1, 3, 10)}
            for tier in TIERS
        },
        "benefit": {
            tier.key: {
                f"{p}:{v}": benefit(tier.shifts_per_year, p, v)
                for p in PREVENTED
                for v in SHIFT_VALUES
            }
            for tier in TIERS
        },
    }


# --- Relatório --------------------------------------------------------------------------------


def _num(value: float, digits: int = 0) -> str:
    return f"{value:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _brl(value: float) -> str:
    if abs(value) >= 1000:
        return f"R$ {_num(value / 1000, 1)} mil"
    return f"R$ {_num(value)}"


def _pct(value: float) -> str:
    return f"{value * 100:+.0f}%"


def render_costs(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown: custo total, preço e retorno, com a fonte de cada número."""
    total = metrics["totals"]
    base1, low1, high1 = total["base"]["1"], total["low"]["1"], total["high"]["1"]
    infra_keys = ("supabase", "servidor", "web", "gemini")
    infra = sum(base1["lines"][k] for k in infra_keys)
    prices = metrics["prices"]
    grande3 = prices["grande"]["base"]["3"]
    lines = [
        "# Custo total, preço e retorno (premissas)",
        "",
        "> **Premissas, não previsão.** Os preços de tabela (Supabase, Vercel, Hostinger, Gemini) "
        "foram conferidos nas páginas dos fornecedores em 11/11/2026. O resto é premissa nossa, em "
        "três cenários, e a hora de trabalho e o parecer jurídico ainda não foram cotados. Nada "
        "aqui "
        "é parecer jurídico ou contábil, cotação ou proposta comercial. Gerado por "
        "`python -m app.cli costs`.",
        "",
        "## Perguntas",
        "",
        "O feedback da Entrega 3 pediu três coisas: que o custo anual contemplasse implantação, "
        "treinamento e parecer jurídico; uma estimativa mais completa do custo total de "
        "implantação "
        "e operação; e como o preço será estabelecido e como o hospital contrata depois do piloto. "
        "Este relatório responde às duas primeiras e ao cálculo do preço; a contratação está em "
        "[preço e contratação](../negocio/preco-e-contratacao.md).",
        "",
        "## De onde vêm os números",
        "",
        "| Item | Valor | Fonte |",
        "| --- | --- | --- |",
        f"| Supabase Pro | US$ {SUPABASE_PRO_USD_MONTH} por mês (backup diário por 7 dias, sem "
        "pausa "
        f"por inatividade); computação Small US$ {SUPABASE_SMALL_COMPUTE_USD_MONTH}; PITR "
        f"US$ {SUPABASE_PITR_USD_MONTH} | [supabase.com/pricing](https://supabase.com/pricing), "
        "11/11/2026 |",
        f"| Vercel Pro | US$ {VERCEL_PRO_USD_MONTH} por mês por desenvolvedor; o plano gratuito é "
        "só "
        "para uso não comercial | [vercel.com/pricing](https://vercel.com/pricing), 11/11/2026 |",
        f"| Servidor | KVM 2 a R$ {_num(KVM2_RENEWAL_BRL_MONTH, 2)} e KVM 4 a "
        f"R$ {_num(KVM4_RENEWAL_BRL_MONTH, 2)} por mês, no preço de renovação (o promocional dura "
        "só o primeiro período) | [hostinger.com/br/servidor-vps]"
        "(https://www.hostinger.com/br/servidor-vps), 11/11/2026 |",
        f"| Gemini 3.1 Flash-Lite, camada paga | US$ {GEMINI_INPUT_USD_PER_M} por 1 milhão de "
        "tokens "
        f"de entrada e US$ {GEMINI_OUTPUT_USD_PER_M} de saída; na camada paga o conteúdo "
        '"não é usado para melhorar os produtos", na gratuita é | '
        "[aistudio.google.com/docs/pricing](https://aistudio.google.com/docs/pricing), 11/11/2026 "
        "|",
        f"| Consulta de CRM no CFM | R$ {_num(CFM_BRL_YEAR)} por ano para empresa particular | "
        "lido pelo grupo em 03/11/2026 (Entrega 3), a reconferir |",
        f'| Referência de mercado | R$ {_num(COMPETITOR_BRL_MONTH)} por mês de "preço inicial" de '
        "uma ferramenta de escala de plantões (Escala) | comparador de terceiros "
        "([b2bstack.com.br](https://www.b2bstack.com.br/compare/surglogs-vs-escala)), **não "
        "confirmado com o fornecedor** |",
        f"| Câmbio | R$ {_num(USD_BRL, 2)} por dólar | premissa da Entrega 3 |",
        "",
        "Não foi possível confirmar um valor atual para o parecer jurídico: as tabelas de "
        "honorários "
        "da OAB variam por seccional, e os valores achados são de anos diferentes. Ficou como "
        "premissa em faixa, a cotar.",
        "",
        "## Itens de custo de um hospital",
        "",
        "Hospital de referência: 816 vagas por ano, como na simulação. Valores em reais.",
        "",
        "| Item | Tipo | Fonte | Baixo | Base | Alto | Observação |",
        "| --- | --- | --- | ---: | ---: | ---: | --- |",
    ]
    for item in metrics["items"]:
        kind = "por ano" if item["recurring"] else "uma vez"
        lines.append(
            f"| {item['label']} | {kind} | {item['source']} | {_num(item['low'])} | "
            f"{_num(item['base'])} | {_num(item['high'])} | {item['note']} |"
        )
    lines += [
        "",
        "Sobre o subtotal entram a contingência (10%, 15% e 20% nos três cenários).",
        "",
        "## Custo total",
        "",
        "Por hospital, com um só hospital na plataforma:",
        "",
        "| | Baixo | Base | Alto |",
        "| --- | ---: | ---: | ---: |",
        f"| Recorrente, por ano | {_brl(low1['recurring'])} | {_brl(base1['recurring'])} | "
        f"{_brl(high1['recurring'])} |",
        f"| Implantação e parecer, uma vez | {_brl(low1['once'])} | {_brl(base1['once'])} | "
        f"{_brl(high1['once'])} |",
        f"| **Ano 1** | **{_brl(low1['year1'])}** | **{_brl(base1['year1'])}** | "
        f"**{_brl(high1['year1'])}** |",
        f"| **Três anos** | **{_brl(low1['three_years'])}** | **{_brl(base1['three_years'])}** | "
        f"**{_brl(high1['three_years'])}** |",
        "",
        "Dividindo a plataforma entre mais hospitais (o que é compartilhado, como o banco, o "
        "servidor, o parecer e o modelo, se divide; a implantação e o treinamento não), no cenário "
        "base:",
        "",
        "| Hospitais na plataforma | Recorrente, por ano | Ano 1 | Três anos |",
        "| ---: | ---: | ---: | ---: |",
    ]
    for n in ("1", "3", "10"):
        row = total["base"][n]
        lines.append(
            f"| {n} | {_brl(row['recurring'])} | {_brl(row['year1'])} | "
            f"{_brl(row['three_years'])} |"
        )
    lines += [
        "",
        "![Custo do primeiro ano e dos três anos por cenário](fig-custos.svg)",
        "",
        "## O preço: piso, teto e se fecha",
        "",
        f"- **Piso:** o custo anual (o recorrente mais a implantação e o parecer diluídos em "
        f"{AMORTIZATION_YEARS} anos) dividido por 1 menos o imposto ({_num(TAX * 100)}%) e a "
        f"margem ({_num(MARGIN * 100)}%).",
        f"- **Teto:** {_num(VALUE_SHARE * 100)}% do benefício central do hospital: metade das "
        "vagas "
        f"descobertas evitada ({_num(UNCOVERED_MANUAL * 100, 1)}% das vagas, na simulação), a "
        f"R$ {_num(SHIFT_VALUE)} por vaga descoberta (referência pública do plantão, Fhemig 2024), "
        "mais as horas de coordenação poupadas.",
        "- **Fecha** quando o piso cabe no teto. O preço sugerido é o meio da faixa. O custo real "
        "de "
        "uma vaga descoberta (V) segue desconhecido e só vem do financeiro do hospital, no piloto.",
        "",
        "Cenário base, por porte e por número de hospitais na plataforma:",
        "",
        "| Porte | Vagas por ano | Benefício central | Teto (30%) | Piso com 1 | Piso com 3 | "
        "Piso com 10 | Fecha? |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
    ]
    for tier in TIERS:
        by_n = prices[tier.key]["base"]
        first = by_n["1"]
        closes = ", ".join(
            f"{n}: {'sim' if by_n[n]['viable'] else 'não'}" for n in ("1", "3", "10")
        )
        lines.append(
            f"| {tier.label} | {_num(tier.shifts_per_year)} | {_brl(first['central_benefit'])} | "
            f"{_brl(first['ceiling'])} | {_brl(by_n['1']['floor'])} | {_brl(by_n['3']['floor'])} | "
            f"{_brl(by_n['10']['floor'])} | {closes} |"
        )
    lines += [
        "",
        "Preço sugerido por mês onde fecha (meio da faixa, cenário base):",
        "",
        "| Porte | Com 1 hospital | Com 3 | Com 10 |",
        "| --- | ---: | ---: | ---: |",
    ]
    for tier in TIERS:
        cells = []
        for n in ("1", "3", "10"):
            suggested = prices[tier.key]["base"][n]["suggested"]
            cells.append(_brl(suggested / 12) if suggested else "não fecha")
        lines.append(f"| {tier.label} | {' | '.join(cells)} |")
    be = metrics["break_even_shifts"]
    lines += [
        "",
        "Volume de vagas por dia a partir do qual o piso cabe no teto (benefício central):",
        "",
        "| Cenário de custo | Com 1 hospital | Com 3 | Com 10 |",
        "| --- | ---: | ---: | ---: |",
    ]
    for scenario in SCENARIOS:
        row = be[scenario]
        lines.append(
            f"| {SCENARIO_NAMES[scenario]} | "
            + " | ".join(f"{_num(row[n] / 365, 1)}" for n in ("1", "3", "10"))
            + " |"
        )
    needed = metrics["needed_shift_value"]
    lines += [
        "",
        "E o custo de uma vaga descoberta (V) que o hospital teria de ter para pagar o piso com "
        f"{_num(VALUE_SHARE * 100)}% do benefício (metade das descobertas evitada, cenário base):",
        "",
        "| Porte | Com 1 hospital | Com 3 | Com 10 |",
        "| --- | ---: | ---: | ---: |",
    ]
    for tier in TIERS:
        row = needed[tier.key]
        lines.append(
            f"| {tier.label} | " + " | ".join(_brl(row[n]) for n in ("1", "3", "10")) + " |"
        )
    returns = grande3["returns"]
    price = grande3["price_used"]
    lines += [
        "",
        f"## O retorno do hospital grande ao preço sugerido ({_brl(price / 12)} por mês)",
        "",
        "Retorno = (benefício menos preço) dividido pelo preço, nos cenários da Entrega 3 "
        "(com 3 hospitais na plataforma, cenário base):",
        "",
        "| Vagas descobertas evitadas | V = R$ 1.000 | V = R$ 2.000 |",
        "| --- | ---: | ---: |",
    ]
    for prevented in PREVENTED:
        lines.append(
            f"| {_num(prevented * 100)}% | {_pct(returns[f'{prevented}:{SHIFT_VALUES[0]}'])} | "
            f"{_pct(returns[f'{prevented}:{SHIFT_VALUES[-1]}'])} |"
        )
    pequeno = prices["pequeno"]["base"]["1"]
    full_small = benefit(TIERS[0].shifts_per_year, 1.0, SHIFT_VALUE)
    lines += [
        "",
        "## Leitura",
        "",
        f"- **O custo total é bem maior que os R$ 34 mil da Entrega 3.** Aquele número era só o "
        f"recorrente de infraestrutura e operação e avisava que faltavam o parecer jurídico e a "
        f"implantação. Com tudo, um hospital sozinho custa {_brl(base1['recurring'])} por ano no "
        f"cenário base, {_brl(base1['year1'])} no primeiro ano e {_brl(base1['three_years'])} em "
        f"três anos, numa faixa de {_brl(low1['year1'])} a {_brl(high1['year1'])} no primeiro ano.",
        f"- **A tecnologia é a parte barata.** Banco, servidor, hospedagem e Gemini somam "
        f"{_brl(infra)} por ano: o custo é de gente (suporte, manutenção do modelo, implantação, "
        "treinamento) e de conformidade (parecer, relatório de impacto, segurança).",
        "- **O custo quase não depende do porte do hospital; o benefício, sim.** Por isso o piso é "
        "praticamente o mesmo nos três portes, e o que decide se o preço fecha é o volume de "
        "plantões.",
        f"- **O preço não fecha para um hospital pequeno nem médio sozinho.** No pequeno, o "
        f"benefício central é de {_brl(pequeno['central_benefit'])} por ano e, mesmo evitando "
        "todas "
        f"as vagas descobertas, seria de {_brl(full_small)}, contra um custo anualizado de "
        f"{_brl(pequeno['annual_cost'])}. O produto só faz sentido financeiro onde há muitos "
        "plantões por dia, ou dividido entre muitos hospitais.",
        f"- **Sozinho, o piso cabe no teto a partir de cerca de "
        f"{_num(be['base']['1'] / 365)} vagas por dia** (cenário base); com 3 hospitais "
        f"dividindo a plataforma, {_num(be['base']['3'] / 365)}; com 10, "
        f"{_num(be['base']['10'] / 365)}. O custo de entregar a um hospital cai quando a "
        "plataforma, o parecer e o modelo são divididos, e é por isso que a venda tende a ser para "
        "redes e grupos, e não para hospitais isolados.",
        f"- **Para o hospital grande, fecha com folga:** com 3 hospitais na plataforma, o preço "
        f"sugerido é de cerca de {_brl(price / 12)} por mês ({_brl(price)} por ano), contra uma "
        f'referência de mercado de {_brl(COMPETITOR_BRL_MONTH)} por mês de "preço inicial" de '
        "outra ferramenta de escala (não confirmada com o fornecedor). O retorno do hospital "
        "depende de V e da parcela evitada, e o piloto é que mede os dois.",
        "- **Isto muda a resposta do documento da Entrega 3,** que dizia que o projeto se paga ao "
        "evitar 17 vagas por ano com V de R$ 2.000: com o custo completo, a conta só fecha em "
        "hospitais de volume alto.",
        "",
        "## Limites",
        "",
        "- É calculadora de premissas: horas, parecer, segurança, margem, imposto e parcela do "
        "benefício são nossos e movem o resultado. Os três cenários mostram o quanto.",
        "- O custo de hora (R$ 150) é de mercado, e não o do grupo, que é de estudantes; serve "
        "para "
        "mostrar o custo de um serviço de verdade.",
        "- O benefício vem da simulação (5,4% de vagas descobertas no processo manual) e de um "
        "valor de plantão público. O coordenador real pode já cobrir bem, e o ganho encolhe.",
        "- Não há tributo, financiamento nem preço por hospital público (que contrata por "
        "licitação ou dispensa): o segmento inicial é o hospital privado e terceirizado.",
        "- Falta cotar: o parecer jurídico, o teste de segurança e o suporte, com fornecedores "
        "reais; e confirmar com o financeiro de um hospital o V e o custo do que ele paga hoje.",
        "",
    ]
    return "\n".join(lines)


def costs_chart(metrics: dict[str, Any]) -> str:
    """Colunas agrupadas: o custo do ano 1 e o de três anos por cenário, com um hospital."""
    from app.charts import COMPACT, column_chart

    rows = [metrics["totals"][scenario]["1"] for scenario in SCENARIOS]
    return column_chart(
        "Custo por hospital, em R$ mil",
        "Ano 1 e três anos; premissas, um hospital na plataforma",
        [SCENARIO_NAMES[scenario] for scenario in SCENARIOS],
        [
            ("Ano 1", [row["year1"] / 1000 for row in rows]),
            ("Três anos", [row["three_years"] / 1000 for row in rows]),
        ],
        lambda value: f"{value:.0f}",
        "Colunas agrupadas com o custo do primeiro ano e o de três anos por hospital, nos cenários "
        "baixo, base e alto.",
        **COMPACT,
    )
