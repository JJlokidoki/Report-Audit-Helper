"""Tests for vulnerability markdown parser."""

import pytest

from app.parser import VulnFields, parse_vuln_markdown

STANDARD_MD = """\
## SQL Injection in Login Form

| **Параметр**          | **Значение**        |
| :-------------------- | :------------------ |
| **Уровень опасности** | Высокий |
| **CVSS**              | 8.1 |
| **CVSS-вектор**       | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N |

### Описание

Обнаружена уязвимость SQL-инъекции в форме авторизации на `https://example.com/login`.
Параметр `username` не фильтруется, что позволяет выполнить произвольный SQL-запрос.

![**Результат инъекции**](media/image1.png){width="600" height="400"}

### Шаги для повторения

Для эксплуатации данной уязвимости необходимо выполнить следующие действия:

1. Открыть страницу авторизации `https://example.com/login`.
2. Отправить в поле `username` значение `' OR 1=1 --`.
3. Проанализировать ответ сервера.

### Рекомендации по устранению

1. Реализовать параметризованные SQL-запросы.
2. Ограничить допустимые символы в поле `username`.
3. Проверить все точки ввода на предмет SQL-инъекций.
"""


def test_standard_output():
    f = parse_vuln_markdown(STANDARD_MD)
    assert f.bug_name == "SQL Injection in Login Form"
    assert f.cvss_score == 8.1
    assert f.cvss_vector == "CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:N/SC:N/SI:N/SA:N"
    assert f.bug_criticality == "high"
    assert "SQL-инъекции" in f.bug_description
    assert "image1.png" in f.bug_description
    assert "Отправить" in f.reproduction_steps or "Открыть" in f.reproduction_steps
    assert "параметризованные" in f.remediation


def test_missing_sections():
    md = "## XSS\n\nНекоторый текст без секций."
    f = parse_vuln_markdown(md)
    assert f.bug_name == "XSS"
    assert f.bug_description is None
    assert f.reproduction_steps is None
    assert f.remediation is None
    assert f.cvss_score is None


def test_severity_mapping():
    for ru, en in [
        ("Критический", "critical"),
        ("Высокий", "high"),
        ("Средний", "medium"),
        ("Низкий", "low"),
        ("Информационный", "info"),
    ]:
        md = f"| **Уровень опасности** | {ru} |"
        f = parse_vuln_markdown(md)
        assert f.bug_criticality == en, f"Expected {en} for {ru}"


def test_cvss_integer_score():
    md = "| **CVSS**              | 10 |"
    f = parse_vuln_markdown(md)
    assert f.cvss_score == 10.0


def test_cvss_decimal_score():
    md = "| **CVSS**              | 3.9 |"
    f = parse_vuln_markdown(md)
    assert f.cvss_score == 3.9


def test_empty_input():
    f = parse_vuln_markdown("")
    assert f.bug_name is None
    assert f.cvss_score is None
    assert f.bug_criticality is None


def test_to_dict_excludes_none():
    f = VulnFields(bug_name="Test", cvss_score=5.0)
    d = f.to_dict()
    assert d == {"bug_name": "Test", "cvss_score": 5.0}
    assert "bug_description" not in d


def test_description_with_images():
    md = """\
## Test

### Описание

Текст описания.

![**Скриншот 1.**](media/image1.png){width="500" height="300"}

Продолжение текста.

### Шаги для повторения

Шаги.
"""
    f = parse_vuln_markdown(md)
    assert "image1.png" in f.bug_description
    assert "Продолжение текста" in f.bug_description
    assert f.reproduction_steps == "Шаги."


def test_extra_whitespace_in_table():
    md = "|  **CVSS**  |   7.5   |"
    f = parse_vuln_markdown(md)
    assert f.cvss_score == 7.5


def test_partial_output_no_headings():
    md = "Некий текст без заголовков и таблиц"
    f = parse_vuln_markdown(md)
    assert f.bug_name is None
    assert f.bug_description is None
