"""Autopilot mode bootstrap: generate templates + default sequence."""

from __future__ import annotations

import logging
from typing import List

from sqlalchemy.orm import Session

from app.models.sequence import Sequence
from app.models.template import Template
from app.services.ai.provider import generate_reminder
from app.services.ai.templates import get_static_template, render_static_body, render_static_subject
from app.services.ai.tones import TONES, DEFAULT_TONE_BY_DAY

logger = logging.getLogger(__name__)

DEFAULT_STEPS = [
    {"day_offset": 0, "tone": "warm", "template_id": None, "enabled": True},
    {"day_offset": 3, "tone": "friendly", "template_id": None, "enabled": True},
    {"day_offset": 7, "tone": "professional", "template_id": None, "enabled": True},
    {"day_offset": 14, "tone": "firm", "template_id": None, "enabled": True},
    {"day_offset": 21, "tone": "urgent", "template_id": None, "enabled": True},
]


def ensure_autopilot_assets(db: Session, org_id: str) -> dict:
    """Generate missing tone templates and default auto-assign sequence."""
    created_templates = []
    for tone in TONES:
        existing = (
            db.query(Template)
            .filter(Template.org_id == org_id, Template.tone == tone)
            .first()
        )
        if existing:
            existing.ai_approved = True
            tpl = existing
        else:
            static = get_static_template(tone)
            tpl = Template(
                org_id=org_id,
                name=f"Autopilot — {tone.title()}",
                tone=tone,
                subject=static["subject"],
                body=static["body"],
                is_default=True,
                ai_generated=True,
                ai_approved=True,
            )
            db.add(tpl)
            db.flush()
            created_templates.append(tpl.id)

        # Map into default steps
        for step in DEFAULT_STEPS:
            if step["tone"] == tone:
                step["template_id"] = tpl.id

    default_seq = (
        db.query(Sequence)
        .filter(Sequence.org_id == org_id, Sequence.is_default.is_(True))
        .first()
    )
    if not default_seq:
        default_seq = Sequence(
            org_id=org_id,
            name="Autopilot Default Sequence",
            status="active",
            steps=list(DEFAULT_STEPS),
            stop_after_days=30,
            is_default=True,
            auto_assign=True,
        )
        db.add(default_seq)
        db.flush()
        created_seq = True
    else:
        default_seq.is_default = True
        default_seq.auto_assign = True
        default_seq.status = "active"
        if not default_seq.steps:
            default_seq.steps = list(DEFAULT_STEPS)
        created_seq = False

    db.flush()
    return {
        "templates_created": created_templates,
        "sequence_id": default_seq.id,
        "sequence_created": created_seq,
    }


def disable_autopilot_assignment(db: Session, org_id: str) -> None:
    sequences = db.query(Sequence).filter(Sequence.org_id == org_id, Sequence.auto_assign.is_(True)).all()
    for seq in sequences:
        seq.auto_assign = False
