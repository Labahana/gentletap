from openai import OpenAI

from gentletap.config import get_settings


def get_openai_client() -> OpenAI | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)
