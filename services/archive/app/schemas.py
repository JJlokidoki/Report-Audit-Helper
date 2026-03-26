from pydantic import BaseModel


class SearchFilters(BaseModel):
    severity: str | None = None
    report_type: str | None = None
    technology: str | None = None
    doc_id: str | None = None


class SearchRequest(BaseModel):
    query: str
    top_k: int = 10
    filters: SearchFilters = SearchFilters()


class SearchResult(BaseModel):
    text: str
    doc_name: str
    source: str
    section: str
    severity: str
    technology: str
    report_type: str
    score: float
    doc_id: str


class SearchResponse(BaseModel):
    results: list[SearchResult]
    total_results: int
    query: str


class DocumentInfo(BaseModel):
    doc_id: str
    doc_name: str
    source: str
    report_type: str
    status: str
    chunk_count: int
    system_name: str | None = None
    vulnerability_count: int | None = None
    completion_date: str | None = None
    error: str | None = None
    created_at: str


class DocumentUploadResponse(BaseModel):
    doc_id: str
    doc_name: str
    status: str
    chunk_count: int
    system_name: str | None = None
    vulnerability_count: int | None = None
    completion_date: str | None = None


class IndexStats(BaseModel):
    total_documents: int
    total_chunks: int
    embedding_provider: str
    embedding_model: str


class SettingsResponse(BaseModel):
    embedding_provider: str
    embedding_model: str
    embedding_base_url: str
    embedding_api_key: str
    embedding_dimensions: int
    chunk_size: int
    chunk_overlap: int
    default_top_k: int
    providers: list[str]


class SettingsUpdate(BaseModel):
    embedding_provider: str | None = None
    embedding_model: str | None = None
    embedding_base_url: str | None = None
    embedding_api_key: str | None = None
    embedding_dimensions: int | None = None
    chunk_size: int | None = None
    chunk_overlap: int | None = None
    default_top_k: int | None = None
