from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    log_level: str = "INFO"
    llm_provider: str = "ollama"
    llm_model: str = "gemma3:27b-it-qat"
    llm_base_url: str = "http://localhost:11434"
    llm_api_key: str = ""
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2048


settings = Settings()
