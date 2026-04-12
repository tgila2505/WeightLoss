from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from app.providers.base import LLMProvider
from app.services.prompt_audit_service import PromptAuditService
from app.utils.json_utils import parse_json

_logger = logging.getLogger(__name__)

_SCORE_PROMPT_TEMPLATE = """\
You are a Senior AI Prompt Engineer evaluating the quality of an LLM agent's outputs.

AGENT: {agent_name}
CURRENT SYSTEM PROMPT:
---
{current_prompt}
---

SAMPLE OUTPUTS (last {n} interactions):
{samples}

Evaluate the agent on:
1. Relevance: does output address the user's query and context?
2. Persona consistency: does the agent sound like its defined professional role?
3. Completeness: does output include all expected structured fields?
4. Clarity: is the response clear and actionable for a non-clinical user?
5. Token efficiency: is the prompt concise without losing important guidance?

Provide a score 1-10 (10 = excellent), a written critique, and a proposed improved system prompt.

Respond with ONLY valid JSON:
{{
  "score": <int>,
  "critique": "<string>",
  "proposed_prompt": "<full proposed replacement prompt>"
}}
"""  # double-braces above are .format() escapes, not a bug

_ALL_AGENTS = ["gp", "endocrinologist", "meal", "trainer"]


class PromptEngineerAgent:
    def __init__(
        self,
        provider: LLMProvider,
        audit_service: PromptAuditService,
        sample_n: int = 5,
    ) -> None:
        self._provider = provider
        self._audit_svc = audit_service
        self._sample_n = sample_n

    def run(self, agent_filter: list[str] | None = None) -> dict[str, Any]:
        """
        Audit each agent in agent_filter (or all agents if None).
        Returns a report dict keyed by agent_name.
        Does NOT auto-apply proposed prompts — developer must review and apply manually.
        """
        targets = agent_filter or _ALL_AGENTS
        report: dict[str, Any] = {}

        for agent_name in targets:
            current_prompt = self._audit_svc.load_prompt(agent_name)
            if current_prompt is None:
                report[agent_name] = {"status": "skipped", "reason": "No prompt file found"}
                continue

            samples = self._audit_svc.sample_recent(agent_name=agent_name, n=self._sample_n)
            if not samples:
                report[agent_name] = {"status": "skipped", "reason": "No sample outputs found"}
                continue

            samples_text = json.dumps(samples, indent=2)
            prompt = _SCORE_PROMPT_TEMPLATE.format(
                agent_name=agent_name,
                current_prompt=current_prompt,
                n=len(samples),
                samples=samples_text,
            )

            try:
                provider = self._provider
                raw = provider.generate(prompt, max_tokens=2048)
                data = parse_json(raw)
                report[agent_name] = {
                    "status": "audited",
                    "score": data.get("score"),
                    "critique": data.get("critique", ""),
                    "proposed_prompt": data.get("proposed_prompt", ""),
                    "audited_at": datetime.now(timezone.utc).isoformat(),
                }
            except Exception as exc:
                _logger.error("PromptEngineerAgent failed for %s: %s", agent_name, exc)
                report[agent_name] = {"status": "error", "reason": str(exc)}

        return report

