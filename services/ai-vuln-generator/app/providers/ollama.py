from typing import Iterator

import ollama

from app.config import settings
from app.providers.base import LLMProvider


def _inject_images(messages: list, images: list[bytes]) -> list:
    """Attach images to the first user message."""
    result = [m.copy() for m in messages]
    for m in result:
        if m.get("role") == "user":
            m["images"] = images
            break
    return result


class OllamaProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = ollama.Client(host=settings.llm_base_url)
        self._opts = {
            "temperature": settings.llm_temperature,
            "num_predict": settings.llm_max_tokens,
            "num_ctx": 14096,
        }

    @property
    def supports_vision(self) -> bool:
        return True

    def chat(self, messages: list, images: list[bytes] | None = None) -> str:
        msgs = _inject_images(messages, images) if images else messages
        resp = self._client.chat(
            model=settings.llm_model, messages=msgs, stream=False, options=self._opts
        )
        return resp["message"]["content"].strip()

    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]:
        msgs = _inject_images(messages, images) if images else messages
        for chunk in self._client.chat(
            model=settings.llm_model, messages=msgs, stream=True, options=self._opts
        ):
            tok = chunk["message"]["content"]
            if tok:
                yield tok
