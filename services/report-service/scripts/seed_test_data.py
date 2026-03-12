"""
Скрипт наполнения БД тестовыми данными.
Запуск из корня report-service: python scripts/seed_test_data.py
"""
import asyncio
import sys
from datetime import date, datetime
from pathlib import Path

# Чтобы импортировать app из корня сервиса
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select, insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, init_db
from app.models import (
    system_info_executors,
    system_info_software,
    Report,
    SystemInfo,
    Executor,
    Software,
    Vulnerability,
    SecurityCheck,
    TestRun,
    AutoTest,
    TestRunResult,
    RetestResult,
)
from app.checklist_data import get_checklist_items
from app.preset_software import seed_preset_software


EXECUTORS = ["Иванов И.И.", "Петров П.П.", "Сидорова А.С."]

SYSTEM_INFO = {
    "asName": "Тестовая веб-система",
    "keId": "KE-2024-001",
    "url": "https://test.example.com",
    "dateStart": date(2024, 3, 1),
    "dateEnd": date(2024, 3, 15),
    "segment": "DMZ, внутренняя сеть",
    "description": "Система предназначена для приёма заявок и отчётности.",
    "goal": "Проверка устойчивости к типовым веб-уязвимостям (OWASP Top 10).",
    "qualificationLevel": "Senior",
    "accessLevel": "Black box",
    "knowledgeLevel": "Документация и интервью",
    "testConditions": "Тестирование в тестовом контуре в рабочее время.",
}

VULNS = [
    {
        "bug_name": "SQL-инъекция в форме поиска",
        "bug_criticality": "high",
        "bug_description": "Параметр q передаётся в запрос без экранирования.",
        "cvss_score": 9.8,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
        "reproduction_steps": "1. Открыть /search. 2. Ввести в поле: ' OR 1=1--. 3. Убедиться в выводе всех записей.",
        "remediation": "Использовать параметризованные запросы или ORM.",
        "automation_level": "partially",
    },
    {
        "bug_name": "Отсутствие заголовка X-Content-Type-Options",
        "bug_criticality": "low",
        "bug_description": "Сервер не возвращает X-Content-Type-Options: nosniff.",
        "cvss_score": 4.3,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N",
        "reproduction_steps": "Выполнить запрос, проверить заголовки ответа.",
        "remediation": "Добавить заголовок во все ответы.",
        "automation_level": "fully",
    },
    {
        "bug_name": "Слабая политика паролей",
        "bug_criticality": "medium",
        "bug_description": "Принимаются пароли короче 6 символов без спецсимволов.",
        "cvss_score": 5.4,
        "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
        "reproduction_steps": "Зарегистрировать пользователя с паролем 12345.",
        "remediation": "Ввести требования: минимум 12 символов, буквы, цифры, спецсимволы.",
        "automation_level": "no",
    },
]


async def ensure_executors(db: AsyncSession) -> list[int]:
    result = await db.execute(select(Executor))
    existing = {e.name for e in result.scalars().all()}
    ids = []
    for name in EXECUTORS:
        if name not in existing:
            e = Executor(name=name)
            db.add(e)
            await db.flush()
            ids.append(e.id)
            existing.add(name)
        else:
            r = await db.execute(select(Executor).where(Executor.name == name))
            ids.append(r.scalar_one().id)
    return ids


async def get_software_ids(db: AsyncSession, limit: int = 5) -> list[int]:
    result = await db.execute(select(Software).limit(limit))
    return [s.id for s in result.scalars().all()]


async def seed_one_report(db: AsyncSession, name: str) -> int:
    report = Report(name=name, report_type="web")
    db.add(report)
    await db.flush()

    for item in get_checklist_items("web"):
        db.add(SecurityCheck(
            report_id=report.id,
            checklist_type=item["checklist_type"],
            check_id=item["check_id"],
            category=item["category"],
            name=item["name"],
            short_description=item.get("short_description"),
            goal=item.get("goal"),
        ))

    info = SystemInfo(report_id=report.id, **SYSTEM_INFO)
    db.add(info)
    await db.flush()

    executor_ids = await ensure_executors(db)
    for eid in executor_ids[:2]:
        await db.execute(insert(system_info_executors).values(system_info_id=info.id, executor_id=eid))
    software_ids = await get_software_ids(db, 4)
    for sid in software_ids:
        await db.execute(insert(system_info_software).values(system_info_id=info.id, software_id=sid))

    for i, v in enumerate(VULNS):
        vuln = Vulnerability(report_id=report.id, sort_order=i, **v)
        db.add(vuln)
        await db.flush()

    result = await db.execute(select(SecurityCheck).where(SecurityCheck.report_id == report.id).limit(3))
    for sc in result.scalars().all():
        sc.status = "passed" if sc.id % 2 else "not_tested"
        sc.notes = "Проверено вручную" if sc.status == "passed" else None

    return report.id


async def seed_test_run(db: AsyncSession, report_id: int) -> None:
    result = await db.execute(select(Vulnerability).where(Vulnerability.report_id == report_id).limit(1))
    vuln = result.scalar_one_or_none()
    if not vuln:
        return
    run = TestRun(report_id=report_id, status="completed", started_at=datetime.now(), finished_at=datetime.now())
    db.add(run)
    await db.flush()
    at = AutoTest(vulnerability_id=vuln.id, name="Проверка SQLi", script_type="python", script_content="# stub")
    db.add(at)
    await db.flush()
    db.add(TestRunResult(test_run_id=run.id, auto_test_id=at.id, passed=True, output="OK"))
    db.add(RetestResult(test_run_id=run.id, vulnerability_id=vuln.id, status="passed", notes="Исправлено"))


async def main() -> None:
    await init_db()
    async with async_session() as db:
        await seed_preset_software(db)
        r1_id = await seed_one_report(db, "Демо-отчёт по веб-аудиту")
        await seed_test_run(db, r1_id)
        await db.commit()
    print("OK: отчёт id=%d, SystemInfo, уязвимости, чеклист, ретест." % r1_id)


if __name__ == "__main__":
    asyncio.run(main())
