from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    report_service_url: str = "http://127.0.0.1:8001"
    template_dir: Path = Path(__file__).parent.parent / "templates"


settings = Settings()
