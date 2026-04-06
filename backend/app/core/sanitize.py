import re

_TAGS = re.compile(r"<[^>]*>")
_NULL = re.compile(r"\x00")


def strip_html(value: str) -> str:
    """Remove HTML tags and null bytes from a string input."""
    return _TAGS.sub("", _NULL.sub("", value))
