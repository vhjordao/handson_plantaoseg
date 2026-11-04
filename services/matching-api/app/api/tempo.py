"""Tempo da API. O motor trabalha em hora local sem fuso; o banco guarda instantes com fuso.

A conversão acontece só aqui, na entrada e na saída do banco, para o motor ler os mesmos números
que lê dos CSVs. São Paulo não tem horário de verão desde 2019, como em `app/seed_db.py`.
"""

from datetime import datetime, timedelta, timezone

SAO_PAULO = timezone(timedelta(hours=-3))


def local_from_db(value: str) -> datetime:
    """Instante vindo do banco, com qualquer fuso, em hora local sem fuso."""
    return datetime.fromisoformat(value).astimezone(SAO_PAULO).replace(tzinfo=None)


def db_from_local(value: datetime) -> str:
    """Hora local sem fuso no formato que o banco grava como instante."""
    return value.replace(tzinfo=SAO_PAULO).isoformat(timespec="seconds")


def local_input(value: datetime) -> datetime:
    """Hora recebida pela API: sem fuso já é local; com fuso, é convertida."""
    if value.tzinfo is None:
        return value
    return value.astimezone(SAO_PAULO).replace(tzinfo=None)


def local_now() -> datetime:
    return datetime.now(SAO_PAULO).replace(tzinfo=None, microsecond=0)
