import base64
from typing import Iterator

from openai import OpenAI

from app.config import settings
from app.providers.base import LLMProvider


def _build_messages(messages: list, images: list[bytes] | None) -> list:
    """Convert messages to OpenAI format with optional vision content."""
    if not images:
        return messages

    result = []
    injected = False
    for m in messages:
        if m.get("role") == "user" and not injected:
            content: list = [{"type": "text", "text": m.get("content", "")}]
            for img in images:
                b64 = base64.b64encode(img).decode()
                content.append(
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}}
                )
            result.append({"role": "user", "content": content})
            injected = True
        else:
            result.append(m)
    return result


class OpenAICompatProvider(LLMProvider):
    def __init__(self) -> None:
        self._client = OpenAI(
            base_url=settings.llm_base_url or None,
            api_key=settings.llm_api_key or "sk-no-key",
        )

    @property
    def supports_vision(self) -> bool:
        return True

    def chat(self, messages: list, images: list[bytes] | None = None) -> str:
        msgs = _build_messages(messages, images)
        resp = self._client.chat.completions.create(
            model=settings.llm_model,
            messages=msgs,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
        )
        return (resp.choices[0].message.content or "").strip()

    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]:
        msgs = _build_messages(messages, images)
        for chunk in self._client.chat.completions.create(
            model=settings.llm_model,
            messages=msgs,
            temperature=settings.llm_temperature,
            max_tokens=settings.llm_max_tokens,
            stream=True,
        ):
            tok = chunk.choices[0].delta.content or ""
            if tok:
                yield tok
