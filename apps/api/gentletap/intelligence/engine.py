from gentletap.intelligence.channel_selector import select_channel
from gentletap.intelligence.risk_scorer import score_risk
from gentletap.intelligence.escalation import needs_human
from gentletap.intelligence.schemas import (
    Action,
    Channel,
    DecideResult,
    ReminderContext,
)
from gentletap.intelligence.timing_optimizer import next_send_window
from gentletap.intelligence.tone_selector import select_tone


def _generate_outbound_message(ctx: ReminderContext, tone, channel: Channel):
    from gentletap.intelligence.message_generator import generate_message

    return generate_message(ctx, tone, channel=channel)


class IntelligenceEngine:
    """Central AI decision orchestrator — every reminder passes through here."""

    def should_send(self, ctx: ReminderContext) -> tuple[bool, str | None]:
        inv = ctx.invoice
        step = inv.sequence_step
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
        if ctx.email_suppressed and ctx.client_email:
            return False, "email_suppressed"

        if step == 0 or step >= 4:
            if not ctx.client_email:
                return False, "no_client_email"
        elif not ctx.client_email and not ctx.client_phone:
            return False, "no_client_contact"
        return True, None

    def decide(self, ctx: ReminderContext) -> DecideResult:
        should, reason = self.should_send(ctx)
        if not should:
            return DecideResult(action=Action.WAIT, reason=reason)

        channel = select_channel(ctx)

        if needs_human(ctx):
            risk = score_risk(ctx)
            tone = select_tone(ctx, risk)
            return DecideResult(
                action=Action.ESCALATE,
                channel=channel,
                tone=tone,
                reason="human_handoff_recommended",
            )

        risk = score_risk(ctx)
        tone = select_tone(ctx, risk)
        message = _generate_outbound_message(ctx, tone, channel)

        return DecideResult(
            action=Action.SEND,
            channel=channel,
            tone=tone,
            send_at=next_send_window(ctx),
            message=message,
        )


engine = IntelligenceEngine()
