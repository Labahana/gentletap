import logging
from uuid import UUID

from gentletap.database import Profile, SessionLocal
from gentletap.services.activation_status import merge_activation_batch, set_activation_running
from gentletap.services.dashboard_cache import invalidate_dashboard_summary
from gentletap.services.reminders import approve_all_overdue
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="gentletap.tasks.activation.run_activation_batch")
def run_activation_batch(user_id: str, *, finalize_onboarding: bool = False) -> dict:
    uid = UUID(user_id)
    db = SessionLocal()
    try:
        user = db.query(Profile).filter(Profile.id == uid).one()
        result = approve_all_overdue(db, user, finalize_onboarding=finalize_onboarding)
        merge_activation_batch(uid, result)
        invalidate_dashboard_summary(uid)
        if result.get("has_more"):
            run_activation_batch.delay(user_id, finalize_onboarding=False)
        return result
    except Exception:
        logger.exception("Activation batch failed for user %s", user_id)
        from gentletap.services.activation_status import set_activation_failed

        set_activation_failed(uid, "Activation failed — try again from the dashboard")
        raise
    finally:
        db.close()


def queue_activation(user_id: UUID) -> None:
    set_activation_running(user_id)
    run_activation_batch.delay(str(user_id), finalize_onboarding=True)
