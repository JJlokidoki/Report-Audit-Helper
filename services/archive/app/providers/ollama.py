import logging

import ollama

from app.config import settings
from app.providers.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class OllamaEmbeddingProvider(EmbeddingProvider):
    def __init__(self) -> None:
        self._client = ollama.Client(host=settings.embedding_base_url)

    @property
    def dimensions(self) -> int:
        return settings.embedding_dimensions

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        logger.info("Ollama embed request: model=%s, texts=%d", settings.embedding_model, len(texts))
        results = []
        for text in texts:
            resp = self._client.embed(model=settings.embedding_model, input=text)
            results.append(resp["embeddings"][0])
        logger.info("Ollama embed response: vectors=%d, dims=%d", len(results), len(results[0]) if results else 0)
        return results

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
