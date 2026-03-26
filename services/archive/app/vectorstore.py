import logging
from pathlib import Path

import lancedb
import pyarrow as pa

from app.chunker import Chunk
from app.config import settings
from app.providers import get_embedding_provider

logger = logging.getLogger(__name__)

TABLE_NAME = "documents"


def _make_schema() -> pa.Schema:
    return pa.schema([
        pa.field("vector", pa.list_(pa.float32(), settings.embedding_dimensions)),
        pa.field("text", pa.utf8()),
        pa.field("doc_id", pa.utf8()),
        pa.field("doc_name", pa.utf8()),
        pa.field("source", pa.utf8()),
        pa.field("section", pa.utf8()),
        pa.field("severity", pa.utf8()),
        pa.field("technology", pa.utf8()),
        pa.field("report_type", pa.utf8()),
        pa.field("chunk_index", pa.int32()),
    ])


class VectorStore:
    def __init__(self, path: str | None = None) -> None:
        store_path = path or settings.vector_store_path
        Path(store_path).mkdir(parents=True, exist_ok=True)
        self._db = lancedb.connect(store_path)
        try:
            self._table = self._db.open_table(TABLE_NAME)
        except Exception:
            self._table = self._db.create_table(TABLE_NAME, schema=_make_schema())

    def add_chunks(self, doc_id: str, chunks: list[Chunk]) -> int:
        if not chunks:
            return 0

        provider = get_embedding_provider()
        texts = [c.text for c in chunks]

        batch_size = 50
        all_vectors: list[list[float]] = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            all_vectors.extend(provider.embed_texts(batch))

        rows = []
        for i, (chunk, vector) in enumerate(zip(chunks, all_vectors)):
            rows.append({
                "vector": vector,
                "text": chunk.text,
                "doc_id": doc_id,
                "doc_name": chunk.metadata.get("doc_name", ""),
                "source": chunk.metadata.get("source", ""),
                "section": chunk.metadata.get("section", ""),
                "severity": chunk.metadata.get("severity", ""),
                "technology": chunk.metadata.get("technology", ""),
                "report_type": chunk.metadata.get("report_type", ""),
                "chunk_index": i,
            })

        self._table.add(rows)
        logger.info("Indexed %d chunks for doc_id=%s", len(rows), doc_id)
        return len(rows)

    def search(
        self,
        query: str,
        top_k: int | None = None,
        severity: str | None = None,
        report_type: str | None = None,
        technology: str | None = None,
        doc_id: str | None = None,
    ) -> list[dict]:
        k = top_k or settings.default_top_k
        provider = get_embedding_provider()
        query_vector = provider.embed_query(query)

        search_builder = self._table.search(query_vector).limit(k)

        filters: list[str] = []
        if severity:
            filters.append(f"severity = '{severity}'")
        if report_type:
            filters.append(f"report_type = '{report_type}'")
        if technology:
            filters.append(f"technology LIKE '%{technology}%'")
        if doc_id:
            filters.append(f"doc_id = '{doc_id}'")

        if filters:
            search_builder = search_builder.where(" AND ".join(filters))

        results = search_builder.to_pandas()

        records: list[dict] = []
        for _, row in results.iterrows():
            records.append({
                "text": row["text"],
                "doc_name": row["doc_name"],
                "source": row["source"],
                "section": row["section"],
                "severity": row["severity"],
                "technology": row["technology"],
                "report_type": row["report_type"],
                "score": round(1 - float(row.get("_distance", 0)), 4),
                "doc_id": row["doc_id"],
            })
        return records

    def delete_document(self, doc_id: str) -> None:
        self._table.delete(f"doc_id = '{doc_id}'")
        logger.info("Deleted chunks for doc_id=%s", doc_id)

    def list_documents(self) -> list[dict]:
        try:
            df = self._table.to_pandas()
        except Exception:
            return []
        if df.empty:
            return []
        grouped = (
            df.groupby("doc_id")
            .agg(
                doc_name=("doc_name", "first"),
                source=("source", "first"),
                report_type=("report_type", "first"),
                chunk_count=("doc_id", "size"),
            )
            .reset_index()
        )
        return grouped.to_dict(orient="records")

    @property
    def total_chunks(self) -> int:
        try:
            return self._table.count_rows()
        except Exception:
            return 0
