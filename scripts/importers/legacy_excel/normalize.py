from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher


WHITESPACE_RE = re.compile(r"\s+")
NON_WORD_RE = re.compile(r"[^a-z0-9]+")

UNIT_ALIASES = {
    "kg": "kg",
    "quilo": "kg",
    "quilograma": "kg",
    "g": "g",
    "grama": "g",
    "gramas": "g",
    "l": "l",
    "lt": "l",
    "litro": "l",
    "ml": "ml",
    "mililitro": "ml",
    "un": "un",
    "und": "un",
    "unidade": "un",
    "unidades": "un",
    "maco": "maço",
    "maço": "maço",
}

CONVERTIBLE_UNIT_GROUPS = {
    frozenset({"kg", "g"}),
    frozenset({"l", "ml"}),
}

FORCED_PENDING_CONFLICTS = {
    "batata lavada grauda un aproxim 350g",
    "bicarbonato",
}


def normalize_whitespace(value: str) -> str:
    return WHITESPACE_RE.sub(" ", value.strip())


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(char for char in normalized if not unicodedata.combining(char))


def normalize_name(value: str | None) -> str:
    if value is None:
        return ""

    text = normalize_whitespace(str(value))
    text = strip_accents(text).lower()
    text = text.replace("&", " e ")
    text = NON_WORD_RE.sub(" ", text)
    return normalize_whitespace(text)


def normalize_header(value: str | None) -> str:
    return normalize_name(value)


def normalize_unit(value: str | None) -> str | None:
    normalized = normalize_name(value)
    if not normalized:
        return None
    return UNIT_ALIASES.get(normalized, normalized)


def token_sort(value: str) -> str:
    return " ".join(sorted(normalize_name(value).split()))


def similarity(left: str, right: str) -> float:
    return SequenceMatcher(None, normalize_name(left), normalize_name(right)).ratio()


def reconciliation_score(left: str, right: str) -> float:
    left_normalized = normalize_name(left)
    right_normalized = normalize_name(right)

    if left_normalized == right_normalized:
        return 1.0

    if token_sort(left) == token_sort(right):
        return 0.99

    return similarity(left, right)


def is_forced_pending_conflict(name: str) -> bool:
    return normalize_name(name) in FORCED_PENDING_CONFLICTS


def units_are_compatible(left: str | None, right: str | None) -> bool:
    if not left or not right or left == right:
        return True

    return frozenset({left, right}) in CONVERTIBLE_UNIT_GROUPS
