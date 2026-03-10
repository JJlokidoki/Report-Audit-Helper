from app.config import settings
from app.providers.base import LLMProvider


def get_provider() -> LLMProvider:
    if settings.llm_provider == "ollama":
        from app.providers.ollama import OllamaProvider
        return OllamaProvider()
    # openai / custom / any OpenAI-compatible API
    from app.providers.openai_compat import OpenAICompatProvider
    return OpenAICompatProvider()
