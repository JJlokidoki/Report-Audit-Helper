# Retest Service — Техническое Задание

## Общее

- **Порт:** 8003
- **Фреймворк:** FastAPI
- **Статус:** заглушка для будущей разработки

## Назначение

Управление ретестами: запуск автотестов, хранение результатов. Текущая реализация — заглушки.

## API Endpoints (заглушки)

- `GET /api/retests/{report_id}/autotests` — список автотестов
  - Response: `{ message: "Not implemented", autotests: [] }`
- `POST /api/retests/{report_id}/launch` — запуск тестов
  - Response: `{ message: "Not implemented", status: "stub" }`

## Структура файлов

```
services/retest-service/
├── app/
│   └── main.py       # FastAPI app с двумя stub-эндпоинтами
├── tests/
│   └── test_main.py
└── requirements.txt
```
