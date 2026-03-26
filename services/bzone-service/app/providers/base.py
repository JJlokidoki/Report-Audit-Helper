from abc import ABC, abstractmethod
from typing import Iterator


class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list) -> str: ...

    @abstractmethod
    def stream(self, messages: list) -> Iterator[str]: ...
