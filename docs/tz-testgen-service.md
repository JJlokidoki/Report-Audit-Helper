# TestGen Service — Техническое Задание

## Общее

- **Порт:** 8005
- **Фреймворк:** FastAPI
- **Зависимости:** ollama, openai, httpx
- **Статус:** заглушка с базовой структурой для будущей разработки

## Назначение

AI-генерация автотестов (скриптов) на основе описания уязвимостей. Результат сохраняется в AutoTest через Report Service.

## API Endpoints

- `POST /api/testgen/generate` — сгенерировать скрипт по уязвимости
  - Body: `{ vulnerability_id: int }` или `{ bug_name, bug_description, reproduction_steps, url }`
  - Response: `{ script_type: string, script_content: string, name: string, description: string }`
- `POST /api/testgen/generate/stream` — потоковая генерация
- `POST /api/testgen/generate/batch` — batch для всех уязвимостей отчёта
  - Body: `{ report_id: int }`
  - Генерирует скрипты для уязвимостей с `automation_level` != `impossible`

## Логика

1. Получить данные уязвимости из Report Service (`GET /api/reports/{id}/vulnerabilities/{vid}`)
2. Сформировать промпт с описанием, шагами воспроизведения, URL
3. LLM генерирует Python-скрипт (requests/httpx)
4. Сохранить в AutoTest через Report Service API
5. `script_type`: `python` / `nuclei` / `custom`

## Конфигурация (env)

- Те же переменные LLM что и в AI Vuln Generator
- `REPORT_SERVICE_URL` — URL Report Service (default: `http://localhost:8001`)

## Структура файлов

```
services/testgen-service/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── prompts.py
│   └── routers/
│       └── generate.py
├── tests/
│   ├── conftest.py
│   └── test_generate.py
└── requirements.txt
```
