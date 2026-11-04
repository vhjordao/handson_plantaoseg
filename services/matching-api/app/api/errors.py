"""Erros que a API devolve de propósito, com um código estável para a web tratar."""


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str) -> None:
        super().__init__(code)
        self.status = status
        self.code = code
        self.message = message
