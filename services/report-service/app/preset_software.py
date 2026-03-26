from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Software

PRESET_TOOLS = [
    {"name": "Burp Suite Professional", "description": "Прокси-перехватчик и сканер веб-уязвимостей", "labels": ["web"]},
    {"name": "Nmap", "description": "Сканер портов и сервисов", "labels": ["network", "general"]},
    {"name": "Metasploit Framework", "description": "Фреймворк для эксплуатации уязвимостей", "labels": ["general"]},
    {"name": "SQLMap", "description": "Автоматизированный инструмент для SQL-инъекций", "labels": ["web"]},
    {"name": "Nikto", "description": "Сканер веб-серверов", "labels": ["web"]},
    {"name": "Gobuster", "description": "Перебор директорий и поддоменов", "labels": ["web"]},
    {"name": "Hydra", "description": "Инструмент для брутфорса аутентификации", "labels": ["general"]},
    {"name": "John the Ripper", "description": "Взлом хешей паролей", "labels": ["general"]},
    {"name": "Wireshark", "description": "Анализатор сетевого трафика", "labels": ["network", "general"]},
    {"name": "Nuclei", "description": "Шаблонный сканер уязвимостей", "labels": ["web"]},
    {"name": "ffuf", "description": "Фаззер веб-директорий и параметров", "labels": ["web"]},
]


async def seed_preset_software(db: AsyncSession) -> None:
    result = await db.execute(select(Software).where(Software.is_preset == True))  # noqa: E712
    existing = {s.name: s for s in result.scalars().all()}

    for tool in PRESET_TOOLS:
        if tool["name"] not in existing:
            db.add(Software(is_preset=True, **tool))
        else:
            sw = existing[tool["name"]]
            if not sw.labels:
                sw.labels = tool.get("labels", [])

    await db.commit()
