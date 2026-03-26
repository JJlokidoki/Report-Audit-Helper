from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    log_level: str = "INFO"

    embedding_provider: str = "gigachat"
    embedding_model: str = "Embeddings"
    embedding_base_url: str = "https://gigachat.devices.sberbank.ru/api/v1"
    embedding_api_key: str = ""
    embedding_dimensions: int = 1024

    vector_store_path: str = "data/vectorstore"
    uploads_path: str = "data/uploads"

    chunk_size: int = 512
    chunk_overlap: int = 50
    default_top_k: int = 3

    report_service_url: str = "http://127.0.0.1:8001"


settings = Settings()
