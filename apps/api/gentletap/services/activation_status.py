"""Redis status for async go-live / approve-all activation jobs."""

from uuid import UUID

from gentletap.utils.redis_client import get_json, set_json

ACTIVATION_TTL_SECONDS = 3600


def _key(user_id: UUID) -> str:
    return f"activation:{user_id}"


def _empty_result() -> dict:
    return {
        "activated": 0,
        "skipped_escalation": [],
        "skipped_other": [],
        "message": "",
        "plan_cap_total": 0,
        "plan_cap_remaining": 0,
    }


def set_activation_running(user_id: UUID) -> None:
    set_json(
        _key(user_id),
        {"status": "running", "result": _empty_result()},
        ttl_seconds=ACTIVATION_TTL_SECONDS,
    )


def set_activation_failed(user_id: UUID, error: str) -> None:
    set_json(
        _key(user_id),
        {"status": "failed", "error": error, "result": _empty_result()},
        ttl_seconds=ACTIVATION_TTL_SECONDS,
    )


def merge_activation_batch(user_id: UUID, batch: dict) -> None:
    current = get_json(_key(user_id)) or {"status": "running", "result": _empty_result()}
    result = current.get("result") or _empty_result()
    result["activated"] = int(result.get("activated", 0)) + int(batch.get("activated", 0))
    result["skipped_escalation"] = list(result.get("skipped_escalation", [])) + list(
        batch.get("skipped_escalation", [])
    )
    result["skipped_other"] = list(result.get("skipped_other", [])) + list(batch.get("skipped_other", []))
    result["plan_cap_total"] = batch.get("plan_cap_total", result.get("plan_cap_total", 0))
    result["plan_cap_remaining"] = batch.get("plan_cap_remaining", result.get("plan_cap_remaining", 0))
    result["message"] = f"Activated {result['activated']} invoice sequences"
    status = "running" if batch.get("has_more") else "complete"
    set_json(
        _key(user_id),
        {"status": status, "result": result, "error": None},
        ttl_seconds=ACTIVATION_TTL_SECONDS,
    )


def get_activation_status(user_id: UUID) -> dict:
    data = get_json(_key(user_id))
    if data is None:
        return {"status": "idle", "result": None, "error": None}
    return data
