import pytest
from httpx import AsyncClient, ASGITransport
from typing import Iterator
from unittest.mock import patch

from app.providers.base import LLMProvider


class MockProvider(LLMProvider):
    RESPONSE = "mocked AI response"

    def chat(self, messages: list, images: list[bytes] | None = None) -> str:
        return self.RESPONSE

    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]:
        yield "mocked"
        yield " AI"
        yield " response"

    @property
    def supports_vision(self) -> bool:
        return True


@pytest.fixture
def mock_provider():
    provider = MockProvider()
    with patch("app.routers.generate.get_provider", return_value=provider), \
         patch("app.routers.summary.get_provider", return_value=provider):
        yield provider


@pytest.fixture
async def client(mock_provider):
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
