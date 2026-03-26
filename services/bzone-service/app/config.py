from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    log_level: str = "INFO"
    # BI.ZONE API
    bz_token: str = ""
    bz_base_url: str = "https://bugbounty.bi.zone"
    bz_companies: list[str] = [
        "sberbank-online",
        # "sber-bugs-zone-vi",
        # "sberbank-site",
        # "sberbank-invest",
        # "sberbankaktivno",
        # "shareholder-sberbank",
        # "sber-business",
        # "sber-anti-fraud",
        # "sberuniversity",
        # "sber-iot",
    ]
    bz_target_stages: list[int] = []
    # LLM
    llm_provider: str = "openai"
    llm_model: str = "openai/gpt-oss-20b"
    llm_base_url: str = "http://localhost:1234/v1"
    llm_api_key: str = ""
    llm_auth_key: str = ""
    llm_temperature: float = 0.1
    llm_max_tokens: int = 2048



settings = Settings()
