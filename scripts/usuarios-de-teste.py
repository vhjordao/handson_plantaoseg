#!/usr/bin/env python3
"""Usuários e organização de teste para conferir a API no projeto real. Quem roda é o Victor.

Tudo é sintético: uma organização, um hospital longe dos demais, dois médicos fictícios e três
logins. Os dados de teste ficam separados dos da rede simulada: o coordenador da rede não vê a
trilha desta organização, e o hospital fica fora do raio dos outros médicos.

    py -3.12 scripts/usuarios-de-teste.py criar   --env C:\\dev\\handson_plantaoseg\\.env
    py -3.12 scripts/usuarios-de-teste.py limpar  --env C:\\dev\\handson_plantaoseg\\.env
    py -3.12 scripts/usuarios-de-teste.py remover --env C:\\dev\\handson_plantaoseg\\.env

`criar`: cria tudo e grava os tokens de sessão em `.env.teste`, ao lado do `.env`, fora do Git. As
senhas são sorteadas e descartadas: ninguém as vê.
`limpar`: apaga as vagas, as recomendações e as ofertas da organização de teste.
`remover`: faz o `limpar` e apaga também os logins, os médicos e a unidade. Mudança no banco feita
por aqui pede `POST /internal/reload` na API. A trilha é só de inserção: o que entrou fica, e por
isso a organização fica também.

Nenhum valor secreto é impresso. Só biblioteca padrão.
"""

import argparse
import json
import secrets
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

MANAGEMENT_API = "https://api.supabase.com/v1"
USER_AGENT = "plantaoseguro-usuarios-de-teste"
CHUNK = 100

ORGANIZATION_ID = "70000000-0000-4000-8000-000000000001"
UNIT_ID = "70000000-0000-4000-8000-000000000002"
DOCTOR_IDS = (
    "70000000-0000-4000-8000-000000000011",
    "70000000-0000-4000-8000-000000000012",
)
# Longe dos hospitais simulados (perto de -10, -50): os outros médicos ficam fora do raio.
UNIT_LAT, UNIT_LON = -20.0, -60.0
LOGINS = {
    "COORDENADOR": "coordenador.teste",
    "MEDICO_1": "medico1.teste",
    "MEDICO_2": "medico2.teste",
}
# Nenhum e-mail é enviado. Domínios reservados, para o endereço não ser de ninguém: o segundo só
# entra se o Supabase recusar o primeiro.
EMAIL_DOMAINS = ("plantaoseguro.invalid", "example.org")

ORGANIZATION = {
    "id": ORGANIZATION_ID,
    "name": "Organização de teste (simulação)",
    "kind": "controle_rls",
}
UNIT = {
    "id": UNIT_ID,
    "organization_id": ORGANIZATION_ID,
    "name": "Hospital de Teste (simulação)",
    "zone": "centro",
    "lat": UNIT_LAT,
    "lon": UNIT_LON,
}
POLICY = {
    "organization_id": ORGANIZATION_ID,
    "max_continuous_hours": 24,
    "min_rest_hours": 11,
    "allow_secondary_specialty": True,
    "min_overlap_ratio": 1,
    "default_radius_km": 15,
    "offer_ttl_minutes": 60,
    "top_k": 5,
    "effective_from": "2025-01-01",
}


def doctor_rows() -> list[dict[str, Any]]:
    return [
        {
            "id": doctor_id,
            "name_sim": f"Médico de Teste {index} (simulação)",
            "crm_sim": f"SIM-TT-00000{index}",
            "phone_sim": f"+55 00 90000-000{index}",
            "crm_status": "active",
            "specialty": "clinica_medica",
            "home_lat": UNIT_LAT,
            "home_lon": UNIT_LON,
            "max_radius_km": 50,
            "preferred_period": "any",
            "home_zone": "centro",
            "gender": "F",
            "age_band": "35-44",
        }
        for index, doctor_id in enumerate(DOCTOR_IDS, start=1)
    ]


def availability_rows() -> list[dict[str, Any]]:
    """Disponível o dia inteiro, todos os dias: hora final igual à inicial cobre as 24 h."""
    return [
        {
            "doctor_id": doctor_id,
            "kind": "available",
            "weekday": weekday,
            "start_time": "00:00",
            "end_time": "00:00",
            "valid_from": "2025-01-01",
        }
        for doctor_id in DOCTOR_IDS
        for weekday in range(7)
    ]


def read_env(path: Path) -> dict[str, str]:
    values = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            name, value = line.split("=", 1)
            values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def call(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    body: Any = None,
    tolerate: tuple[int, ...] = (),
) -> Any:
    """Chamada HTTP. O erro mostra só o status e o código do serviço, nunca a resposta inteira."""
    data = None if body is None else json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=data, method=method)
    request.add_header("User-Agent", USER_AGENT)
    request.add_header("Content-Type", "application/json")
    for name, value in headers.items():
        request.add_header(name, value)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
    except urllib.error.HTTPError as error:
        if error.code in tolerate:
            return None
        try:
            detail = json.loads(error.read()).get("code") or ""
        except ValueError:
            detail = ""
        path = urllib.parse.urlparse(url).path
        raise SystemExit(f"Falhou: {method} {path} respondeu {error.code} {detail}") from error
    return json.loads(raw) if raw else None


class Project:
    """As chaves vêm da API de gestão, com o token do `.env`, e só ficam na memória do comando."""

    def __init__(self, env: dict[str, str]) -> None:
        ref = env["SUPABASE_PROJECT_REF"]
        self.url = f"https://{ref}.supabase.co"
        keys = call(
            "GET",
            f"{MANAGEMENT_API}/projects/{ref}/api-keys?reveal=true",
            headers={"Authorization": f"Bearer {env['SUPABASE_ACCESS_TOKEN']}"},
        )
        by_name = {key.get("name"): key.get("api_key") for key in keys}
        self.service = by_name["service_role"]
        self.anon = by_name["anon"]
        self._service_headers = {
            "apikey": self.service,
            "Authorization": f"Bearer {self.service}",
        }

    def rest(self, method: str, path: str, body: Any = None, *, prefer: str = "") -> Any:
        headers = dict(self._service_headers)
        if prefer:
            headers["Prefer"] = prefer
        return call(method, f"{self.url}/rest/v1/{path}", headers=headers, body=body)

    def upsert(self, table: str, rows: Any, conflict: str = "id") -> None:
        self.rest(
            "POST",
            f"{table}?on_conflict={conflict}",
            rows,
            prefer="resolution=ignore-duplicates,return=minimal",
        )

    def delete_in(self, table: str, column: str, values: list[str]) -> None:
        for start in range(0, len(values), CHUNK):
            chunk = ",".join(values[start : start + CHUNK])
            self.rest("DELETE", f"{table}?{column}=in.({chunk})", prefer="return=minimal")

    def ids(self, table: str, column: str, query: str) -> list[str]:
        rows = self.rest("GET", f"{table}?select={column}&{query}") or []
        return [row[column] for row in rows]

    def users_by_email(self) -> dict[str, str]:
        result = call(
            "GET",
            f"{self.url}/auth/v1/admin/users?per_page=200",
            headers=self._service_headers,
        )
        return {user["email"]: user["id"] for user in result.get("users", [])}

    def set_user(self, name: str, password: str, existing: dict[str, str]) -> tuple[str, str]:
        """Cria o login ou troca a senha. Devolve o ID e o e-mail. A senha só vive neste comando."""
        for domain in EMAIL_DOMAINS:
            email = f"{name}@{domain}"
            if email in existing:
                call(
                    "PUT",
                    f"{self.url}/auth/v1/admin/users/{existing[email]}",
                    headers=self._service_headers,
                    body={"password": password},
                )
                return existing[email], email
        for domain in EMAIL_DOMAINS:
            email = f"{name}@{domain}"
            created = call(
                "POST",
                f"{self.url}/auth/v1/admin/users",
                headers=self._service_headers,
                body={"email": email, "password": password, "email_confirm": True},
                tolerate=(400, 422),
            )
            if created:
                return created["id"], email
        raise SystemExit("O Supabase recusou os e-mails de teste.")

    def refresh_token(self, email: str, password: str) -> str:
        session = call(
            "POST",
            f"{self.url}/auth/v1/token?grant_type=password",
            headers={"apikey": self.anon},
            body={"email": email, "password": password},
        )
        return session["refresh_token"]


def create(project: Project, env_path: Path) -> None:
    project.upsert("organizations", [ORGANIZATION])
    project.upsert("units", [UNIT])
    project.upsert("policy_config", [POLICY], conflict="organization_id,effective_from")
    project.upsert("doctors", doctor_rows())
    if not project.ids("doctor_availability", "id", f"doctor_id=eq.{DOCTOR_IDS[0]}&limit=1"):
        project.rest("POST", "doctor_availability", availability_rows(), prefer="return=minimal")

    existing = project.users_by_email()
    lines = [
        "# Gerado por scripts/usuarios-de-teste.py. Fora do Git. Nunca imprima nem copie.",
        f"TESTE_SUPABASE_URL={project.url}",
        f"TESTE_ANON_KEY={project.anon}",
        f"TESTE_UNIT_ID={UNIT_ID}",
        f"TESTE_DOCTOR_1_ID={DOCTOR_IDS[0]}",
        f"TESTE_DOCTOR_2_ID={DOCTOR_IDS[1]}",
    ]
    profiles = []
    for name, login in LOGINS.items():
        password = secrets.token_urlsafe(32)
        user_id, email = project.set_user(login, password, existing)
        lines.append(f"TESTE_{name}_REFRESH={project.refresh_token(email, password)}")
        if name == "COORDENADOR":
            profiles.append(
                {"id": user_id, "role": "coordinator", "organization_id": ORGANIZATION_ID}
            )
        else:
            doctor_id = DOCTOR_IDS[0] if name == "MEDICO_1" else DOCTOR_IDS[1]
            profiles.append({"id": user_id, "role": "doctor", "doctor_id": doctor_id})
    # A lista precisa ter as mesmas chaves em todas as linhas.
    for profile in profiles:
        profile.setdefault("organization_id", None)
        profile.setdefault("doctor_id", None)
    project.upsert("profiles", profiles)

    # Referências da outra organização, para a API provar que recusa. Só IDs sintéticos.
    other_unit = project.ids("units", "id", f"organization_id=neq.{ORGANIZATION_ID}&limit=1")
    other_shift = project.ids("shifts", "id", f"unit_id=eq.{other_unit[0]}&limit=1")
    lines += [f"TESTE_OUTRA_UNIDADE={other_unit[0]}", f"TESTE_OUTRA_VAGA={other_shift[0]}"]

    target = env_path.with_name(".env.teste")
    target.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Pronto: organização, 2 médicos e 3 logins de teste. Tokens em {target}.")


def clean(project: Project) -> None:
    shifts = project.ids("shifts", "id", f"unit_id=eq.{UNIT_ID}")
    requests = project.ids("shift_requests", "id", f"unit_id=eq.{UNIT_ID}")
    recommendations = []
    for start in range(0, len(shifts), CHUNK):
        chunk = ",".join(shifts[start : start + CHUNK])
        recommendations += project.ids("recommendations", "id", f"shift_id=in.({chunk})")
    project.delete_in("explanations", "recommendation_id", recommendations)
    project.delete_in("recommendations", "id", recommendations)
    project.delete_in("recommendation_exclusions", "shift_id", shifts)
    project.delete_in("offers", "shift_id", shifts)
    project.delete_in("shifts", "id", shifts)
    project.delete_in("shift_requests", "id", requests)
    print(f"Limpeza: {len(shifts)} vagas, {len(recommendations)} recomendações e as ofertas delas.")
    print("A trilha de auditoria não muda: ela é só de inserção.")


def remove(project: Project) -> None:
    clean(project)
    project.delete_in("recommendation_exclusions", "doctor_id", list(DOCTOR_IDS))
    users = project.users_by_email()
    for login in LOGINS.values():
        for domain in EMAIL_DOMAINS:
            user_id = users.get(f"{login}@{domain}")
            if user_id:
                call(
                    "DELETE",
                    f"{project.url}/auth/v1/admin/users/{user_id}",
                    headers=project._service_headers,
                )
    project.delete_in("doctor_availability", "doctor_id", list(DOCTOR_IDS))
    project.delete_in("doctors", "id", list(DOCTOR_IDS))
    project.rest(
        "DELETE", f"policy_config?organization_id=eq.{ORGANIZATION_ID}", prefer="return=minimal"
    )
    project.delete_in("units", "id", [UNIT_ID])
    print("Logins, médicos, política e unidade de teste removidos.")
    print("A organização de teste fica, porque a trilha aponta para ela.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("comando", choices=("criar", "limpar", "remover"))
    parser.add_argument("--env", default=".env", help="caminho do .env com os tokens do projeto")
    args = parser.parse_args()
    env_path = Path(args.env).resolve()
    env = read_env(env_path)
    if not env.get("SUPABASE_PROJECT_REF") or not env.get("SUPABASE_ACCESS_TOKEN"):
        print(f"Faltam SUPABASE_PROJECT_REF e SUPABASE_ACCESS_TOKEN em {env_path}", file=sys.stderr)
        return 2
    project = Project(env)
    if args.comando == "criar":
        create(project, env_path)
    elif args.comando == "limpar":
        clean(project)
    else:
        remove(project)
    print("Lembrete: depois de mudar o banco por aqui, a API precisa reler os dados.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
