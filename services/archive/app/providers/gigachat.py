import logging

import httpx

from app.config import settings
from app.providers.base import EmbeddingProvider

logger = logging.getLogger(__name__)

_BASE_URL = "https://gigachat.devices.sberbank.ru/api/v1"


class GigaChatEmbeddingProvider(EmbeddingProvider):
    def __init__(self) -> None:
        self._model = settings.embedding_model or "Embeddings"

    @property
    def dimensions(self) -> int:
        return settings.embedding_dimensions

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.embedding_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        logger.info("GigaChat embed request: model=%s, texts=%d", self._model, len(texts))
        with httpx.Client(verify=False, timeout=120) as client:
            resp = client.post(
                f"{_BASE_URL}/embeddings",
                headers=self._headers(),
                json={"model": self._model, "input": texts},
            )
            resp.raise_for_status()
            data = resp.json()
            vectors = [item["embedding"] for item in data["data"]]
            logger.info("GigaChat embed response: vectors=%d, dims=%d", len(vectors), len(vectors[0]) if vectors else 0)
            return vectors

    def embed_query(self, text: str) -> list[float]:
        return self.embed_texts([text])[0]
