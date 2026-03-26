from typing import Iterator

import ollama

from app.config import settings
from app.providers.base import LLMProvider


class OllamaProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = ollama.Client(host=settings.llm_base_url)
        self._opts = {
            "temperature": settings.llm_temperature,
            "num_predict": settings.llm_max_tokens,
            "num_ctx": 14096,
        }

    def chat(self, messages: list) -> str:
        resp = self._client.chat(
            model=settings.llm_model, messages=messages, stream=False, options=self._opts
        )
        return resp["message"]["content"].strip()

    def stream(self, messages: list) -> Iterator[str]:
        for chunk in self._client.chat(
            model=settings.llm_model, messages=messages, stream=True, options=self._opts
        ):
            tok = chunk["message"]["content"]
            if tok:
                yield tok
