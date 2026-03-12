# Pentest Audit Helper

Система управления и генерации отчётов по результатам пентест-аудита.

## Архитектура

Микросервисная архитектура: React SPA + Python FastAPI сервисы + SQLite.

| Сервис | Порт | Назначение |
|--------|------|------------|
| Frontend | 5173 | React SPA (DaisyUI, TypeScript) |
| Report Service | 8001 | CRUD отчётов, уязвимостей, чеклистов, справочников |
| Export Service | 8002 | Генерация Word-отчётов из шаблонов |
| Retest Service | 8003 | Управление ретестами (заглушка) |
| AI Vuln Generator | 8004 | AI-генерация описаний уязвимостей (Ollama / OpenAI) |
| TestGen Service | 8005 | AI-генерация автотестов (заглушка) |

## Структура проекта

```
pentest-audit-helper/
├── frontend/                   # React SPA
├── services/
│   ├── report-service/         # Основной сервис (БД, CRUD)
│   ├── export-service/         # Генерация Word
│   ├── retest-service/         # Ретесты (заглушка)
│   ├── ai-vuln-generator/      # AI-генерация описаний
│   └── testgen-service/        # AI-генерация тестов (заглушка)
├── docs/                       # ТЗ и документация
│   ├── tz-*.md                 # Технические задания сервисов
│   ├── api-ai-integration.md   # Документация API AI Vuln Generator
│   └── task-list.md
└── .cursor/rules/              # Правила для AI-агента
```

## Требования

- Python 3.11+
- Node.js 18+
- Ollama (опционально, для AI-генерации)

## Запуск

### Backend-сервисы

```bash
# Report Service
cd services/report-service
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# Export Service
cd services/export-service
pip install -r requirements.txt
uvicorn app.main:app --port 8002 --reload

# AI Vuln Generator
cd services/ai-vuln-generator
pip install -r requirements.txt
uvicorn app.main:app --port 8004 --reload

# Retest Service (заглушка)
cd services/retest-service
pip install -r requirements.txt
uvicorn app.main:app --port 8003 --reload

# TestGen Service (заглушка)
cd services/testgen-service
pip install -r requirements.txt
uvicorn app.main:app --port 8005 --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Тесты

```bash
# Backend (для каждого сервиса)
cd services/<service-name>
pytest

# Frontend
cd frontend
npm test
```

## Конфигурация AI Vuln Generator

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `LLM_PROVIDER` | `ollama` | Провайдер: `ollama` / `openai` / `custom` |
| `LLM_MODEL` | `gemma3:27b-it-qat` | Модель |
| `LLM_BASE_URL` | `http://localhost:11434` | URL API |
| `LLM_API_KEY` | — | API-ключ (для внешних провайдеров) |
| `LLM_TEMPERATURE` | `0.1` | Температура |
| `LLM_MAX_TOKENS` | `2048` | Лимит токенов |

Подробная документация API для внешних интеграций: [`docs/api-ai-integration.md`](docs/api-ai-integration.md)

## Переменные окружения Frontend

Создайте `frontend/.env.local` при необходимости переопределить адреса сервисов:

```env
VITE_REPORT_API_URL=http://127.0.0.1:8001/api
VITE_EXPORT_API_URL=http://127.0.0.1:8002
VITE_AI_API_URL=http://127.0.0.1:8004
```
