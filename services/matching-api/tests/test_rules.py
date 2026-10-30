"""Regras de elegibilidade e jornada: casos de borda (24 h contínuas, 11 h de descanso)."""

import unittest
from dataclasses import replace
from datetime import date, datetime, time

from app.rules import (
    availability_overlap_hours,
    contiguous_hours,
    evaluate_candidate,
    schedule_check,
)
from tests.helpers import (
    DOCTOR,
    FRIDAY_NIGHT,
    POLICY,
    UNIT,
    blocked_window,
    friday_window,
)


def at(day: int, hour: int) -> datetime:
    return datetime(2026, 5, day, hour)


def check(doctor=DOCTOR, **overrides):
    args = {
        "specialty": "pediatria",
        "starts_at": FRIDAY_NIGHT[0],
        "ends_at": FRIDAY_NIGHT[1],
        "unit": UNIT,
        "policy": POLICY,
        "windows": [friday_window()],
        "assignments": [],
    }
    args.update(overrides)
    return evaluate_candidate(doctor, **args)


class JornadaTests(unittest.TestCase):
    def test_conflito_de_horario(self):
        code, _ = schedule_check([(at(1, 19), at(2, 7))], at(1, 23), at(2, 11), POLICY)
        self.assertEqual(code, "schedule_conflict")

    def test_24h_continuas_e_permitido_com_alerta(self):
        code, alerts = schedule_check([(at(1, 19), at(2, 7))], at(2, 7), at(2, 19), POLICY)
        self.assertIsNone(code)
        self.assertTrue(any("colado" in a for a in alerts))
        self.assertTrue(any("limite de 24 h" in a for a in alerts))

    def test_tres_plantoes_colados_passam_de_24h(self):
        done = [(at(1, 19), at(2, 7)), (at(2, 7), at(2, 19))]
        code, _ = schedule_check(done, at(2, 19), at(3, 7), POLICY)
        self.assertEqual(code, "continuous_hours_exceeded")

    def test_cadeia_conta_para_os_dois_lados(self):
        later = [(at(2, 19), at(3, 7))]
        self.assertEqual(contiguous_hours(later, at(2, 7), at(2, 19)), 24.0)
        code, _ = schedule_check(later + [(at(1, 19), at(2, 7))], at(2, 7), at(2, 19), POLICY)
        self.assertEqual(code, "continuous_hours_exceeded")

    def test_descanso_de_10h_viola(self):
        code, _ = schedule_check([(at(1, 19), at(2, 7))], at(2, 17), at(3, 5), POLICY)
        self.assertEqual(code, "rest_violation")

    def test_descanso_de_11h_passa_com_alerta(self):
        code, alerts = schedule_check([(at(1, 19), at(2, 7))], at(2, 18), at(3, 6), POLICY)
        self.assertIsNone(code)
        self.assertTrue(any("descanso de 11 h" in a for a in alerts))

    def test_descanso_de_14h_passa_sem_alerta(self):
        code, alerts = schedule_check([(at(1, 19), at(2, 7))], at(2, 21), at(3, 9), POLICY)
        self.assertIsNone(code)
        self.assertEqual(alerts, ())

    def test_descanso_ate_o_proximo_plantao_tambem_conta(self):
        code, _ = schedule_check([(at(3, 10), at(3, 22))], at(2, 19), at(3, 5), POLICY)
        self.assertEqual(code, "rest_violation")

    def test_limites_sao_configuraveis(self):
        relaxed = replace(POLICY, max_continuous_hours=36)
        done = [(at(1, 19), at(2, 7)), (at(2, 7), at(2, 19))]
        code, _ = schedule_check(done, at(2, 19), at(3, 7), relaxed)
        self.assertIsNone(code)


class ElegibilidadeTests(unittest.TestCase):
    def test_medico_elegivel(self):
        result = check()
        self.assertTrue(result.eligible)
        self.assertEqual(result.overlap_hours, 12.0)
        self.assertEqual(result.specialty_match, 1.0)

    def test_crm_inativo(self):
        result = check(doctor=replace(DOCTOR, crm_status="suspended"))
        self.assertEqual(result.rule_code, "crm_inactive")

    def test_especialidade_diferente(self):
        self.assertEqual(check(specialty="clinica_medica").rule_code, "specialty_mismatch")

    def test_especialidade_secundaria_conforme_a_politica(self):
        doctor = replace(DOCTOR, secondary_specialty="clinica_medica")
        allowed = check(doctor=doctor, specialty="clinica_medica")
        self.assertTrue(allowed.eligible)
        self.assertEqual(allowed.specialty_match, 0.5)
        denied = check(
            doctor=doctor,
            specialty="clinica_medica",
            policy=replace(POLICY, allow_secondary_specialty=False),
        )
        self.assertEqual(denied.rule_code, "specialty_mismatch")

    def test_fora_do_raio(self):
        far = replace(DOCTOR, home_lat=-9.5)
        self.assertEqual(check(doctor=far).rule_code, "outside_radius")

    def test_sem_janela_de_disponibilidade(self):
        self.assertEqual(check(windows=[]).rule_code, "unavailable")

    def test_dia_bloqueado(self):
        windows = [friday_window(), blocked_window(date(2026, 10, 2))]
        self.assertEqual(check(windows=windows).rule_code, "unavailable")

    def test_janela_parcial_depende_da_cobertura_minima(self):
        partial = [friday_window(time(19), time(1))]
        self.assertEqual(availability_overlap_hours(partial, *FRIDAY_NIGHT), 6.0)
        self.assertEqual(check(windows=partial).rule_code, "unavailable")
        half = replace(POLICY, min_overlap_ratio=0.5)
        self.assertTrue(check(windows=partial, policy=half).eligible)

    def test_conflito_de_agenda_barra(self):
        busy = [(datetime(2026, 10, 2, 7), datetime(2026, 10, 2, 19, 30))]
        self.assertEqual(check(assignments=busy).rule_code, "schedule_conflict")

    def test_toda_exclusao_traz_regra_e_texto(self):
        result = check(doctor=replace(DOCTOR, crm_status="expired"))
        self.assertFalse(result.eligible)
        self.assertTrue(result.rule_code and result.rule_text)


if __name__ == "__main__":
    unittest.main()
