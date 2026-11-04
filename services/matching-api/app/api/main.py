"""Monta a aplicação. Em produção: `uvicorn --factory app.api.main:create_app_from_env`."""

import logging
from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.auth import JwksKeys, TokenVerifier
from app.api.errors import ApiError
from app.api.model_store import check_against_registry, load_active_model
from app.api.repository import Repository
from app.api.rest import RestConflict, RestError, SupabaseRest
from app.api.routes import router
from app.api.service import MatchingService
from app.api.settings import Settings
from app.api.world import WorldCache
from app.llm.client import LLMClient, NullClient, client_from_env

logger = logging.getLogger("matching_api")


def create_app(
    *,
    service: MatchingService,
    repository: Repository,
    world: WorldCache,
    verifier: TokenVerifier,
    webhook_secret: str,
    cors_origins: tuple[str, ...] = (),
    expose_docs: bool = False,
    on_startup: Callable[[], None] | None = None,
) -> FastAPI:
    """A aplicação com as dependências recebidas de fora. É assim que os testes a montam."""

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        if on_startup is not None:
            on_startup()
        yield

    app = FastAPI(
        title="PlantãoSeguro: API de matching (simulação)",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if expose_docs else None,
        redoc_url=None,
        openapi_url="/openapi.json" if expose_docs else None,
    )
    app.state.service = service
    app.state.repository = repository
    app.state.world = world
    app.state.verifier = verifier
    app.state.webhook_secret = webhook_secret
    if cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(cors_origins),
            allow_methods=["GET", "POST"],
            allow_headers=["Authorization", "Content-Type"],
        )

    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError) -> JSONResponse:
        headers = {"WWW-Authenticate": "Bearer"} if exc.status == 401 else None
        return JSONResponse(
            {"erro": exc.code, "mensagem": exc.message}, status_code=exc.status, headers=headers
        )

    @app.exception_handler(RequestValidationError)
    async def _invalid_body(_: Request, exc: RequestValidationError) -> JSONResponse:
        # Sem devolver o valor recebido: o texto da vaga é entrada hostil.
        problems = [
            {"campo": ".".join(str(part) for part in error["loc"]), "problema": error["msg"]}
            for error in exc.errors()
        ]
        return JSONResponse({"erro": "entrada_invalida", "campos": problems}, status_code=422)

    @app.exception_handler(RestConflict)
    async def _conflict(_: Request, exc: RestConflict) -> JSONResponse:
        logger.warning("conflito no banco: %s", exc)
        return JSONResponse(
            {"erro": "conflito", "mensagem": "Outra chamada já fez isso. Atualize a tela."},
            status_code=409,
        )

    @app.exception_handler(RestError)
    async def _database(_: Request, exc: RestError) -> JSONResponse:
        logger.error("falha no banco: %s", exc)
        return JSONResponse(
            {"erro": "banco_indisponivel", "mensagem": "O banco não respondeu. Tente de novo."},
            status_code=502,
        )

    app.include_router(router)
    return app


def _llm_from_env() -> LLMClient | None:
    """Sem chave do Gemini, o motor nem tenta o LLM: tudo sai pela reserva em regras."""
    client = client_from_env()
    return None if isinstance(client, NullClient) else client


def create_app_from_env() -> FastAPI:
    """A aplicação real: a API só sobe com os dados carregados e o modelo certo."""
    logging.basicConfig(level=logging.INFO)
    # O httpx registraria cada chamada ao banco, com a URL e os filtros: fica só o que importa.
    logging.getLogger("httpx").setLevel(logging.WARNING)
    settings = Settings.from_env()
    repository = Repository(SupabaseRest(f"{settings.supabase_url}/rest/v1", settings.service_key))
    world = WorldCache(repository)
    model = load_active_model()
    keys = JwksKeys.from_url(f"{settings.supabase_url}/auth/v1/.well-known/jwks.json")

    def startup() -> None:
        check_against_registry(model, repository.active_models())
        keys.refresh()
        world.load()
        logger.info("dados carregados: %s; modelo %s", world.counts(), model.version)

    return create_app(
        service=MatchingService(repository, world, model, llm=_llm_from_env()),
        repository=repository,
        world=world,
        verifier=TokenVerifier(settings.supabase_url, keys),
        webhook_secret=settings.webhook_secret,
        cors_origins=settings.cors_origins,
        expose_docs=settings.expose_docs,
        on_startup=startup,
    )
