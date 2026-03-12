---
name: start-services
description: Запуск и перезапуск сервисов pentest-audit-helper (frontend, report-service, export-service) с проверкой уже запущенных процессов. Использовать когда нужно запустить, перезапустить или остановить сервисы проекта.
---

# Start Services

Запускает/перезапускает сервисы проекта через PowerShell-скрипт. Скрипт убивает процессы на целевых портах перед стартом.

## Порты

| Сервис | Порт | Путь |
|--------|------|------|
| report-service | 8001 | `services/report-service` |
| export-service | 8002 | `services/export-service` |
| frontend (Vite) | 5173+ | `frontend` |

## Запуск

`Start-Process` не работает надёжно в среде Cursor. Используй следующий алгоритм через Shell-инструмент:

### Шаг 1 — Убить занятые порты

```powershell
Get-NetTCPConnection -LocalPort 8001,8002 -State Listen -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
# Для frontend (5173-5180):
5173..5180 | ForEach-Object {
  $c = Get-NetTCPConnection -LocalPort $_ -State Listen -ErrorAction SilentlyContinue
  if ($c) { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue }
}
```

### Шаг 2 — Запустить каждый сервис отдельным фоновым Shell-вызовом (block_until_ms: 0)

```powershell
# report-service
cd d:\projects\pentest-audit-helper\services\report-service && .\venv\Scripts\activate && uvicorn app.main:app --port 8001 --reload

# export-service
cd d:\projects\pentest-audit-helper\services\export-service && .\venv\Scripts\activate && uvicorn app.main:app --port 8002 --reload

# frontend
cd d:\projects\pentest-audit-helper\frontend && npm run dev
```

> Каждую команду запускать отдельным Shell tool call с `block_until_ms: 0`.

## Проверка после запуска

После выполнения скрипта подожди 5–7 секунд и проверь порты:
```powershell
Get-NetTCPConnection -LocalPort 8001,8002,5173 -State Listen -ErrorAction SilentlyContinue | Select-Object LocalPort,State
```

Если frontend занял другой порт (5174–5180) — это нормально, Vite выбирает первый свободный.
