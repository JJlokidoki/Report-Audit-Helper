import pytest
from unittest.mock import patch

from httpx import ASGITransport, AsyncClient

from app.providers.base import EmbeddingProvider


class MockEmbeddingProvider(EmbeddingProvider):
    def __init__(self, dims: int = 8) -> None:
        self._dims = dims

    @property
    def dimensions(self) -> int:
        return self._dims

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        return [self.embed_query(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        h = hash(text) % 10000
        return [(h + i) % 97 / 97.0 for i in range(self._dims)]


@pytest.fixture()
def mock_provider():
    provider = MockEmbeddingProvider()
    with patch("app.providers._current", provider), \
         patch("app.providers.get_embedding_provider", return_value=provider):
        yield provider


@pytest.fixture()
def tmp_store(tmp_path, mock_provider):
    with patch("app.config.settings.vector_store_path", str(tmp_path / "vs")), \
         patch("app.config.settings.uploads_path", str(tmp_path / "uploads")), \
         patch("app.config.settings.embedding_dimensions", 8):
        yield tmp_path


@pytest.fixture()
async def client(tmp_store):
    from app.main import app
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
