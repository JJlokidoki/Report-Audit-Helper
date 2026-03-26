from app.config import settings
from app.providers.base import LLMProvider

_current: LLMProvider | None = None


def _create_provider() -> LLMProvider:
    if settings.llm_provider == "ollama":
        from app.providers.ollama import OllamaProvider
        return OllamaProvider()
    if settings.llm_provider == "gigachat":
        from app.providers.gigachat import GigaChatProvider
        return GigaChatProvider()
    from app.providers.openai_compat import OpenAICompatProvider
    return OpenAICompatProvider()


def get_provider() -> LLMProvider:
    global _current
    if _current is None:
        _current = _create_provider()
    return _current
