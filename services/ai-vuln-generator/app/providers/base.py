from abc import ABC, abstractmethod
from typing import Iterator


class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list, images: list[bytes] | None = None) -> str: ...

    @abstractmethod
    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]: ...

    @property
    @abstractmethod
    def supports_vision(self) -> bool: ...
