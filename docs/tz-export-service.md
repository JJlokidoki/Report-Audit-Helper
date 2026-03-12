# Export Service — Техническое Задание

## Общее

- **Порт:** 8002
- **Фреймворк:** FastAPI
- **Зависимости:** docxtpl, docxcompose, python-docx, httpx
- **Формат API:** JSON запросы, binary ответ (application/octet-stream)

## Назначение

Генерация Word-отчёта (.docx) из данных Report Service. Двухэтапный процесс: заполнение шаблонов → склейка в один документ.

## API Endpoints

- `GET /api/export/{report_id}/word` — сгенерировать и скачать .docx
  - Response: `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
  - Header: `Content-Disposition: attachment; filename=report_{report_id}.docx`

## Шаблоны

Хранятся в `templates/{report_type}/` (web, ios, android, ai, iot). Каждая папка содержит полный набор из 7 шаблонов.

| Файл | Описание | Плейсхолдеры |
|------|----------|--------------|
| `01_title.docx` | Титульная страница | `{{ asName }}`, `{{ dateStart }}`, `{{ dateEnd }}`, `{{ executors }}` |
| `02_toc.docx` | Оглавление | Статичный или авто-генерация |
| `03_general_info.docx` | Общие сведения | Все поля SystemInfo |
| `04_test_results.docx` | Результаты тестирования | `{{ critical_count }}`, `{{ high_count }}`, `{{ medium_count }}`, `{{ low_count }}`, `{{ info_count }}` |
| `05_vulnerability.docx` | Описание уязвимости (×N) | `{{ bug_name }}`, `{{ bug_criticality }}`, `{{ cvss_score }}`, `{{ cvss_vector }}`, `{{ bug_description }}`, `{{ reproduction_steps }}`, `{{ remediation }}`, `{{ is_first }}`. Заголовок "Описание результатов тестирования" обёрнут в `{% if is_first %}...{% endif %}` — отображается только в первом экземпляре. Важно: if/endif в одном параграфе |
| `06_threat_classification.docx` | Классификация угроз | Статичный (без плейсхолдеров) |
| `07_checklist.docx` | Таблица проверок | `{% for check in checks %}` → `{{ check.check_id }}`, `{{ check.name }}`, `{{ check.status }}`, `{{ check.notes }}` |

Формат плейсхолдеров: Jinja2 (docxtpl) — `{{ variable }}`, `{% for %}`, `{% if %}`.

## Процесс генерации

### Этап 1: Получение данных
Запрос к Report Service API:
- `GET /api/reports/{id}` → report_type, name
- `GET /api/reports/{id}/system-info` → SystemInfo + executors + software
- `GET /api/reports/{id}/test-summary` → counts + vulnerability list
- `GET /api/reports/{id}/vulnerabilities` → полные данные каждой уязвимости
- `GET /api/reports/{id}/checklist` → все записи SecurityCheck

### Этап 2: Заполнение шаблонов (filler.py)
Для каждого шаблона из `templates/{report_type}/`:
1. Загрузить шаблон через `DocxTemplate`
2. Подготовить context из данных Report Service
3. `doc.render(context)` → заполненный документ в BytesIO
4. Шаблон `05_vulnerability.docx` заполняется N раз (по числу уязвимостей, отсортированных по severity: critical → info)

### Этап 3: Склейка (generator.py)
Порядок склейки через `docxcompose.Composer`:
1. 01_title
2. 02_toc
3. 03_general_info
4. 04_test_results
5. 05_vulnerability × N (отсортированы по severity)
6. 06_threat_classification
7. 07_checklist

Результат → `StreamingResponse` без сохранения на диск.

### Конвертация Rich Text (html_to_docx.py)
Поля с WYSIWYG-контентом (description, bug_description, reproduction_steps, remediation) хранятся как HTML. Перед подстановкой в шаблон требуется конвертация:
- Парсинг HTML через `beautifulsoup4`
- Текстовые блоки (`<p>`, `<ul>`, `<strong>` и т.д.) → `RichText` (docxtpl)
- Изображения `<img src="data:image/...;base64,...">` → `InlineImage` (docxtpl, декодирование base64 в BytesIO)
- Если поле содержит plain text (без HTML-тегов) — подставляется как обычная строка

## Структура файлов

```
services/export-service/
├── app/
│   ├── main.py          # FastAPI app, CORS, auth_stub
│   ├── generator.py     # оркестрация: получение данных → fill → merge
│   ├── filler.py        # fill_template(path, context) → BytesIO
│   ├── html_to_docx.py  # HTML → RichText/InlineImage конвертер
│   └── config.py        # REPORT_SERVICE_URL, TEMPLATE_DIR
├── templates/
│   ├── web/
│   │   ├── 01_title.docx
│   │   ├── 02_toc.docx
│   │   ├── 03_general_info.docx
│   │   ├── 04_test_results.docx
│   │   ├── 05_vulnerability.docx
│   │   ├── 06_threat_classification.docx
│   │   └── 07_checklist.docx
│   ├── ios/ ...
│   ├── android/ ...
│   ├── ai/ ...
│   └── iot/ ...
├── tests/
│   ├── conftest.py
│   ├── test_generator.py
│   └── test_filler.py
└── requirements.txt
```

## Конфигурация (env)

- `REPORT_SERVICE_URL` — URL Report Service (default: `http://localhost:8001`)
- `TEMPLATE_DIR` — путь к папке шаблонов (default: `./templates`)

## Middleware

auth_stub + CORS аналогично Report Service.
