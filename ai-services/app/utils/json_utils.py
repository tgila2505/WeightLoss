from __future__ import annotations

import json
import re
from typing import Any


def parse_json(raw: str) -> dict[str, Any]:
    """Extract and parse the first JSON object from an LLM response string.

    Handles responses with preamble text by searching for the outermost
    ``{...}`` block. Raises ``ValueError`` if no JSON object is found.
    """
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in LLM response")
    return json.loads(match.group())
