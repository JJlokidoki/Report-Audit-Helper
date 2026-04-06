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


REALISTIC_MD = """\
## Cross-Site Scripting (XSS)

| **Параметр**          | **Значение**        |
| :-------------------- | :------------------ |
| **Уровень опасности** | Средний |
| **CVSS**              | 6.1 |
| **CVSS-вектор**       | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:A/VC:N/VI:L/VA:N/SC:N/SI:N/SA:N |

### Описание

Обнаружена уязвимость XSS в параметре `search` на странице `https://example.com/search`.

### Шаги для повторения

Для эксплуатации данной уязвимости необходимо выполнить следующие действия:

1. Открыть `https://example.com/search?q=<script>alert(1)</script>`.
2. Проанализировать ответ сервера.

### Рекомендации по устранению

1. Реализовать экранирование пользовательского ввода.
2. Ограничить допустимые символы в параметре `search`.
"""


class RealisticMockProvider(LLMProvider):
    """Mock provider returning realistic vulnerability markdown."""
    RESPONSE = REALISTIC_MD

    def chat(self, messages: list, images: list[bytes] | None = None) -> str:
        return self.RESPONSE

    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]:
        # Simulate token-by-token streaming
        for line in self.RESPONSE.splitlines(keepends=True):
            yield line

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
def realistic_provider():
    provider = RealisticMockProvider()
    with patch("app.routers.generate.get_provider", return_value=provider), \
         patch("app.routers.summary.get_provider", return_value=provider):
        yield provider


@pytest.fixture
async def client(mock_provider):
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def realistic_client(realistic_provider):
    from app.main import app
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
