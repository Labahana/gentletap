from openai import OpenAI

from gentletap.config import get_settings

KIMI_BASE_URL = "https://api.moonshot.ai/v1"


def get_openai_client() -> OpenAI | None:
    settings = get_settings()
    if not settings.kimi_api_key:
        return None
    return OpenAI(api_key=settings.kimi_api_key, base_url=KIMI_BASE_URL)
