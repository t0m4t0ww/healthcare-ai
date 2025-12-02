# backend/app/config.py
from pathlib import Path
from pydantic import BaseModel, Field
from dotenv import load_dotenv
import os

load_dotenv()

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "your-secret-key")
JWT_EXPIRE_SECONDS = 60 * 60 * 24 * 7  # 7 days

class Settings(BaseModel):
    YOLO_MODEL_PATH: str = Field(default="ai_models/yolo_model/best.pt")
    LMSTUDIO_URL: str = Field(default="http://127.0.0.1:1234")
    LOG_LEVEL: str = Field(default="INFO")
    MAX_IMAGE_SIZE: int = Field(default=1024)
    ENABLE_RATE_LIMITING: bool = Field(default=False)  # Set to True in production
    DEFAULT_DOCTOR_ID: str = Field(default="691994fd596a2deacfefb623")  # For dev environment

    def model_abs_path(self) -> Path:
        """
        Trả về đường dẫn tuyệt đối tới file model.
        - Nếu YOLO_MODEL_PATH là tuyệt đối: dùng luôn.
        - Nếu là tương đối: ghép với repo root (…/Healthcare_AI).
        """
        p = Path(self.YOLO_MODEL_PATH)
        if p.is_absolute():
            return p
        # __file__ = …/backend/app/config.py  -> parents[2] = …/Healthcare_AI
        repo_root = Path(__file__).resolve().parents[2]
        return (repo_root / p).resolve()

def get_settings() -> Settings:
    return Settings(
        YOLO_MODEL_PATH=os.getenv("YOLO_MODEL_PATH", "ai_models/yolo_model/best.pt"),
        LMSTUDIO_URL=os.getenv("LMSTUDIO_URL", "http://127.0.0.1:1234"),
        LOG_LEVEL=os.getenv("LOG_LEVEL", "INFO"),
        MAX_IMAGE_SIZE=int(os.getenv("MAX_IMAGE_SIZE", "1024")),
    )

# Email Configuration - Use environment variables
EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "True").lower() == "true"