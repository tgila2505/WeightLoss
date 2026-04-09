"""
Weekly AI Progress Report generator.

Full implementation: headless Chromium or WeasyPrint renders an HTML template
to PDF, uploads to object storage, updates WeeklyReport.blob_url and status.

This stub demonstrates the interface — replace with real implementation.
"""
import logging
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.billing import WeeklyReport

logger = logging.getLogger(__name__)


def generate_pending_reports(session: Session) -> int:
    """Process all pending WeeklyReport rows. Returns count completed."""
    pending = session.scalars(
        select(WeeklyReport).where(WeeklyReport.status == "pending")
    ).all()

    completed = 0
    for report in pending:
        try:
            report.status = "generating"
            session.flush()

            # TODO: Generate HTML template, render to PDF, upload to Blob storage
            blob_url = f"/reports/{report.user_id}/{report.week_key}.pdf"  # placeholder

            report.blob_url = blob_url
            report.status = "ready"
            report.generated_at = datetime.now(UTC)
            completed += 1
        except Exception:
            logger.exception("Failed to generate report %s", report.id)
            report.status = "failed"
        session.flush()

    session.commit()
    return completed
