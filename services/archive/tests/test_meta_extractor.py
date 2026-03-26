from app.meta_extractor import extract_metadata


def test_extract_system_name():
    text = "Общая информация\nСистема: ЛК Клиент-Банк\nОписание тестирования"
    meta = extract_metadata(text)
    assert meta.system_name == "ЛК Клиент-Банк"


def test_extract_system_from_report_header():
    text = "# Отчёт: Пентест системы X\n\n## SQL Injection\nКритичность: Высокий"
    meta = extract_metadata(text)
    assert meta.system_name == "Пентест системы X"


def test_extract_system_as_name():
    text = "Наименование АС: Портал госуслуг\nURL: https://example.com"
    meta = extract_metadata(text)
    assert meta.system_name == "Портал госуслуг"


def test_extract_completion_date():
    text = "Дата завершения: 15.03.2026\nРезультаты тестирования"
    meta = extract_metadata(text)
    assert meta.completion_date == "15.03.2026"


def test_extract_date_end():
    text = "Дата окончания: 20/01/2026\nИтоги"
    meta = extract_metadata(text)
    assert meta.completion_date == "20/01/2026"


def test_extract_date_fallback():
    text = "Тестирование проводилось с 01.02.2026 по 15.02.2026"
    meta = extract_metadata(text)
    assert meta.completion_date == "15.02.2026"


def test_extract_vulnerability_count():
    text = (
        "# Отчёт\n\n"
        "## SQL Injection\nКритичность: Высокий\nОписание\n\n"
        "## XSS\nКритичность: Средний\nОписание\n\n"
        "## Рекомендации\nОбщие рекомендации по безопасности\n"
    )
    meta = extract_metadata(text)
    assert meta.vulnerability_count == 2


def test_extract_vuln_count_with_cvss():
    text = (
        "## Open Redirect\nCVSS: 5.4\nОписание\n\n"
        "## IDOR\nCVSS: 7.1\nОписание"
    )
    meta = extract_metadata(text)
    assert meta.vulnerability_count == 2


def test_no_metadata():
    text = "Простой текст без структуры и метаданных"
    meta = extract_metadata(text)
    assert meta.system_name is None
    assert meta.vulnerability_count is None
    assert meta.completion_date is None


def test_all_fields_together():
    text = (
        "# Отчёт: Тест Keycloak\n"
        "Система: Keycloak SSO\n"
        "Дата завершения: 10.03.2026\n\n"
        "## Broken Auth\nКритичность: Критический\nОписание\n\n"
        "## Session Fixation\nКритичность: Высокий\nОписание"
    )
    meta = extract_metadata(text)
    assert meta.system_name == "Keycloak SSO"
    assert meta.completion_date == "10.03.2026"
    assert meta.vulnerability_count == 2
