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

### 1.5 Доработки
- [x] Executor: убрать поля `position` и `organization` (оставить только `name`). Обновить модель, схемы, роутер, тесты
- [x] Software: добавить поле `description`, `is_preset`. Реализовать `preset_software.py`, предзаполнение при инициализации БД. Обновить модель, схемы, роутер, тесты

## Фаза 2: Frontend (базовый)

### 2.1 Инициализация
- [x] Создать Vite + React 19 + TypeScript проект
- [x] Настроить Tailwind CSS v4 + DaisyUI v5
- [x] Настроить React Router v7
- [x] Настроить TanStack Query + Axios
- [x] Определить TypeScript интерфейсы (`types/index.ts`)

### 2.2 Layout и навигация
- [x] Компонент `Layout` (Navbar + Sidebar + Outlet)
- [x] Компонент `Navbar` (название отчёта, badge типа, кнопка экспорта)
- [x] Компонент `Sidebar` (два раздела: Отчёт + Ретесты)
- [x] Настроить роутинг (все маршруты)

### 2.3 API-клиенты
- [x] `api/client.ts` — базовый axios instance с proxy
- [x] `api/reportApi.ts` — все эндпоинты Report Service
- [x] `api/exportApi.ts` — скачивание Word
- [x] `api/aiApi.ts` — генерация описаний (sync + stream)

### 2.4 Страницы
- [x] `ReportListPage` — TanStack Table, фильтры, сортировка, создание/удаление
- [x] `SystemInfoPage` — 4 секции (accordion): описание, данные, модель нарушителя, ПО
- [x] `TestSummaryPage` — карточки счётчиков + таблица уязвимостей
- [x] `VulnerabilityListPage` — drag-and-drop (dnd-kit), CRUD
- [x] `VulnerabilityEditPage` — форма редактирования (textarea-заглушки для TipTap)
- [x] `ChecklistPage` — группировка по категориям, фильтры, автосохранение
- [x] `PlaceholderPage` — заглушка "В разработке"
- [x] `SettingsPage` — управление справочниками (Исполнители, ПО): CRUD таблицы, ссылка в Navbar
- [x] `SystemInfoPage` — убрать кнопки добавления Executor/Software, оставить только multi-select из справочника

### 2.5 Компоненты
- [x] `SeverityBadge` — цветной badge по severity
- [x] `AutomationBadge` — badge по automation_level
- [x] `RichEditor` — обёртка TipTap с расширением Image (paste + drag-n-drop скриншотов). Переключение на plain textarea через фича-флаг (env `VITE_USE_RICH_EDITOR=true` или prop `useRichEditor`). Применить в: `SystemInfoPage` → поле description; `VulnerabilityEditPage` → bug_description, reproduction_steps, remediation
- [x] `ConfirmModal` — модалка подтверждения
- [x] `AIGenerateModal` — модалка AI-генерации (чат, стриминг, парсинг, применение)

### 2.6 Тесты Frontend
- [ ] Unit-тесты компонентов (Vitest + React Testing Library)
- [ ] Тесты API-клиентов (mock axios)

### 2.7 Доработки
- [x] Добавить `html_to_docx.py` в Export Service — конвертация HTML (из TipTap) в docx-элементы: текст → `RichText`, `<img src="data:base64,...">` → `InlineImage` (docxtpl). Зависимости: `beautifulsoup4`. Применить в filler.py для полей с rich text (description, bug_description, reproduction_steps, remediation)
- [x] Шаблон `05_vulnerability.docx`: обернуть заголовок "Описание результатов тестирования" в `{% if is_first %}...{% endif %}` (в одном параграфе). В `generator.py` → `_vuln_context()` передавать флаг `is_first` (true только для первой уязвимости)

## Фаза 3: Export Service

- [x] Создать `requirements.txt` (fastapi, uvicorn, docxtpl, docxcompose, python-docx, httpx)
- [x] Реализовать `filler.py` — заполнение шаблона через docxtpl
- [x] Реализовать `generator.py` — оркестрация (fetch data → fill → merge), graceful-skip отсутствующих шаблонов
- [x] Реализовать `config.py` — REPORT_SERVICE_URL, TEMPLATE_DIR + `trust_env=False` для httpx
- [x] Реализовать `main.py` — `GET /api/export/{report_id}/word` → StreamingResponse
- [x] Unit-тесты filler: 3 теста
- [x] Integration-тесты generator: 6 тестов (mock respx)

## Фаза 4: AI Vuln Generator

- [x] Создать `requirements.txt` (fastapi, uvicorn, ollama, openai, httpx, psutil)
- [x] Реализовать `providers/base.py` — LLMProvider ABC
- [x] Реализовать `providers/ollama.py` — OllamaProvider
- [x] Реализовать `providers/openai_compat.py` — OpenAICompatProvider
- [x] Реализовать `providers/__init__.py` — get_provider() factory
- [x] Реализовать `config.py` — конфигурация из env
- [x] Реализовать `prompts.py` — все промпты (из ai-report-service.py)
- [x] Реализовать `routers/generate.py` — генерация описания (sync + stream + killchain)
- [x] Реализовать `routers/checklist.py` — AI-генерация чеклиста
- [x] Реализовать `routers/summary.py` — генерация сводки
- [x] Unit-тесты: providers (mock LLM) — 7 тестов
- [x] Integration-тесты: эндпоинты (mock provider) — 6 тестов

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

## Бэклог

- [ ] AI Settings: "Обновить токен" — реализовать обновление/ротацию API-ключа через UI (сейчас кнопка disabled)
- [ ] AI Settings: реализовать настройку API Key через UI (секретное хранилище или .env)

## Фаза 7: Интеграция и документация

- [x] Интеграция Frontend ↔ Export Service (кнопка экспорта)
- [x] Интеграция Frontend ↔ AI Vuln Generator (AIGenerateModal + стриминг)
- [x] Документация API AI Vuln Generator для внешних интеграций (`docs/api-ai-integration.md`)
- [x] Финальный README.md с инструкцией запуска всех сервисов
