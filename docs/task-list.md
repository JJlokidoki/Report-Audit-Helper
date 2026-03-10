# Task List — Pentest Audit Helper

## Фаза 0: Инициализация

- [x] Создать структуру папок проекта
- [x] Инициализировать git-репозиторий
- [x] Создать README.md с описанием проекта и инструкцией запуска
- [x] Создать .cursor/rules/ для всех сервисов

## Фаза 1: Report Service (backend-core)

### 1.1 Инфраструктура
- [x] Создать `requirements.txt` (fastapi, uvicorn, sqlalchemy, aiosqlite, pydantic)
- [x] Реализовать `database.py` (async engine, async_sessionmaker, Base)
- [x] Реализовать `main.py` (FastAPI app, CORS, auth_stub middleware, lifespan)

### 1.2 Модели и схемы
- [x] Реализовать `models.py` — все SQLAlchemy 2.0 модели (Report, SystemInfo, Executor, Software, Vulnerability, SecurityCheck, AutoTest, TestRun, TestRunResult, RetestResult, junction tables)
- [x] Реализовать `schemas.py` — Pydantic v2 схемы (Create, Update, Response)
- [x] Реализовать `checklist_data.py` — данные WSTG v4.2 (96 пунктов) + заглушки для MSTG/ISTG/AITG

### 1.3 Роутеры
- [x] `routers/reports.py` — CRUD отчётов + автозаполнение чеклиста при создании
- [x] `routers/system_info.py` — GET/PUT system-info + привязка executors/software
- [x] `routers/vulnerabilities.py` — CRUD уязвимостей + test-summary + reorder
- [x] `routers/checklist.py` — GET чеклист с фильтрами + PUT статус пункта
- [x] `routers/executors.py` — CRUD справочника исполнителей
- [x] `routers/software.py` — CRUD справочника ПО

### 1.4 Тесты
- [x] `tests/conftest.py` — fixtures (AsyncClient, in-memory SQLite)
- [x] Integration-тесты: 23 теста — все эндпоинты (reports, vulnerabilities, system-info, checklist, executors, software)

## Фаза 2: Frontend (базовый)

### 2.1 Инициализация
- [ ] Создать Vite + React + TypeScript проект
- [ ] Настроить Tailwind CSS + DaisyUI (тема corporate)
- [ ] Настроить React Router v6
- [ ] Настроить TanStack Query + Axios
- [ ] Определить TypeScript интерфейсы (`types/index.ts`)

### 2.2 Layout и навигация
- [ ] Компонент `Layout` (Navbar + Sidebar + Outlet)
- [ ] Компонент `Navbar` (dropdown отчёта, badge типа, кнопка экспорта)
- [ ] Компонент `Sidebar` (два раздела с collapse)
- [ ] Настроить роутинг (все маршруты)

### 2.3 API-клиенты
- [ ] `api/client.ts` — базовый axios instance
- [ ] `api/reportApi.ts` — все эндпоинты Report Service
- [ ] `api/exportApi.ts` — скачивание Word
- [ ] `api/aiApi.ts` — генерация описаний

### 2.4 Страницы
- [ ] `ReportListPage` — таблица отчётов (TanStack Table, фильтры, сортировка, создание)
- [ ] `SystemInfoPage` — 4 секции (accordion): описание (RichEditor + вставка скриншотов), данные об объекте (TBD), модель нарушителя (TBD), используемое ПО (multi-select с предзаполнением)
- [ ] `TestSummaryPage` — карточки счётчиков + таблица уязвимостей
- [ ] `VulnerabilityListPage` — список с drag-and-drop сортировкой
- [ ] `VulnerabilityEditPage` — форма редактирования + TipTap WYSIWYG
- [ ] `ChecklistPage` — таблица с группировкой, inline-редактирование, фильтры
- [ ] `PlaceholderPage` — заглушка "В разработке"

### 2.5 Компоненты
- [ ] `SeverityBadge` — цветной badge по severity
- [ ] `AutomationBadge` — badge по automation_level
- [ ] `RichEditor` — обёртка TipTap с расширением Image (paste + drag-n-drop скриншотов)
- [ ] `ConfirmModal` — модалка подтверждения
- [ ] `AIGenerateModal` — модалка AI-генерации (загрузка изображений + стриминг)

### 2.6 Тесты Frontend
- [ ] Unit-тесты компонентов (Vitest + React Testing Library)
- [ ] Тесты API-клиентов (mock axios)

## Фаза 3: Export Service

- [ ] Создать `requirements.txt` (fastapi, uvicorn, docxtpl, docxcompose, python-docx, httpx)
- [ ] Реализовать `filler.py` — заполнение шаблона через docxtpl
- [ ] Реализовать `generator.py` — оркестрация (fetch data → fill → merge)
- [ ] Реализовать `main.py` — эндпоинт `GET /api/export/{report_id}/word`
- [ ] Создать заглушки шаблонов для типа `web` (7 файлов .docx)
- [ ] Создать пустые папки для ios/android/ai/iot
- [ ] Unit-тесты: filler (mock template)
- [ ] Integration-тесты: полный цикл генерации (mock Report Service)

## Фаза 4: AI Vuln Generator

- [ ] Создать `requirements.txt` (fastapi, uvicorn, ollama, openai, httpx, psutil)
- [ ] Реализовать `providers/base.py` — LLMProvider ABC
- [ ] Реализовать `providers/ollama.py` — OllamaProvider
- [ ] Реализовать `providers/openai_compat.py` — OpenAICompatProvider
- [ ] Реализовать `providers/__init__.py` — get_provider() factory
- [ ] Реализовать `config.py` — конфигурация из env
- [ ] Реализовать `prompts.py` — все промпты (из ai-report-service.py)
- [ ] Реализовать `routers/generate.py` — генерация описания (sync + stream + killchain)
- [ ] Реализовать `routers/checklist.py` — AI-генерация чеклиста
- [ ] Реализовать `routers/summary.py` — генерация сводки
- [ ] Unit-тесты: providers (mock LLM)
- [ ] Integration-тесты: эндпоинты (mock provider)

## Фаза 5: TestGen Service (заглушка)

- [ ] Создать `requirements.txt`
- [ ] Реализовать `main.py` — базовый FastAPI app
- [ ] Реализовать `routers/generate.py` — эндпоинты (заглушка с базовой структурой)
- [ ] Реализовать `prompts.py` — промпт для генерации тестов
- [ ] Unit-тесты: эндпоинты возвращают корректные ответы

## Фаза 6: Retest Service (заглушка)

- [ ] Создать `requirements.txt`
- [ ] Реализовать `main.py` — два stub-эндпоинта
- [ ] Unit-тесты: проверка stub-ответов

## Фаза 7: Интеграция и документация

- [ ] Интеграция Frontend ↔ Export Service (кнопка экспорта)
- [ ] Интеграция Frontend ↔ AI Vuln Generator (AIGenerateModal + стриминг)
- [ ] Документация API AI Vuln Generator для внешних интеграций (`docs/api-ai-integration.md`)
- [ ] Финальный README.md с инструкцией запуска всех сервисов
