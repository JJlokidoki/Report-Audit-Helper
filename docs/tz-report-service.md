# Report Service — Техническое Задание

## Общее

- **Порт:** 8001
- **Фреймворк:** FastAPI
- **ORM:** SQLAlchemy + aiosqlite
- **БД:** SQLite (файл `report.db`)
- **Формат API:** JSON (application/json)

## Модель данных

### Report
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, autoincrement | Идентификатор |
| name | string, required | Название тестируемой системы |
| report_type | enum(web/ios/android/ai/iot), required | Тип отчёта |
| created_at | datetime, auto | Дата создания |
| updated_at | datetime, auto | Дата обновления |

### SystemInfo
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| report_id | int, FK(Report), unique | Связь с отчётом (1:1) |
| description | text | Описание главы (rich text HTML с изображениями) |
| asName | string | Название АС |
| keId | string | Идентификатор КЭ |
| url | string | URL тестового стенда |
| dateStart | date | Дата начала тестирования |
| dateEnd | date | Дата окончания тестирования |
| segment | string | Сетевой сегмент |
| goal | string | Цель тестирования |
| qualificationLevel | string | Уровень квалификации |
| accessLevel | string | Уровень доступа |
| knowledgeLevel | string | Уровень осведомлённости |
| testConditions | text | Условия тестирования |

> **Разделы "Данные об объекте" и "Модель нарушителя"** — поля будут добавлены позже.
> Текущие поля `qualificationLevel`, `accessLevel`, `knowledgeLevel` могут быть перенесены в раздел "Модель нарушителя".

### Executor (справочник)
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| name | string, required | ФИО |

### Software (справочник)
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| name | string, required | Название ПО |
| description | text | Описание |
| is_preset | bool, default=false | Предзаполненное значение (защищено от удаления) |

### SystemInfoExecutor (junction)
| Поле | Тип |
|------|-----|
| system_info_id | int, FK(SystemInfo) |
| executor_id | int, FK(Executor) |

### SystemInfoSoftware (junction)
| Поле | Тип |
|------|-----|
| system_info_id | int, FK(SystemInfo) |
| software_id | int, FK(Software) |

### Vulnerability
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| report_id | int, FK(Report) | Связь с отчётом |
| bug_name | string, required | Название уязвимости |
| bug_criticality | enum(critical/high/medium/low/info) | Уровень опасности |
| bug_description | text | Описание |
| cvss_score | float | CVSS score |
| cvss_vector | string | CVSS vector |
| reproduction_steps | text | Шаги для повторения |
| remediation | text | Рекомендации |
| automation_level | enum(fully/partially/no/impossible) | Степень автоматизации |
| sort_order | int, default=0 | Порядок сортировки |

### SecurityCheck
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| report_id | int, FK(Report) | Связь с отчётом |
| checklist_type | enum(wstg/mstg_ios/mstg_android/istg/aitg) | Тип чеклиста |
| check_id | string | Идентификатор проверки (WSTG-INFO-01) |
| category | string | Категория |
| name | string | Название проверки |
| short_description | text | Краткое описание |
| goal | text | Цель проверки |
| status | enum(not_tested/pass/not_applicable), default=not_tested | Статус |
| notes | text | Заметки |

### AutoTest
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| vulnerability_id | int, FK(Vulnerability) | Связь с уязвимостью |
| name | string | Название теста |
| description | text | Описание |
| script_type | string | Тип скрипта (python/nuclei/custom) |
| script_content | text | Содержимое скрипта |

### TestRun
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| report_id | int, FK(Report) | Связь с отчётом |
| status | enum(pending/running/completed/failed) | Статус запуска |
| started_at | datetime | Время начала |
| finished_at | datetime, nullable | Время завершения |
| notes | text | Заметки |

### TestRunResult
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| test_run_id | int, FK(TestRun) | Связь с запуском |
| auto_test_id | int, FK(AutoTest) | Связь с тестом |
| passed | bool | Результат |
| output | text | Вывод теста |

### RetestResult
| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK | Идентификатор |
| test_run_id | int, FK(TestRun) | Связь с запуском |
| vulnerability_id | int, FK(Vulnerability) | Связь с уязвимостью |
| status | enum(fixed/not_fixed/partially_fixed/not_tested) | Результат ретеста |
| notes | text | Заметки |

## API Endpoints

### Отчёты
- `GET /api/reports` — список отчётов (query: ?report_type=web)
- `POST /api/reports` — создать отчёт `{ name, report_type }`. При создании автоматически создаются записи SecurityCheck на основе report_type
- `GET /api/reports/{id}` — получить отчёт
- `PUT /api/reports/{id}` — обновить `{ name }`
- `DELETE /api/reports/{id}` — удалить отчёт (каскадно удаляет связанные данные)

### Сведения о системе
- `GET /api/reports/{id}/system-info` — получить SystemInfo
- `PUT /api/reports/{id}/system-info` — обновить (создаёт если не существует)
- `PUT /api/reports/{id}/system-info/executors` — `{ executor_ids: [1, 2] }`
- `PUT /api/reports/{id}/system-info/software` — `{ software_ids: [1, 3] }`

### Результаты тестирования
- `GET /api/reports/{id}/test-summary` — возвращает:
  ```json
  {
    "counts": { "critical": 1, "high": 2, "medium": 3, "low": 0, "info": 1 },
    "vulnerabilities": [{ "id": 1, "bug_name": "...", "bug_criticality": "high", "cvss_score": 7.5 }]
  }
  ```

### Уязвимости
- `GET /api/reports/{id}/vulnerabilities` — список (query: ?sort_by=sort_order)
- `POST /api/reports/{id}/vulnerabilities` — создать
- `GET /api/reports/{id}/vulnerabilities/{vid}` — получить
- `PUT /api/reports/{id}/vulnerabilities/{vid}` — обновить
- `DELETE /api/reports/{id}/vulnerabilities/{vid}` — удалить
- `PUT /api/reports/{id}/vulnerabilities/reorder` — обновить sort_order `{ orders: [{id: 1, sort_order: 0}, ...] }`

### Чеклист безопасности
- `GET /api/reports/{id}/checklist` — получить (query: ?status=fail&category=INPV)
- `PUT /api/reports/{id}/checklist/{check_id}` — обновить `{ status, notes }`

### Справочники
- `GET /api/executors` — список
- `POST /api/executors` — создать `{ name }`
- `PUT /api/executors/{id}` — обновить
- `DELETE /api/executors/{id}` — удалить
- `GET /api/software` — список
- `POST /api/software` — создать `{ name, description }`
- `PUT /api/software/{id}` — обновить
- `DELETE /api/software/{id}` — удалить

## Бизнес-логика

### Автозаполнение чеклиста
При `POST /api/reports` с `report_type`:
- `web` → создать 91 запись SecurityCheck из WSTG v4.2 (checklist_data.py)
- `ios` → создать записи из MSTG iOS (заглушка — пустой массив)
- `android` → MSTG Android (заглушка)
- `iot` → ISTG (заглушка)
- `ai` → AITG (заглушка)

### Предзаполнение справочника ПО
При инициализации БД создаются записи Software с `is_preset=true`:
- Burp Suite — перехватывающий прокси для тестирования веб-приложений
- Nmap — сканер сети и портов
- OWASP ZAP — сканер уязвимостей веб-приложений
- Nuclei — сканер уязвимостей на основе шаблонов
- SQLMap — инструмент для обнаружения SQL-инъекций
- Metasploit — фреймворк для тестирования на проникновение
- Nikto — сканер веб-серверов
- Dirsearch — инструмент для перебора директорий и файлов

Записи с `is_preset=true` нельзя удалить через API (`DELETE /api/software/{id}` возвращает 403).

### Каскадное удаление
DELETE Report удаляет: SystemInfo, Vulnerability (→ AutoTest), SecurityCheck, TestRun (→ TestRunResult, RetestResult)

## Структура файлов

```
services/report-service/
├── app/
│   ├── main.py            # FastAPI app, CORS, auth_stub middleware
│   ├── database.py        # engine, SessionLocal, Base
│   ├── models.py          # SQLAlchemy модели
│   ├── schemas.py         # Pydantic схемы (request/response)
│   ├── checklist_data.py  # данные для предзаполнения чеклистов
│   ├── preset_software.py # предзаполненные записи Software
│   └── routers/
│       ├── reports.py
│       ├── system_info.py
│       ├── vulnerabilities.py
│       ├── checklist.py
│       ├── executors.py
│       └── software.py
├── tests/
│   ├── conftest.py        # fixtures: test_client, test_db
│   ├── test_reports.py
│   ├── test_vulnerabilities.py
│   ├── test_checklist.py
│   └── test_system_info.py
└── requirements.txt
```

## Middleware

### auth_stub
```python
@app.middleware("http")
async def auth_stub(request, call_next):
    logger.warning("Auth not implemented")
    response = await call_next(request)
    return response
```

### CORS
Разрешить все origins для разработки (`allow_origins=["*"]`).
