# Frontend — Техническое Задание

## Общее

- **Фреймворк:** React 18 + TypeScript (strict)
- **Сборка:** Vite
- **UI:** DaisyUI + Tailwind CSS
- **Роутинг:** React Router v6
- **Состояние/кеш:** TanStack Query
- **HTTP:** Axios
- **Язык интерфейса:** русский
- **Адаптивность:** desktop-first (min 1280px)

## Маршруты

| Путь | Страница | Описание |
|------|----------|----------|
| `/` | ReportListPage | Таблица отчётов |
| `/reports/new` | CreateReportPage | Модалка создания |
| `/reports/:id/system-info` | SystemInfoPage | Сведения о системе |
| `/reports/:id/test-summary` | TestSummaryPage | Результаты тестирования |
| `/reports/:id/vulnerabilities` | VulnerabilityListPage | Список уязвимостей |
| `/reports/:id/vulnerabilities/:vid` | VulnerabilityEditPage | Редактирование уязвимости |
| `/reports/:id/checklist` | ChecklistPage | Чеклист безопасности |
| `/reports/:id/retests/autotests` | PlaceholderPage | Заглушка "В разработке" |
| `/reports/:id/retests/launch` | PlaceholderPage | Заглушка "В разработке" |
| `/settings` | SettingsPage | Управление справочниками (Исполнители, ПО) |

## Layout

- **Navbar:** название текущего отчёта (dropdown), тип отчёта (badge), кнопка "Экспорт в Word"
- **Sidebar:** два раздела с collapse — "Отчёт" (4 пункта) и "Ретесты" (2 пункта). Активный пункт выделен
- **Content area:** текущая страница
- Sidebar отображается только при наличии выбранного отчёта (внутри `/reports/:id/*`)

## Страницы

### 1. ReportListPage (`/`)
- Таблица (TanStack Table): название, тип (badge), дата создания, кол-во уязвимостей, действия (открыть, удалить)
- Фильтр по типу отчёта (select)
- Сортировка по дате, названию
- Кнопка "Создать отчёт" → модалка: название (input) + тип (select: web/ios/android/ai/iot)

### 2. SystemInfoPage
Страница разбита на 4 секции (DaisyUI collapse/accordion), каждая сворачиваема:

**2.1. Описание**
- RichEditor (TipTap) с расширением `Image`: поддержка вставки скриншотов через paste из буфера и drag-n-drop
- Изображения сохраняются как base64 внутри HTML
- Поле `description` в SystemInfo

**2.2. Данные об объекте** *(поля TBD)*
- Заглушка: текст "Поля будут добавлены позже"
- Текущие поля формы сохраняются здесь: asName, keId, url, dateStart, dateEnd, segment, goal, testConditions (textarea)
- Multi-select для Executor (выбор из справочника, управление — на странице Настройки)

**2.3. Модель нарушителя** *(поля TBD)*
- Заглушка: текст "Поля будут добавлены позже"
- Текущие поля: qualificationLevel, accessLevel, knowledgeLevel

**2.4. Используемое ПО**
- Multi-select из справочника Software (управление — на странице Настройки)

- Кнопка "Сохранить" → `PUT /api/reports/{id}/system-info`

### 3. TestSummaryPage
- 5 карточек со счётчиками по severity (цветные: critical=red, high=orange, medium=yellow, low=blue, info=gray)
- Таблица уязвимостей: bug_name, SeverityBadge, cvss_score
- Клик → переход к `/reports/:id/vulnerabilities/:vid`

### 4. VulnerabilityListPage
- Список карточек/строк с drag-and-drop (dnd-kit) для изменения sort_order
- Каждая строка: bug_name, SeverityBadge, cvss_score, AutomationBadge, кнопки (редактировать, удалить)
- Кнопка "Добавить уязвимость" → POST + переход к редактированию

### 5. VulnerabilityEditPage
- Поля: bug_name (input), bug_criticality (select), cvss_score (input), cvss_vector (input), automation_level (select)
- WYSIWYG (TipTap): bug_description, reproduction_steps, remediation
- **Кнопка "AI Генерация":**
  - Открывает AIGenerateModal
  - Ввод краткого описания + загрузка скриншотов (drag & drop)
  - Стриминг результата в реальном времени (`POST /api/ai/generate/stream`)
  - Кнопки: "Применить" (заполняет поля формы), "Отмена"
- Кнопка "Сохранить" → PUT

### 6. ChecklistPage
- Таблица с группировкой по category (collapsible groups)
- Колонки: check_id, name, short_description, goal, status (inline select), notes (inline textarea)
- Цветовая индикация: pass=green, not_applicable=ghost, not_tested=default
- Фильтр по статусу (select)
- Автосохранение при изменении status/notes → `PUT /api/reports/{id}/checklist/{check_id}`

### 7. PlaceholderPage
- Компонент-заглушка для нереализованных разделов
- По центру: иконка + текст "Раздел в разработке"

### 8. SettingsPage (`/settings`)
- Две секции (tabs или accordion):
  - **Исполнители** — таблица с колонкой ФИО, кнопки добавления и удаления
  - **Используемое ПО** — таблица name + description, кнопки добавления и удаления. Предзаполненные записи (`is_preset=true`) нельзя удалить
- Inline-редактирование полей в таблице
- Ссылка на страницу — в Navbar (иконка шестерёнки)

## Компоненты

| Компонент | Описание |
|-----------|----------|
| `Layout` | Navbar + Sidebar + Content (Outlet) |
| `Navbar` | DaisyUI navbar: отчёт dropdown, тип badge, экспорт |
| `Sidebar` | DaisyUI menu с collapse-группами |
| `SeverityBadge` | Badge с цветом по severity |
| `AutomationBadge` | Badge по automation_level |
| `RichEditor` | TipTap WYSIWYG обёртка |
| `AIGenerateModal` | Модалка с загрузкой изображений + стриминг |
| `PlaceholderPage` | Заглушка "В разработке" |
| `ConfirmModal` | Модалка подтверждения удаления |

## API-клиенты (api/)

- `reportApi.ts` — CRUD отчётов, system-info, vulnerabilities, checklist, справочники (порт 8001)
- `exportApi.ts` — скачивание Word (порт 8002)
- `aiApi.ts` — генерация описаний, стриминг (порт 8004)

Базовый URL настраивается через env: `VITE_REPORT_API_URL`, `VITE_EXPORT_API_URL`, `VITE_AI_API_URL`.

## Библиотеки

- `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image` — WYSIWYG с поддержкой изображений
- `@tanstack/react-query` — кеширование запросов
- `@tanstack/react-table` — таблицы с сортировкой/фильтрацией
- `@dnd-kit/core`, `@dnd-kit/sortable` — drag & drop
- `react-hot-toast` — уведомления
- `axios` — HTTP-клиент

## Структура файлов

```
frontend/
├── src/
│   ├── api/
│   │   ├── client.ts         # axios instance с baseURL
│   │   ├── reportApi.ts
│   │   ├── exportApi.ts
│   │   └── aiApi.ts
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── report/
│   │   │   ├── SystemInfoForm.tsx
│   │   │   ├── VulnerabilityCard.tsx
│   │   │   ├── VulnerabilityForm.tsx
│   │   │   ├── ChecklistTable.tsx
│   │   │   └── SeverityBadge.tsx
│   │   ├── ai/
│   │   │   └── AIGenerateModal.tsx
│   │   └── common/
│   │       ├── RichEditor.tsx
│   │       ├── AutomationBadge.tsx
│   │       ├── PlaceholderPage.tsx
│   │       └── ConfirmModal.tsx
│   ├── pages/
│   │   ├── ReportListPage.tsx
│   │   ├── SystemInfoPage.tsx
│   │   ├── TestSummaryPage.tsx
│   │   ├── VulnerabilityListPage.tsx
│   │   ├── VulnerabilityEditPage.tsx
│   │   └── ChecklistPage.tsx
│   ├── types/
│   │   └── index.ts          # TypeScript интерфейсы для всех моделей
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── vite.config.ts
```
