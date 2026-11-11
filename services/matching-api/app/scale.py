"""Escala hospitalar: o motor e a API aguentam o volume de um hospital? (feedback da Entrega 3).

O professor perguntou se a arquitetura atual suporta o volume de um ambiente hospitalar, e sugeriu
simular, pesquisar ou usar valores mais perto do real. A medição de carga de 04/11
(`docs/resultados/metricas-carga-api.md`) cobre a API com o banco de 302 médicos. Aqui se mede o que
ela não cobre:

* **O motor com redes maiores.** A rede simulada é replicada (médicos, disponibilidades e ofertas)
  em 1, 3, 10 e 30 vezes, e se mede quanto cresce o tempo de recomendar uma vaga, o de reconstruir
  o índice de variáveis (`FeatureStore`), que a API refaz depois de cada escrita, e a memória.
* **O volume que cada porte de hospital pede**, a partir de premissas declaradas (não há dado real).

Tudo em Python puro, sem banco nem rede: mede o custo do motor numa máquina só, em um processo, como
a API roda. Os tempos valem pela proporção, e não pelo valor absoluto: o servidor é outra máquina.
"""

import gc
import statistics
import time
import tracemalloc
from dataclasses import dataclass, replace
from datetime import datetime
from typing import Any

from app.llm.guardrails import ShiftFields
from app.models import Dataset
from app.pipeline import recommend
from app.ranking.compute import FeatureStore
from app.ranking.model import LogisticModel

FACTORS = (1, 3, 10, 30)
SHIFTS_MEASURED = 12
STORE_REPEATS = 3


def scale_dataset(dataset: Dataset, factor: int) -> Dataset:
    """Replica médicos, disponibilidades e ofertas `factor` vezes; vagas e unidades não mudam."""
    doctors = dict(dataset.doctors)
    windows = {key: list(rows) for key, rows in dataset.windows.items()}
    latent = dict(dataset.latent)
    offers = list(dataset.offers)
    for copy in range(1, factor):
        suffix = f"~{copy}"
        for doctor in dataset.doctors.values():
            new_id = doctor.id + suffix
            doctors[new_id] = replace(doctor, id=new_id)
            windows[new_id] = [
                replace(w, id=w.id + suffix, doctor_id=new_id)
                for w in dataset.windows.get(doctor.id, [])
            ]
            latent[new_id] = dataset.latent[doctor.id]
        offers.extend(
            replace(o, id=o.id + suffix, doctor_id=o.doctor_id + suffix) for o in dataset.offers
        )
    return replace(dataset, doctors=doctors, windows=windows, offers=offers, latent=latent)


def _percentile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    return ordered[min(len(ordered) - 1, int(q * len(ordered)))]


def _test_shifts(dataset: Dataset, params: dict[str, Any], count: int) -> list[Any]:
    start = datetime.fromisoformat(params["test_start"])
    shifts = sorted(
        (s for s in dataset.shifts.values() if s.published_at >= start),
        key=lambda s: (s.published_at, s.id),
    )
    step = max(1, len(shifts) // count)
    return shifts[::step][:count]


def measure_factor(
    base: Dataset, params: dict[str, Any], model: LogisticModel, factor: int
) -> dict[str, Any]:
    """Tempo de recomendar, de reconstruir o índice e a memória para a rede replicada."""
    dataset = scale_dataset(base, factor)
    shifts = _test_shifts(dataset, params, SHIFTS_MEASURED)
    gc.collect()
    builds = []
    store = FeatureStore(dataset)
    for _ in range(STORE_REPEATS):
        started = time.perf_counter()
        store = FeatureStore(dataset)
        builds.append(time.perf_counter() - started)
    times: list[float] = []
    for shift in shifts:
        fields = ShiftFields(
            shift.unit_id, shift.specialty, shift.starts_at, shift.ends_at, shift.urgency
        )
        started = time.perf_counter()
        recommend(dataset, store, model, fields, shift.published_at, key=shift.id)
        times.append(time.perf_counter() - started)
    return {
        "factor": factor,
        "doctors": len(dataset.doctors),
        "offers": len(dataset.offers),
        "windows": sum(len(rows) for rows in dataset.windows.values()),
        "recommend_median_ms": statistics.median(times) * 1000,
        "recommend_p95_ms": _percentile(times, 0.95) * 1000,
        "store_build_ms": statistics.median(builds) * 1000,
    }


def _traced_mb(base: Dataset, factor: int) -> float:
    gc.collect()
    tracemalloc.start()
    try:
        dataset = scale_dataset(base, factor)
        store = FeatureStore(dataset)
        current, _ = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    del dataset, store
    return current / (1024 * 1024)


def memory_per_copy_mb(base: Dataset) -> float:
    """Memória de uma cópia da rede (300 médicos e 7.555 ofertas), pelo tracemalloc.

    A base original foi criada antes da medição e não entra na conta de `scale_dataset(base, 1)`,
    então a cópia se estima pela diferença entre 30 e 1 vezes, dividida por 29.
    """
    return (_traced_mb(base, 30) - _traced_mb(base, 1)) / 29


def measure(
    base: Dataset, params: dict[str, Any], model: LogisticModel, factors: tuple[int, ...] = FACTORS
) -> dict[str, Any]:
    per_copy = memory_per_copy_mb(base)
    rows = [measure_factor(base, params, model, factor) for factor in factors]
    for row in rows:
        row["memory_mb"] = per_copy * row["factor"]
    return {"memory_per_copy_mb": per_copy, "rows": rows}


# --- O volume que cada porte pede (premissas declaradas; não há dado real) -------------------

# Da medição de carga de 04/11 (`metricas-carga-api.md`), no servidor da apresentação (1 vCPU):
SERVER_CYCLE_CPU_S = 0.54 / 6.4  # fluxo completo a 10 simultâneas: 54% de CPU para 6,4 ciclos/s
SERVER_READ_LIMIT = 431.5  # leituras diretas do Supabase por segundo, com 40 simultâneas, sem platô
SERVER_AUTH_LIMIT = 270.0  # chamadas por segundo nas rotas com login, onde a CPU limita
RATE_LIMIT_PER_IP = 30.0  # Traefik: chamadas por segundo por IP (rajada de 60)
GEMINI_DAILY_CAP = 100  # teto diário da API (0.5.1) abaixo da cota gratuita
CONTAINER_MB = 512  # limite de memória da API no servidor
PROCESS_BASE_MB = 70  # a API sem dados (56 a 79 MB nas medições, com o pacote do Gemini)

# Premissas deste modelo (nenhuma é medida; mudam o resultado e por isso ficam à vista):
OFFERS_PER_SHIFT = 1.37  # simulação (experimento da concentração)
OFFERS_PER_DOCTOR_YEAR = 25.2  # simulação: 7.555 ofertas para 300 médicos em um ano
ONLINE_SHARE_PEAK = 0.10  # parcela dos médicos com a tela aberta no pico
OPEN_CASCADES_PER_COORDINATOR = 3  # telas de vaga abertas ao mesmo tempo por coordenador
BULK_SHARE = 0.25  # parcela do mês publicada em lote em 10 minutos (escala colada de uma vez)
BULK_SECONDS = 600
POLL_SECONDS = 3.0  # D7 do ADR 0015
# Requisições por consulta, contadas no código do adaptador `live` (ver o relatório):
DOCTOR_POLL_NOW, DOCTOR_POLL_AFTER = 4, 1
COORD_POLL_NOW, COORD_POLL_AFTER = 6, 3  # uma delas é na API (`GET /shifts/{id}/decision`)
COORD_API_POLL = 1


@dataclass(frozen=True)
class Hospital:
    key: str
    label: str
    doctors: int
    shifts_per_day: float
    coordinators: int


HOSPITALS: tuple[Hospital, ...] = (
    Hospital("P", "Pequeno: 1 pronto-socorro", 150, 6.0, 1),
    Hospital("M", "Médio: a rede simulada, 3 unidades", 300, 6.7, 2),
    Hospital("G", "Grande: hospital de referência", 1500, 40.0, 6),
    Hospital("R", "Rede: 10 hospitais no mesmo sistema", 6000, 150.0, 20),
)


def _per_doctor(rows: list[dict[str, Any]], field: str) -> float:
    """Custo por médico, pela medição da maior rede (o custo cresce em linha reta)."""
    last = rows[-1]
    return last[field] / last["doctors"]


def _status(use: float) -> str:
    if use < 0.5:
        return "folga"
    if use <= 1.0:
        return "atenção"
    return "excede"


def workload(measured: dict[str, Any]) -> list[dict[str, Any]]:
    """O que cada porte de hospital pede, contra cada limite medido ou conhecido."""
    rows = measured["rows"]
    recommend_per_doctor = _per_doctor(rows, "recommend_median_ms")
    store_per_doctor = _per_doctor(rows, "store_build_ms")
    base = rows[0]
    out: list[dict[str, Any]] = []
    for hospital in HOSPITALS:
        n = hospital.doctors
        recommend_s = (recommend_per_doctor * n - base["recommend_median_ms"]) / 1000
        store_s = store_per_doctor * n / 1000
        cycle_s = SERVER_CYCLE_CPU_S + max(0.0, recommend_s) + store_s
        cycles_per_second = 1 / cycle_s
        burst = hospital.shifts_per_day * 30 * BULK_SHARE / BULK_SECONDS
        screens = n * ONLINE_SHARE_PEAK
        coord_screens = hospital.coordinators * OPEN_CASCADES_PER_COORDINATOR
        reads_now = screens * DOCTOR_POLL_NOW / POLL_SECONDS + (
            coord_screens * (COORD_POLL_NOW - COORD_API_POLL) / POLL_SECONDS
        )
        reads_after = screens * DOCTOR_POLL_AFTER / POLL_SECONDS + (
            coord_screens * (COORD_POLL_AFTER - COORD_API_POLL) / POLL_SECONDS
        )
        api_polls = coord_screens * COORD_API_POLL / POLL_SECONDS
        calls_per_shift = 4 + OFFERS_PER_SHIFT  # publicar, recomendar, aprovar e responder
        api_calls = burst * calls_per_shift + api_polls
        offers_history = n * OFFERS_PER_DOCTOR_YEAR
        memory = PROCESS_BASE_MB + measured["memory_per_copy_mb"] * n / 300
        uses = {
            "cpu": burst / cycles_per_second,
            "reads_now": reads_now / SERVER_READ_LIMIT,
            "reads_after": reads_after / SERVER_READ_LIMIT,
            "rate": api_calls / RATE_LIMIT_PER_IP,
            "gemini": hospital.shifts_per_day / GEMINI_DAILY_CAP,
            "memory": memory / CONTAINER_MB,
        }
        out.append(
            {
                "key": hospital.key,
                "label": hospital.label,
                "doctors": n,
                "shifts_per_day": hospital.shifts_per_day,
                "coordinators": hospital.coordinators,
                "offers_history": offers_history,
                "online_screens": screens,
                "cycle_cpu_s": cycle_s,
                "cycles_per_second": cycles_per_second,
                "burst_cycles_per_second": burst,
                "reads_per_second_now": reads_now,
                "reads_per_second_after": reads_after,
                "api_calls_per_second": api_calls,
                "memory_mb": memory,
                "use": uses,
                "status": {name: _status(value) for name, value in uses.items()},
            }
        )
    return out


def evaluate_scale(
    base: Dataset, params: dict[str, Any], model: LogisticModel, factors: tuple[int, ...] = FACTORS
) -> dict[str, Any]:
    measured = measure(base, params, model, factors)
    return {"label": "simulacao", **measured, "hospitals": workload(measured)}


# --- Relatório --------------------------------------------------------------------------------


def _num(value: float, digits: int = 0) -> str:
    return f"{value:,.{digits}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _pct(value: float) -> str:
    return f"{value * 100:.0f}%".replace(".", ",")


def render_scale(metrics: dict[str, Any]) -> str:
    """Relatório em Markdown, com o rótulo de simulação nos números do motor e das premissas."""
    rows = metrics["rows"]
    hospitals = metrics["hospitals"]
    by_key = {h["key"]: h for h in hospitals}
    big = rows[-1]
    lines = [
        "# Escala hospitalar: o que o motor e a API aguentam (simulação)",
        "",
        "> **Simulação.** O motor foi medido com dados sintéticos replicados e as premissas de "
        "volume e de uso são nossas, sem dado real. Os tempos são do motor em Python, em um "
        "processo, numa máquina de desenvolvimento: valem pela proporção, e não pelo valor "
        "absoluto no servidor da apresentação. Gerado por `python -m app.cli scale`.",
        "",
        "## Pergunta",
        "",
        "O professor perguntou, na Entrega 3, se a solução e a arquitetura atual suportam o "
        "volume de um ambiente hospitalar. A medição de carga de 04/11 "
        "([resultado](metricas-carga-api.md)) mostrou a API com 302 médicos. Aqui se mede o que "
        "ela não cobre e se confronta com o volume que cada porte de hospital pede.",
        "",
        "## O motor com redes maiores",
        "",
        "A rede simulada (300 médicos e 7.555 ofertas, um ano de histórico) foi replicada 1, 3, "
        "10 e 30 vezes. Para cada tamanho, mediu-se o tempo de recomendar uma vaga (mediana de "
        f"{SHIFTS_MEASURED} vagas), o de reconstruir o índice de variáveis, que a API refaz "
        "depois de cada escrita, e a memória do mundo carregado.",
        "",
        "| Médicos | Ofertas no histórico | Recomendar uma vaga (mediana / p95) | Reconstruir o "
        "índice | Memória do mundo |",
        "| ---: | ---: | ---: | ---: | ---: |",
    ]
    for r in rows:
        lines.append(
            f"| {_num(r['doctors'])} | {_num(r['offers'])} | "
            f"{_num(r['recommend_median_ms'], 1)} ms / {_num(r['recommend_p95_ms'], 1)} ms | "
            f"{_num(r['store_build_ms'])} ms | "
            f"{_num(r['memory_mb'])} MB |"
        )
    lines += [
        "",
        "- **O custo do motor cresce em linha reta com o número de médicos**, e é pequeno: com "
        f"{_num(big['doctors'])} médicos, recomendar uma vaga leva "
        f"{_num(big['recommend_median_ms'])} ms. Quase todo o tempo de uma recomendação na API "
        "(276 ms na medição de 04/11) vem das idas e vindas ao banco, e não do motor.",
        "- **O índice de variáveis é o item que mais pesa:** a API o reconstrói inteiro na próxima "
        f"recomendação depois de qualquer escrita (`WorldCache`), e com {_num(big['doctors'])} "
        f"médicos isso leva {_num(big['store_build_ms'])} ms. É um ponto de otimização conhecido "
        "(atualizar o índice em vez de refazê-lo), não necessário nos portes P, M e G.",
        f"- **Memória:** cerca de {_num(metrics['memory_per_copy_mb'], 1)} MB por 300 médicos com "
        "um ano de histórico. Os 512 MB do contêiner aguentam bem uma rede de milhares de médicos "
        "por vários anos de histórico, mas o histórico só cresce.",
        "",
        "## O volume que cada porte pede",
        "",
        "Premissas, todas à vista porque mudam o resultado: "
        f"{_pct(ONLINE_SHARE_PEAK)} dos médicos com a tela aberta no pico, cada coordenador com "
        f"{OPEN_CASCADES_PER_COORDINATOR} telas de vaga abertas, {OFFERS_PER_SHIFT:.2f} ofertas "
        f"por vaga (simulação), {_pct(BULK_SHARE)} das vagas do mês publicadas em lote em "
        f"{BULK_SECONDS // 60} minutos (a escala mensal colada de uma vez) e consulta a cada "
        f"{POLL_SECONDS:.0f} s (D7). Os tamanhos dos hospitais são escolhas nossas, não dado "
        "real: o que vale é onde cada limite estoura.",
        "",
        "| Porte | Médicos | Vagas por dia | Telas de médico no pico | Leituras por segundo "
        "(hoje, com 4 por consulta) | Leituras por segundo (com 1 por consulta) |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for h in hospitals:
        lines.append(
            f"| {h['key']}: {h['label']} | {_num(h['doctors'])} | {_num(h['shifts_per_day'], 1)} | "
            f"{_num(h['online_screens'])} | {_num(h['reads_per_second_now'])} | "
            f"{_num(h['reads_per_second_after'])} |"
        )
    lines += [
        "",
        "Uso de cada limite (abaixo de 50% é folga, até 100% é atenção, acima disso excede):",
        "",
        "| Porte | CPU do servidor no lote | Leituras do Supabase (hoje) | Leituras (com 1 por "
        "consulta) | Limite de 30 chamadas por segundo por IP | Teto diário do Gemini | "
        "Memória da API |",
        "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for h in hospitals:
        u, st = h["use"], h["status"]
        lines.append(
            f"| {h['key']} | {_pct(u['cpu'])} ({st['cpu']}) | {_pct(u['reads_now'])} "
            f"({st['reads_now']}) | {_pct(u['reads_after'])} ({st['reads_after']}) | "
            f"{_pct(u['rate'])} ({st['rate']}) | {_pct(u['gemini'])} ({st['gemini']}) | "
            f"{_pct(u['memory'])} ({st['memory']}) |"
        )
    g, r = by_key["G"], by_key["R"]
    lines += [
        "",
        "## Leitura",
        "",
        f"- **Um hospital grande (G) cabe no desenho de hoje no que depende de CPU e memória.** No "
        f"lote da escala mensal, a CPU do servidor fica em {_pct(g['use']['cpu'])} e a memória "
        f"em {_pct(g['use']['memory'])}. O motor não é o gargalo.",
        "- **O que aperta primeiro é a consulta a cada 3 segundos das telas.** Cada médico com a "
        "tela aberta faz 4 requisições por consulta (as ofertas, os médicos, as recomendações e "
        "as explicações), e o coordenador faz 6 (uma delas na API). Em G, são "
        f"{_num(g['reads_per_second_now'])} leituras por segundo no pico, "
        f"{_pct(g['use']['reads_now'])} do que o Supabase gratuito entregou na medição; em R, "
        f"{_num(r['reads_per_second_now'])} por segundo, que **excede** o medido. Com uma "
        f"requisição por consulta (as demais ficam guardadas na tela), G cai para "
        f"{_num(g['reads_per_second_after'])} por segundo e R para "
        f"{_num(r['reads_per_second_after'])}.",
        "- **Uma rede de dez hospitais (R) chega ao limite da CPU no lote:** "
        f"{_pct(r['use']['cpu'])} ({_num(r['cycles_per_second'], 1)} ciclos de vaga por segundo "
        "de capacidade, contra "
        f"{_num(r['burst_cycles_per_second'], 1)} de demanda), sobretudo pela reconstrução do "
        "índice depois de cada escrita. É onde a otimização do índice passa a valer a pena.",
        f"- **O teto diário do Gemini (100 chamadas) cobre P, M e G e não cobre R "
        f"({_num(r['shifts_per_day'])} vagas por dia).** Em produção, o Gemini vai para a camada "
        "paga, como o documento da Entrega 3 já prevê.",
        f"- **O limite de 30 chamadas por segundo por IP aperta só na rede.** Só a API passa por "
        f"ele (as telas leem o Supabase direto), mas a consulta da cascata do coordenador passa. "
        f"Em G, o uso é de {_pct(g['use']['rate'])}; em R, de {_pct(r['use']['rate'])}, porque um "
        "hospital inteiro sai por um IP só. O valor se ajusta no `.env` do servidor.",
        "- **Três limites não aparecem na conta e são de arquitetura:** (1) a API é um processo "
        "só, com o mundo em memória: dois processos teriam cópias diferentes, então ela não "
        "escala para os lados nem tem alta disponibilidade sem uma invalidação compartilhada; "
        "(2) o servidor é uma máquina só, sem redundância, escolha consciente para a "
        "apresentação; (3) o Supabase gratuito pausa por inatividade, não tem backup e não tem "
        "garantia de disponibilidade.",
        "",
        "## O que muda em produção, em ordem",
        "",
        "1. **Menos consultas por tela** (feito junto deste relatório): guardar na tela o que não "
        "muda entre consultas e limitar o histórico lido. Reduz as leituras para um quarto.",
        "2. **Notificação em vez de consulta** (Supabase Realtime) ou uma consulta mais espaçada "
        "para quem não está esperando uma oferta. Reduz as leituras por ordem de grandeza.",
        "3. **Supabase pago** (backup, sem pausa, disponibilidade contratada) e o limite por IP "
        "ajustado ao hospital.",
        "4. **API com mais de um processo**, com a cópia do mundo invalidada por um aviso "
        "compartilhado (o Redis do n8n já está no servidor) e o índice de variáveis atualizado em "
        "vez de refeito.",
        "5. **Servidor maior ou dois servidores** atrás do Traefik, depois do item 4.",
        "",
        "## Limites desta medição",
        "",
        "- É o motor, sem banco nem rede, numa máquina de desenvolvimento. O servidor (1 vCPU) é "
        "mais lento, e as idas ao banco dominam o tempo real de uma recomendação.",
        "- As cópias da rede têm médicos iguais aos originais: o tempo do motor não depende dos "
        "valores, mas a diversidade real de agendas e distâncias pode mudar um pouco o filtro.",
        "- Os tamanhos de hospital, a parcela online no pico e o lote mensal são premissas. O "
        "teto de leituras (431 por segundo) é o do Supabase gratuito numa consulta simples, com "
        "40 simultâneas e sem platô: pode ser maior, e consultas reais com junções são mais "
        "pesadas.",
        "- Não houve novo teste de carga no servidor: a medição de 04/11 continua sendo a única, e "
        "ela deve ser repetida em um piloto, com o tráfego real.",
        "",
    ]
    return "\n".join(lines)
