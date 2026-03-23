import json
from typing import Iterator

import httpx

from app.config import settings
from app.providers.base import LLMProvider

_BASE_URL = "https://gigachat.devices.sberbank.ru/api/v1"


class GigaChatProvider(LLMProvider):

    @property
    def supports_vision(self) -> bool:
        return False

    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {settings.llm_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    def _body(self, messages: list) -> dict:
        return {
            "model": settings.llm_model,
            "messages": messages,
            "temperature": settings.llm_temperature,
            "max_tokens": settings.llm_max_tokens,
            "stream": False,
        }

    def chat(self, messages: list, images: list[bytes] | None = None) -> str:
        body = self._body(messages)
        with httpx.Client(verify=False, timeout=120) as client:
            resp = client.post(
                f"{_BASE_URL}/chat/completions",
                headers=self._headers(),
                json=body,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()

    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]:
        body = self._body(messages)
        body["stream"] = True
        with httpx.Client(verify=False, timeout=120) as client:
            with client.stream(
                "POST",
                f"{_BASE_URL}/chat/completions",
                headers=self._headers(),
                json=body,
            ) as resp:
                resp.raise_for_status()
                for line in resp.iter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = line[len("data:"):].strip()
                    if payload == "[DONE]":
                        break
                    chunk = json.loads(payload)
                    tok = chunk["choices"][0]["delta"].get("content", "")
                    if tok:
                        yield tok
