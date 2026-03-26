import asyncio
import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile

from app import docstore
from app.chunker import chunk_document
from app.config import settings
from app.extractors import extract_from_docx, extract_from_pdf, extract_from_report_service
from app.meta_extractor import extract_metadata
from app.schemas import DocumentInfo, DocumentUploadResponse
from app.vectorstore import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/archive/documents", tags=["documents"])

_ALLOWED_EXTENSIONS = {".docx", ".pdf"}


def _get_store() -> VectorStore:
    return VectorStore()


async def _process_upload(
    doc_id: str,
    file_bytes: bytes,
    ext: str,
    name: str,
    report_type: str,
    technology: str,
) -> None:
    try:
        if ext == ".docx":
            text = extract_from_docx(file_bytes)
        else:
            text = extract_from_pdf(file_bytes)

        if not text.strip():
            await docstore.update_document(doc_id, status="error", error="Не удалось извлечь текст")
            return

        meta = extract_metadata(text)

        chunks = chunk_document(
            text=text,
            doc_name=name,
            source_type="upload",
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            extra_metadata={"report_type": report_type, "technology": technology},
        )

        store = _get_store()
        count = store.add_chunks(doc_id, chunks)

        await docstore.update_document(
            doc_id,
            status="indexed",
            chunk_count=count,
            system_name=meta.system_name,
            vulnerability_count=meta.vulnerability_count,
            completion_date=meta.completion_date,
        )
    except Exception as e:
        logger.error("Failed to process document %s: %s", doc_id, e)
        await docstore.update_document(doc_id, status="error", error=str(e))


async def _process_import(doc_id: str, report_id: int) -> None:
    try:
        text, api_meta = await extract_from_report_service(report_id, settings.report_service_url)

        if not text.strip():
            await docstore.update_document(doc_id, status="error", error="Отчёт не содержит данных")
            return

        meta = extract_metadata(text)

        chunks = chunk_document(
            text=text,
            doc_name=f"report-{report_id}",
            source_type="report_service",
            chunk_size=settings.chunk_size,
            chunk_overlap=settings.chunk_overlap,
            extra_metadata=api_meta,
        )

        store = _get_store()
        count = store.add_chunks(doc_id, chunks)

        await docstore.update_document(
            doc_id,
            status="indexed",
            chunk_count=count,
            system_name=meta.system_name,
            vulnerability_count=meta.vulnerability_count,
            completion_date=meta.completion_date,
        )
    except Exception as e:
        logger.error("Failed to import report %d: %s", report_id, e)
        await docstore.update_document(doc_id, status="error", error=str(e))


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile,
    doc_name: str | None = None,
    report_type: str = "",
    technology: str = "",
) -> DocumentUploadResponse:
    filename = file.filename or "unknown"
    ext = Path(filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Формат {ext} не поддерживается. Допустимы: {_ALLOWED_EXTENSIONS}")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(400, "Пустой файл")

    doc_id = str(uuid.uuid4())
    name = doc_name or Path(filename).stem

    uploads_dir = Path(settings.uploads_path)
    uploads_dir.mkdir(parents=True, exist_ok=True)
    save_path = uploads_dir / f"{doc_id}{ext}"
    save_path.write_bytes(file_bytes)

    record = await docstore.create_document(doc_id, name, "upload", report_type)

    asyncio.create_task(_process_upload(doc_id, file_bytes, ext, name, report_type, technology))

    return DocumentUploadResponse(
        doc_id=record["doc_id"],
        doc_name=record["doc_name"],
        status=record["status"],
        chunk_count=record["chunk_count"],
        system_name=record["system_name"],
        vulnerability_count=record["vulnerability_count"],
        completion_date=record["completion_date"],
    )


@router.post("/import/{report_id}", response_model=DocumentUploadResponse)
async def import_report(report_id: int) -> DocumentUploadResponse:
    doc_id = f"report-{report_id}"

    existing = await docstore.get_document(doc_id)
    if existing:
        store = _get_store()
        store.delete_document(doc_id)
        await docstore.delete_document(doc_id)

    record = await docstore.create_document(doc_id, f"report-{report_id}", "report_service")

    asyncio.create_task(_process_import(doc_id, report_id))

    return DocumentUploadResponse(
        doc_id=record["doc_id"],
        doc_name=record["doc_name"],
        status=record["status"],
        chunk_count=record["chunk_count"],
        system_name=record["system_name"],
        vulnerability_count=record["vulnerability_count"],
        completion_date=record["completion_date"],
    )


@router.get("", response_model=list[DocumentInfo])
async def list_documents_endpoint() -> list[DocumentInfo]:
    docs = await docstore.list_documents()
    return [DocumentInfo(**d) for d in docs]


@router.delete("/{doc_id}")
async def delete_document(doc_id: str) -> dict:
    store = _get_store()
    store.delete_document(doc_id)
    await docstore.delete_document(doc_id)

    upload_dir = Path(settings.uploads_path)
    for f in upload_dir.glob(f"{doc_id}.*"):
        f.unlink(missing_ok=True)

    return {"status": "deleted", "doc_id": doc_id}
