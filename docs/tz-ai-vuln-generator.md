# AI Vuln Generator — Техническое Задание

## Общее

- **Порт:** 8004
- **Фреймворк:** FastAPI
- **Зависимости:** ollama, openai, httpx, psutil
- **Источник:** рефакторинг `ai-report-service.py`

## Назначение

AI-генерация описаний уязвимостей на основе текста и скриншотов. Поддержка нескольких LLM-провайдеров через единую абстракцию.

## API Endpoints

### Генерация описания уязвимости
- `POST /api/ai/generate` — синхронная генерация
  - Body: `{ history: [{role, content}], images: [base64], filenames: [string] }`
  - Response: `{ markdown: string, raw: string }`
- `POST /api/ai/generate/stream` — потоковая генерация (text/plain chunked)
- `POST /api/ai/generate/killchain/stream` — генерация kill-chain сценария (потоковая)

### Генерация чеклиста
- `POST /api/ai/checklist` — AI-заполнение таблицы проверок
  - Body: `{ vulnerabilities_markdown: string, base_table_markdown?: string }`
  - Response: `{ table_markdown: string }`

### Генерация сводки
- `POST /api/ai/results/summary` — краткий список недостатков
  - Body: `{ vulnerabilities_markdown: string }`
  - Response: `{ summary_markdown: string }`

## Абстракция LLM-провайдеров

### base.py — LLMProvider (ABC)
```python
class LLMProvider(ABC):
    @abstractmethod
    def chat(self, messages: list, images: list[bytes] | None = None) -> str: ...
    @abstractmethod
    def stream(self, messages: list, images: list[bytes] | None = None) -> Iterator[str]: ...
    @property
    @abstractmethod
    def supports_vision(self) -> bool: ...
```

### ollama.py — OllamaProvider
- Использует `ollama` Python SDK
- Поддержка vision (images передаются напрямую)
- Локальный сервер

### openai_compat.py — OpenAICompatProvider
- Использует `openai` Python SDK
- Совместим с OpenAI, Azure OpenAI, Anthropic, любым OpenAI-compatible API
- Vision через base64 в content

## Промпты (prompts.py)

- `SYSTEM_PROMPT` — основной промпт для генерации описания уязвимости (структура: название, таблица severity/CVSS, описание, шаги воспроизведения, рекомендации)
- `KILLCHAIN_PROMPT` — промпт для описания kill-chain сценария
- `WSTG_PROMPT` — промпт для генерации таблицы проверок
- `SUMMARY_PROMPT` — промпт для сводки результатов

## Конфигурация (env)

- `LLM_PROVIDER` — `ollama` (default) / `openai` / `custom`
- `LLM_MODEL` — имя модели (default: `gemma3:27b-it-qat`)
- `LLM_BASE_URL` — URL API (default: `http://localhost:11434`)
- `LLM_API_KEY` — API-ключ (пустой для Ollama и LM Studio)
- `LLM_TEMPERATURE` — default: `0.1`
- `LLM_MAX_TOKENS` — default: `2048`

**LM Studio:** запустить модель в LM Studio, включить "Local Server". Затем:
`LLM_PROVIDER=openai` `LLM_BASE_URL=http://localhost:1234/v1` `LLM_MODEL=<имя модели из LM Studio>` (например `local-model` или как отображается в UI).

## Структура файлов

```
services/ai-vuln-generator/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── prompts.py
│   ├── providers/
│   │   ├── __init__.py      # get_provider() factory
│   │   ├── base.py
│   │   ├── ollama.py
│   │   └── openai_compat.py
│   └── routers/
│       ├── generate.py
│       ├── checklist.py
│       └── summary.py
├── tests/
│   ├── conftest.py
│   ├── test_generate.py
│   └── test_providers.py
└── requirements.txt
```
