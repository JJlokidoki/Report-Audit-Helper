from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Software

PRESET_TOOLS = [
    {"name": "Burp Suite Professional", "description": "Прокси-перехватчик и сканер веб-уязвимостей"},
    {"name": "Nmap", "description": "Сканер портов и сервисов"},
    {"name": "Metasploit Framework", "description": "Фреймворк для эксплуатации уязвимостей"},
    {"name": "SQLMap", "description": "Автоматизированный инструмент для SQL-инъекций"},
    {"name": "Nikto", "description": "Сканер веб-серверов"},
    {"name": "Gobuster", "description": "Перебор директорий и поддоменов"},
    {"name": "Hydra", "description": "Инструмент для брутфорса аутентификации"},
    {"name": "John the Ripper", "description": "Взлом хешей паролей"},
    {"name": "Wireshark", "description": "Анализатор сетевого трафика"},
    {"name": "Nuclei", "description": "Шаблонный сканер уязвимостей"},
    {"name": "ffuf", "description": "Фаззер веб-директорий и параметров"},
]


async def seed_preset_software(db: AsyncSession) -> None:
    result = await db.execute(select(Software).where(Software.is_preset == True))  # noqa: E712
    existing_names = {s.name for s in result.scalars().all()}

    for tool in PRESET_TOOLS:
        if tool["name"] not in existing_names:
            db.add(Software(is_preset=True, **tool))

    await db.commit()
