from typing import Iterator

from openai import OpenAI

from app.config import settings
from app.providers.base import LLMProvider


class OpenAICompatProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = OpenAI(
            base_url=settings.llm_base_url or None,
            api_key=settings.llm_api_key or "sk-no-key",
        )

    def chat(self, messages: list) -> str:
        resp = self._client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        return (resp.choices[0].message.content or "").strip()

    def stream(self, messages: list) -> Iterator[str]:
        for chunk in self._client.chat.completions.create(
            model=settings.llm_model,
            messages=messages,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        ):
            tok = chunk.choices[0].delta.content or ""
            if tok:
                yield tok
