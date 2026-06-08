from datetime import UTC, datetime, timedelta

from gentletap.intelligence.message_generator import generate_message
from gentletap.intelligence.risk_scorer import score_risk, select_tone
from gentletap.intelligence.schemas import (
    Action,
    Channel,
    DecideResult,
    ReminderContext,
)


class IntelligenceEngine:
    """Central AI decision orchestrator — every reminder passes through here."""

    def should_send(self, ctx: ReminderContext) -> tuple[bool, str | None]:
        inv = ctx.invoice
        if inv.balance <= 0:
            return False, "invoice_paid"
        if inv.days_overdue < 0:
            return False, "not_overdue"
        if inv.sequence_paused:
            return False, "sequence_paused"
        if inv.dispute_flag:
            return False, "dispute_open"
        if inv.client_responded_recently:
            return False, "client_responded"
        if not inv.approved:
            return False, "pending_approval"
        if not ctx.client_email:
            return False, "no_client_email"
        return True, None

    def needs_escalation(self, ctx: ReminderContext) -> bool:
        inv = ctx.invoice
        return inv.days_overdue >= 21 or (inv.amount > 10_000 and inv.days_overdue >= 14)

    def next_send_window(self, ctx: ReminderContext) -> datetime:
        # MVP: next Tue-Thu 10:00 UTC; refined in timing_optimizer.py later
        now = datetime.now(UTC)
        candidate = now + timedelta(hours=1)
        while candidate.weekday() not in (1, 2, 3):  # Tue, Wed, Thu
            candidate += timedelta(days=1)
        return candidate.replace(hour=10, minute=0, second=0, microsecond=0)

    def decide(self, ctx: ReminderContext) -> DecideResult:
        should, reason = self.should_send(ctx)
        if not should:
            return DecideResult(action=Action.WAIT, reason=reason)

        if self.needs_escalation(ctx):
            risk = score_risk(ctx)
            tone = select_tone(ctx, risk)
            return DecideResult(
                action=Action.ESCALATE,
                tone=tone,
                reason="human_handoff_recommended",
            )

        risk = score_risk(ctx)
        tone = select_tone(ctx, risk)
        message = generate_message(ctx, tone)

        return DecideResult(
            action=Action.SEND,
            channel=Channel.EMAIL,
            tone=tone,
            send_at=self.next_send_window(ctx),
            message=message,
        )


engine = IntelligenceEngine()
