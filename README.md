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

## Запуск через Docker (рекомендуется)

```bash
# 1. Скопировать конфигурацию
cp .env.example .env
# Отредактировать .env — настроить LLM-провайдер, креды basic auth

# 2. Запустить
docker compose up --build

# 3. Открыть http://localhost (логин/пароль из .env, по умолчанию admin/admin)
```

Маршрутизация через nginx — все сервисы доступны на порту 80:
- `/api/reports/...`, `/api/vulnerabilities/...`, `/api/checklist/...` → Report Service
- `/api/export/...` → Export Service
- `/api/ai/...` → AI Vuln Generator
- `/api/templates/...` → Export Service (управление шаблонами)

```bash
# Остановить
docker compose down

# Пересобрать один сервис
docker compose up --build export-service

# Логи конкретного сервиса
docker compose logs -f report-service
```

PDF-экспорт работает только в Docker (используется LibreOffice).

## Локальная разработка (без Docker)

### Требования

- Python 3.11+
- Node.js 18+

### Быстрый старт

```bash
# Запуск всех сервисов одной командой
bash scripts/start.sh

# Или выборочно
bash scripts/start.sh --report --frontend
```

Скрипт завершает процессы на занятых портах, загружает `.env` и запускает сервисы в фоне.

### Ручной запуск

Каждый backend-сервис использует свой venv:

```bash
# Report Service (порт 8001)
cd services/report-service
python -m venv venv && source venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload

# Export Service (порт 8002)
cd services/export-service
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8002 --reload

# AI Vuln Generator (порт 8004)
cd services/ai-vuln-generator
python -m venv venv && source venv/Scripts/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8004 --reload

# Frontend (порт 5173)
cd frontend
npm install && npm run dev
```

### Тестовые данные

```bash
cd services/report-service
python scripts/seed_test_data.py
```

### Тесты

```bash
# Backend — для каждого сервиса
cd services/report-service && python -m pytest tests/ -v
cd services/export-service && python -m pytest tests/ -v

# Один тест
python -m pytest tests/test_reports.py::test_create_report -v

# Frontend
cd frontend && npm test
```

## Конфигурация

### Переменные окружения (.env)

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `AUTH_USER` | `admin` | Логин basic auth (Docker) |
| `AUTH_PASSWORD` | `admin` | Пароль basic auth (Docker) |
| `LLM_PROVIDER` | `openai` | Провайдер: `ollama` / `openai` / `gigachat` / `custom` |
| `LLM_MODEL` | `openai/gpt-oss-20b` | Модель |
| `LLM_BASE_URL` | `http://localhost:11434` | URL API |
| `LLM_API_KEY` | — | API-ключ |
| `LLM_TEMPERATURE` | `0.1` | Температура |
| `LLM_MAX_TOKENS` | `2048` | Лимит токенов |

При использовании Docker для доступа к LLM на хосте используйте `http://host.docker.internal:PORT`.

### Frontend (.env.local)

Для локальной разработки создайте `frontend/.env.local`:

```env
VITE_REPORT_API_URL=http://127.0.0.1:8001/api
VITE_EXPORT_API_URL=http://127.0.0.1:8002
VITE_AI_API_URL=http://127.0.0.1:8004
VITE_USE_RICH_EDITOR=true
```

В Docker эти переменные не нужны — nginx проксирует всё через `/api/`.

Подробная документация API: [`docs/api-ai-integration.md`](docs/api-ai-integration.md)
