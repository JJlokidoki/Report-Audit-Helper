import logging

from openai import OpenAI

from app.config import settings
from app.providers.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class OpenAICompatEmbeddingProvider(EmbeddingProvider):
    def __init__(self) -> None:
        self._client = OpenAI(
            base_url=settings.embedding_base_url or None,
            api_key=settings.embedding_api_key or "sk-no-key",
        )

    @property
    def dimensions(self) -> int:
        return settings.embedding_dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        logger.info("OpenAI embed request: model=%s, texts=%d", settings.embedding_model, len(texts))
        resp = self._client.embeddings.create(
            model=settings.embedding_model,
            input=texts,
        )
        vectors = [item.embedding for item in resp.data]
        logger.info("OpenAI embed response: vectors=%d, dims=%d", len(vectors), len(vectors[0]) if vectors else 0)
        return vectors

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
