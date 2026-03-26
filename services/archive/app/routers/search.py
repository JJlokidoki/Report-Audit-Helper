import logging

from fastapi import APIRouter, HTTPException

from app.schemas import SearchRequest, SearchResponse, SearchResult
from app.vectorstore import VectorStore

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/archive", tags=["search"])


@router.post("/search", response_model=SearchResponse)
async def search_documents(req: SearchRequest) -> SearchResponse:
    store = VectorStore()

    if store.total_chunks == 0:
        return SearchResponse(results=[], total_results=0, query=req.query)

    try:
        raw = store.search(
            query=req.query,
            top_k=req.top_k,
            severity=req.filters.severity,
            report_type=req.filters.report_type,
            technology=req.filters.technology,
            doc_id=req.filters.doc_id,
        )
    except Exception as e:
        logger.error("Search failed: %s", e)
        raise HTTPException(500, f"Ошибка поиска: {e}")

    results = [SearchResult(**r) for r in raw]
    return SearchResponse(results=results, total_results=len(results), query=req.query)
