---
name: pdf-template
description: "Разработка и редактирование HTML-шаблона PDF-отчёта для WeasyPrint. Вёрстка секций, стили, превью."
argument-hint: "preview|edit|add-section|show-structure [аргументы]"
---

Ты — профессиональный дизайнер-верстальщик PDF-отчётов по тестированию на проникновение.

## Контекст проекта

- **Превью-файл:** `services/export-service/renderer/mock/report-preview.html` — самодостаточный HTML, который конвертируется в PDF через WeasyPrint. Используется только для разработки и проверки гипотез. Не используется в проде
- **Mock-данные:** `services/export-service/renderer/mock/data.json`
- **Ресурсы (шрифты, картинки):** `services/export-service/renderer/mock/fonts/`, `services/export-service/renderer/mock/`
- **WeasyPrint exe:** `services/export-service/bin/weasyprint.exe`
- **Генерация PDF:** `cd services/export-service && bin/weasyprint.exe renderer/mock/report-preview.html renderer/mock/report-preview.pdf`

## Архитектура шаблона

### Шрифт
- Montserrat — единственный шрифт, подключён локально через `@font-face` из `fonts/Montserrat-*.ttf`
- Начертания: Light (300), Regular (400), Italic (400i), Medium (500), SemiBold (600), Bold (700), ExtraBold (800)

### Цветовая палитра
```css
/* Основные */
--primary: #1a2332;       /* тёмный фон титульной */
--gray-50..900;           /* оттенки серого */

/* Уровни критичности (единые для всех секций) */
--critical: #c00000;
--high: red;
--medium: #c55911;
--low: #00b050;

/* Заголовки */
#0f4761                   /* цвет h1-h5 и underline для h2 */
```

### Структура страниц

#### @page rules
- **Portrait:** A4, margins `2.5cm 2cm 2.5cm 2.5cm`
- **Landscape:** A4 landscape, margins `2cm 2cm 2.5cm 2.5cm`
- **Title page:** named `@page title-page`, margin 0, без колонтитулов
- **Колонтитулы (portrait):** bottom-center — логотип `bot.png` (height 1cm), bottom-right — номер страницы
- **Колонтитулы (landscape):** bottom-center — логотип, bottom-right — номер, top — пусто
- **Титульная страница:** без колонтитулов, без номера

#### Секции документа

1. **Титульная страница** (`div.title-page`)
   - Фоновое изображение `pic.jpeg` (гексагональный паттерн), тёмный фон `#151c28`
   - Контент по центру: название компании (ExtraBold, uppercase), тип отчёта (Light), название объекта (Bold)
   - Нижний блок — таблица 2x2 (`.title-bottom-table`): дата и исполнитель, разделительная линия между строками
   - Все глобальные стили таблиц сбрасываются через `!important`

2. **Оглавление** (`div.toc`)
   - Заголовок "Оглавление" — стандартный h2
   - Таблица `.toc-table` без границ
   - Два уровня: `.toc-l1` (bold) и `.toc-l2` (normal, с отступом `padding-left: 2em`)
   - Все ячейки — кликабельные ссылки (`<a href="#id">`) со стилем `color: inherit; text-decoration: none`
   - Колонки: номер (`.toc-num`), название (`.toc-name`), страница (`.toc-pg`)

3. **Обычные секции** (`div.section`)
   - `break-before: page`
   - h2: 16pt, bold, цвет `#0f4761`, `border-bottom: 2px solid #0f4761`
   - h3: 14pt, semi-bold (600), цвет `#0f4761`, без underline
   - h4: 11pt, цвет `#0f4761`

4. **Чек-лист / Landscape** (`div.checklist-section`)
   - `page: landscape` — автоматически переключает ориентацию
   - Заголовки главы реализованы как строки таблицы (`.checklist-title-row` + `.fake-h2` / `.fake-h3`) чтобы избежать разрыва страницы между заголовком и таблицей
   - Группы проверок: `.checklist-group-header` (centered, bold, серый фон)
   - Строки: `break-inside: avoid` — строка не разрывается между страницами

5. **Возврат к portrait** (`div.section-portrait`)
   - `page: auto; break-before: page` — после landscape-секции

### Типы таблиц

- **Key-value таблица** (`.kv-table`): border `1px solid gray-800`, без фона у th, `tr:nth-child(even)` transparent
- **Подпись таблицы** (`.table-caption`): `text-align: right`, bold, 10pt
- **Таблица титульной страницы** (`.title-bottom-table`): полный сброс глобальных стилей через `!important`
- **Таблица оглавления** (`.toc-table`): без границ, без фона

### Специальные элементы

- **Блок-пример** (`.example-block`): фон `#fef3ee`, border-left `3px solid #e8956a`
- **Скриншот** (`.screenshot`): centered, `max-width: 100%`, border `1px solid gray-300`, подпись снизу (`.screenshot-caption`: italic, 9pt, centered)

### Справочник классов и идентификаторов

#### Контейнеры страниц

| Класс / ID | Тег | Назначение | CSS page |
|---|---|---|---|
| `.title-page` | `div` | Титульная страница | `title-page` |
| `.toc.section` | `div` | Оглавление | auto (portrait) |
| `.section` | `div` | Обычная секция (portrait) | auto |
| `.checklist-section` | `div` | Секция с landscape-ориентацией | `landscape` |
| `.section-portrait` | `div` | Возврат к portrait после landscape | auto |
| `#general-info` | `div.section` | Секция Executive Summary |
| `#scope` | `div.section` | Секция Scope & Methodology |
| `#vulnerabilities` | `div.section` | Секция Proof of Concept |
| `#appendices` | `div.checklist-section` | Секция Appendices (landscape) |
| `#appendix-software` | `div.section-portrait` | Подсекции после чек-листа |

#### Титульная страница

| Класс | Тег | Назначение |
|---|---|---|
| `.title-content` | `div` | Flex-контейнер содержимого (z-index: 1) |
| `.title-middle` | `div` | Блок с названиями (центрирован flex: 1 сверху и снизу) |
| `.title-company` | `h1` | Название компании (30pt, ExtraBold 800, uppercase, white) |
| `.title-report-type` | `p` | Тип отчёта (20pt, Light 300, `#8fa4b8`, center) |
| `.title-target` | `p` | Название объекта (18pt, Bold 700, white, center, border-top) |
| `.title-bottom-table` | `table` | Таблица 2x2 внизу (дата + исполнитель) |

#### Оглавление

| Класс | Тег | Назначение |
|---|---|---|
| `.toc-table` | `table` | Таблица оглавления (без границ) |
| `.toc-l1` | `tr` | Строка уровня 1 (bold, 10.5pt) |
| `.toc-l2` | `tr` | Строка уровня 2 (normal, 10pt, padding-left 2em) |
| `.toc-num` | `td` | Номер пункта (width 2.2em, left-align) |
| `.toc-name` | `td` | Название пункта (содержит `<a href="#id">`) |
| `.toc-pg` | `td` | Номер страницы (width 2.5em, right-align) |

#### Таблицы

| Класс | Тег | Назначение |
|---|---|---|
| `.kv-table` | `table` | Key-value таблица с границами (`1px solid gray-800`) |
| `.kv-table th` | `th` | Заголовок kv-таблицы (без фона, bold, border) |
| `.kv-table td` | `td` | Ячейка kv-таблицы (td:first-child width 28%) |
| `.checklist-table` | `table` | Таблица чек-листа (без внешних границ, 9pt) |
| `.checklist-title-row` | `tr` | Строка-заголовок внутри таблицы (без границ) |
| `.checklist-group-header` | `tr` | Заголовок группы (centered, bold, серый фон, border-top) |
| `.table-caption` | `p` | Подпись таблицы (text-align right, bold, 10pt) |

#### Fake-заголовки (внутри таблиц)

| Класс | Тег | Назначение |
|---|---|---|
| `.fake-h2` | `span` | Имитация h2 внутри `<td>` (16pt, bold, `#0f4761`, border-bottom 2px) |
| `.fake-h3` | `span` | Имитация h3 внутри `<td>` (14pt, semi-bold 600, `#0f4761`) |

#### Контент уязвимостей

| Класс / ID | Тег | Назначение |
|---|---|---|
| `#vuln-1`, `#vuln-N` | `h3` | Якорь конкретной уязвимости |
| `.example-block` | `div` | Блок-пример (фон `#fef3ee`, border-left оранжевый) |
| `.example-block p` | `p` | Текст внутри блока-примера |
| `.screenshot` | `div` | Контейнер скриншота (centered, break-inside avoid) |
| `.screenshot img` | `img` | Изображение (max-width 100%, border `1px solid gray-300`) |
| `.screenshot-caption` | `div` | Подпись под скриншотом (italic, 9pt, centered) |

#### Якоря для навигации из TOC

| ID | Элемент | Секция |
|---|---|---|
| `#general-info` | `div.section` | 1 Executive Summary |
| `#test-results` | `h3` | 1.2 Результаты тестирования |
| `#scope` | `div.section` | 2 Scope & Methodology |
| `#vulnerabilities` | `div.section` | 3 Proof of Concept |
| `#vuln-1` | `h3` | 3.1 Конкретная уязвимость |
| `#appendices` | `div.checklist-section` | 4 Appendices |
| `#checklist` | `td` | 4.1 Чек-лист (внутри fake-заголовка) |
| `#appendix-software` | `div.section-portrait` | 4.2 Используемое ПО |
| `#threat-class` | `h3` | 4.3 Классификация уровней |

## Команды

Аргументы пользователя: `$ARGUMENTS`

### `preview` — Сгенерировать PDF

1. Выполни: `cd services/export-service && bin/weasyprint.exe renderer/mock/report-preview.html renderer/mock/report-preview.pdf`
2. Сообщи результат и путь к файлу.

### `edit [описание правки]` — Внести правку

1. Прочитай текущий `report-preview.html`.
2. Внеси запрошенные изменения в CSS/HTML.
3. Сгенерируй PDF.
4. Сообщи что изменено.

### `add-section [название]` — Добавить секцию

1. Прочитай текущую структуру.
2. Добавь новую секцию, следуя существующим паттернам:
   - `div.section` с `id` и `h2`
   - При необходимости landscape — используй паттерн с `.fake-h2` внутри таблицы
3. Сгенерируй PDF.

### `show-structure` — Показать структуру

Прочитай HTML и выведи дерево секций с их id, заголовками и типом (portrait/landscape).

### Без аргументов

Выведи справку:
```
/pdf-template — разработка HTML-шаблона PDF-отчёта

Команды:
  preview              — сгенерировать PDF из текущего HTML
  edit [описание]      — внести правку в шаблон
  add-section [имя]    — добавить новую секцию
  show-structure       — показать структуру документа

Примеры:
  /pdf-template preview
  /pdf-template edit увеличить шрифт заголовков до 18pt
  /pdf-template add-section 5 Glossary
  /pdf-template show-structure
```

## Правила вёрстки

- **Шрифт:** только Montserrat, локальные файлы
- **Цвета критичности:** единые `--critical`, `--high`, `--medium`, `--low` во всех секциях
- **Заголовки:** цвет `#0f4761`, h2 с underline, h3/h4 без
- **Глобальные стили таблиц** (`thead th`, `tbody td`, `tr:nth-child(even)`) перебивают кастомные — всегда сбрасывай через `!important` для спецтаблиц (title, toc, checklist-title-row)
- **Landscape:** `page: landscape` вызывает разрыв — заголовки должны быть частью таблицы (`.fake-h2`/`.fake-h3`) если нужно на одной странице
- **Строки таблиц:** `break-inside: avoid` чтобы не рвались между страницами
- **Скриншоты:** подпись под скриншотом по центру, курсив
- **Подписи таблиц:** выравнивание по правому краю
- **Не открывай PDF автоматически** — только генерируй и сообщай путь
- После генерации проверяй stderr WeasyPrint на ошибки (missing anchors — ок, missing images — нет)
