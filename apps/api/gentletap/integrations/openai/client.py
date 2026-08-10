from functools import lru_cache

from openai import OpenAI

from gentletap.config import get_settings

KIMI_BASE_URL = "https://api.moonshot.ai/v1"

# Bound the LLM call so a hung provider can't pin a web worker or the preview
# request thread forever. Retries stay with the SDK; we cap total wait per call.
_LLM_TIMEOUT_SECONDS = 20.0


@lru_cache
def get_openai_client() -> OpenAI | None:
    settings = get_settings()
    if not settings.kimi_api_key:
        return None
    return OpenAI(api_key=settings.kimi_api_key, base_url=KIMI_BASE_URL, timeout=_LLM_TIMEOUT_SECONDS)


@lru_cache
def get_zai_client() -> OpenAI | None:
    """z.ai (Zhipu / GLM) OpenAI-compatible client used as the AI fallback."""
    settings = get_settings()
    if not settings.zai_api_key:
        return None
    return OpenAI(
        api_key=settings.zai_api_key,
        base_url=settings.zai_base_url,
        timeout=_LLM_TIMEOUT_SECONDS,
    )
