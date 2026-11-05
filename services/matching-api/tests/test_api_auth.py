"""Validação do JWT: só o token do Supabase deste projeto, e nunca pela palavra do próprio token."""

import base64
import hashlib
import hmac
import json
import unittest
from datetime import UTC, datetime, timedelta

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.api.auth import ALGORITHMS, JWKS_MIN_REFRESH_SECONDS, JwksKeys, TokenVerifier
from app.api.errors import ApiError
from tests.api_fakes import COORDINATOR_B, KID, PUBLIC_KEY, SUPABASE_URL, StaticKeys, make_token


def _b64(data: dict) -> str:
    raw = json.dumps(data).encode("utf-8")
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


class TokenVerifierTests(unittest.TestCase):
    def setUp(self):
        self.verifier = TokenVerifier(SUPABASE_URL, StaticKeys())

    def assert_rejected(self, token):
        with self.assertRaises(ApiError) as caught:
            self.verifier.user_id(token)
        self.assertEqual(caught.exception.status, 401)
        self.assertEqual(caught.exception.code, "token_invalido")

    def test_token_valido_devolve_o_usuario(self):
        self.assertEqual(self.verifier.user_id(make_token(COORDINATOR_B)), COORDINATOR_B)

    def test_token_vencido(self):
        self.assert_rejected(make_token(COORDINATOR_B, exp=datetime.now(UTC) - timedelta(hours=1)))

    def test_outra_audiencia(self):
        self.assert_rejected(make_token(COORDINATOR_B, aud="anon"))

    def test_outro_emissor(self):
        self.assert_rejected(make_token(COORDINATOR_B, iss="https://outro.supabase.invalid/auth/v1"))

    def test_sem_usuario_ou_usuario_que_nao_e_uuid(self):
        self.assert_rejected(make_token("nao-e-uuid"))
        self.assert_rejected(make_token("eq.1&id=neq.0"))

    def test_chave_desconhecida(self):
        self.assert_rejected(make_token(COORDINATOR_B, headers={"kid": "outra"}))

    def test_outra_chave_com_o_mesmo_kid(self):
        other = ec.generate_private_key(ec.SECP256R1())
        token = jwt.encode(
            {
                "sub": COORDINATOR_B,
                "aud": "authenticated",
                "iss": f"{SUPABASE_URL}/auth/v1",
                "exp": datetime.now(UTC) + timedelta(hours=1),
            },
            other,
            algorithm="ES256",
            headers={"kid": KID},
        )
        self.assert_rejected(token)

    def test_alg_none_nao_passa(self):
        header = {"alg": "none", "typ": "JWT", "kid": KID}
        claims = {
            "sub": COORDINATOR_B,
            "aud": "authenticated",
            "iss": f"{SUPABASE_URL}/auth/v1",
            "exp": 4102444800,
        }
        self.assert_rejected(f"{_b64(header)}.{_b64(claims)}.")

    def test_troca_de_algoritmo_nao_passa(self):
        # O ataque clássico: assinar com HS256 usando a chave pública como se fosse um segredo.
        public_pem = PUBLIC_KEY.public_bytes(
            serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
        )
        header = _b64({"alg": "HS256", "typ": "JWT", "kid": KID})
        claims = _b64(
            {
                "sub": COORDINATOR_B,
                "aud": "authenticated",
                "iss": f"{SUPABASE_URL}/auth/v1",
                "exp": 4102444800,
            }
        )
        signature = hmac.new(public_pem, f"{header}.{claims}".encode(), hashlib.sha256).digest()
        forged = f"{header}.{claims}." + base64.urlsafe_b64encode(signature).rstrip(b"=").decode()
        self.assert_rejected(forged)

    def test_a_lista_de_algoritmos_e_so_a_do_projeto(self):
        # A biblioteca já recusa HS256 com chave EC; a lista fechada não depende disso.
        self.assertEqual(ALGORITHMS, ["ES256"])

    def test_lixo_nao_passa(self):
        for token in ("", "a", "a.b", "a.b.c"):
            self.assert_rejected(token)


class JwksKeysTests(unittest.TestCase):
    def setUp(self):
        self.now = 1000.0
        self.fetches = 0
        public = ec.generate_private_key(ec.SECP256R1()).public_key()
        numbers = public.public_numbers()

        def encode(value: int) -> str:
            return base64.urlsafe_b64encode(value.to_bytes(32, "big")).rstrip(b"=").decode()

        self.document = {
            "keys": [
                {
                    "kid": "k1",
                    "kty": "EC",
                    "crv": "P-256",
                    "alg": "ES256",
                    "x": encode(numbers.x),
                    "y": encode(numbers.y),
                }
            ]
        }

    def keys(self):
        def fetch():
            self.fetches += 1
            return self.document

        return JwksKeys(fetch, clock=lambda: self.now)

    def test_busca_uma_vez_e_guarda(self):
        keys = self.keys()
        self.assertIsNotNone(keys.key_for("k1"))
        self.assertIsNotNone(keys.key_for("k1"))
        self.assertEqual(self.fetches, 1)

    def test_token_inventado_nao_vira_uma_chamada_por_requisicao(self):
        keys = self.keys()
        for index in range(50):
            self.assertIsNone(keys.key_for(f"inventada-{index}"))
        self.assertEqual(self.fetches, 1)

    def test_chave_nova_e_achada_depois_do_intervalo(self):
        keys = self.keys()
        self.assertIsNone(keys.key_for("k2"))
        rotated = {**self.document["keys"][0], "kid": "k2"}
        self.document = {"keys": [rotated]}
        self.now += JWKS_MIN_REFRESH_SECONDS + 1
        self.assertIsNotNone(keys.key_for("k2"))
        self.assertEqual(self.fetches, 2)


if __name__ == "__main__":
    unittest.main()
