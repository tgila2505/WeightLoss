from __future__ import annotations

# Maps agent selector value → list of (agent_key, specialist_output_key) pairs.
# These are the specialist agents that run BEFORE GP consensus.
# "gp" and "panel" both run the full cascade; GP then synthesises all outputs.
_SPECIALIST_PIPELINE: dict[str, list[tuple[str, str]]] = {
    "dietitian": [("meal", "dietitian")],
    "endo":      [("lab", "endocrinologist")],
    "trainer":   [("trainer", "trainer")],
    "gp":        [("lab", "endocrinologist"), ("meal", "dietitian"), ("trainer", "trainer")],
    "panel":     [("lab", "endocrinologist"), ("meal", "dietitian"), ("trainer", "trainer")],
}


def get_specialist_pipeline(agent: str) -> list[tuple[str, str]]:
    """Return ordered list of (agent_key, specialist_output_key) pairs for the agent."""
    return _SPECIALIST_PIPELINE.get(agent, [])
