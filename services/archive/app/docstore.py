import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

_lock = asyncio.Lock()


def _store_path() -> Path:
    p = Path(settings.uploads_path).parent / "documents.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    return p


def _load() -> dict[str, dict]:
    path = _store_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save(data: dict[str, dict]) -> None:
    path = _store_path()
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


async def create_document(
    doc_id: str,
    doc_name: str,
    source: str,
    report_type: str = "",
) -> dict:
    record = {
        "doc_id": doc_id,
        "doc_name": doc_name,
        "source": source,
        "report_type": report_type,
        "status": "processing",
        "chunk_count": 0,
        "system_name": None,
        "vulnerability_count": None,
        "completion_date": None,
        "error": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    async with _lock:
        data = _load()
        data[doc_id] = record
        _save(data)
    return record


async def update_document(doc_id: str, **fields) -> dict | None:
    async with _lock:
        data = _load()
        if doc_id not in data:
            return None
        data[doc_id].update(fields)
        _save(data)
        return data[doc_id]


async def get_document(doc_id: str) -> dict | None:
    data = _load()
    return data.get(doc_id)


async def list_documents() -> list[dict]:
    data = _load()
    return list(data.values())


async def delete_document(doc_id: str) -> bool:
    async with _lock:
        data = _load()
        if doc_id not in data:
            return False
        del data[doc_id]
        _save(data)
    return True
