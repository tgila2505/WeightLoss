import hashlib
from typing import Final

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.experiment import ExperimentAssignment

# Registry of all experiments and their allowed variants.
# First variant is the control (default).
EXPERIMENTS: Final[dict[str, list[str]]] = {
    "paywall-timing": ["after-plan", "before-plan"],
    "pricing-variant": ["9", "12", "19"],
    "headline-copy": ["A", "B"],
    "cta-copy": ["A", "B"],
}


def _bucket(user_id: int, experiment_key: str, variants: list[str]) -> str:
    """Deterministic variant assignment via MD5 hash bucketing.

    The same (user_id, experiment_key) pair always produces the same variant,
    regardless of when or where it is called.
    """
    seed = f"{user_id}:{experiment_key}"
    hash_int = int(hashlib.md5(seed.encode(), usedforsecurity=False).hexdigest(), 16)
    return variants[hash_int % len(variants)]


def get_or_assign_variant(
    session: Session,
    user_id: int,
    experiment_key: str,
) -> str:
    """Return this user's variant for the experiment, creating a DB record on
    the first call and returning the stored value on subsequent calls.

    Raises ValueError for unknown experiment keys.
    """
    variants = EXPERIMENTS.get(experiment_key)
    if variants is None:
        raise ValueError(f"Unknown experiment key: {experiment_key!r}")

    existing = session.scalar(
        select(ExperimentAssignment).where(
            ExperimentAssignment.user_id == user_id,
            ExperimentAssignment.experiment_key == experiment_key,
        )
    )
    if existing is not None:
        return existing.variant

    variant = _bucket(user_id, experiment_key, variants)
    assignment = ExperimentAssignment(
        user_id=user_id,
        experiment_key=experiment_key,
        variant=variant,
    )
    session.add(assignment)
    session.commit()
    return variant
