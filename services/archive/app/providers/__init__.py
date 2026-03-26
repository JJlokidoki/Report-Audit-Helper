from app.config import settings
from app.providers.base import EmbeddingProvider

_current: EmbeddingProvider | None = None


def _create_provider() -> EmbeddingProvider:
    name = settings.embedding_provider
    if name == "ollama":
        from app.providers.ollama import OllamaEmbeddingProvider
        return OllamaEmbeddingProvider()
    if name == "gigachat":
        from app.providers.gigachat import GigaChatEmbeddingProvider
        return GigaChatEmbeddingProvider()
    from app.providers.openai_compat import OpenAICompatEmbeddingProvider
    return OpenAICompatEmbeddingProvider()


def get_embedding_provider() -> EmbeddingProvider:
    global _current
    if _current is None:
        _current = _create_provider()
    return _current


def reset_provider() -> None:
    global _current
    _current = None
