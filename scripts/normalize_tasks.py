import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "dist" / "tasks-data.js"

COURSE_MARKER = re.compile(
    r"\(\s*(?:(?:I|V|X)+|\d{1,2})\s*[-–—]\s*(?:(?:I|V|X)+|\d{1,2})"
    r"(?:\s*[,;]?\s*(?:маг(?:истр(?:атура)?)?|бак(?:алавриат)?|курс))?\s*\)\s*",
    re.IGNORECASE,
)

MATH_MAP = {
    "ξ": r"\(\xi\)",
    "µ": r"\(\mu\)",
    "λ": r"\(\lambda\)",
    "τ": r"\(\tau\)",
    "ω": r"\(\omega\)",
    "ε": r"\(\varepsilon\)",
    "ϕ": r"\(\varphi\)",
    "φ": r"\(\varphi\)",
    "θ": r"\(\theta\)",
    "η": r"\(\eta\)",
    "σ": r"\(\sigma\)",
    "α": r"\(\alpha\)",
    "β": r"\(\beta\)",
    "π": r"\(\pi\)",
    "Φ": r"\(\Phi\)",
    "Θ": r"\(\Theta\)",
    "∆": r"\(\Delta\)",
    "Ω": r"\(\Omega\)",
    "∈": r"\(\in\)",
    "∉": r"\(\notin\)",
    "⊂": r"\(\subset\)",
    "⊆": r"\(\subseteq\)",
    "∪": r"\(\cup\)",
    "∩": r"\(\cap\)",
    "∼": r"\(\sim\)",
    "≥": r"\(\geq\)",
    "≤": r"\(\leq\)",
    "≠": r"\(\neq\)",
    "≡": r"\(\equiv\)",
    "→": r"\(\to\)",
    "∞": r"\(\infty\)",
    "±": r"\(\pm\)",
    "×": r"\(\times\)",
    "⊗": r"\(\otimes\)",
    "∗": r"\(\ast\)",
    "·": r"\(\cdot\)",
    "∃": r"\(\exists\)",
}

SUPERSCRIPTS = str.maketrans({
    "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
    "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9",
})
SUBSCRIPTS = str.maketrans({
    "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
    "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
})


def normalize_condition(text: str) -> str:
    text = re.sub(r"\\\(\\mathbb\{([RNQZ])\}\^\{([0-9nk])\}\\\)", r"\1\2", text)
    text = re.sub(r"\\\(\\mathbb\{([RNQZ])\}\\\)", r"\1", text)
    text = COURSE_MARKER.sub("", text).strip()
    if r"\(" in text:
        return text
    text = text.replace("≠", r"\(\neq\)").replace("̸=", r"\(\neq\)")
    text = re.sub(r"√\s*([A-Za-z0-9]+)", lambda m: rf"\(\sqrt{{{m.group(1)}}}\)", text)
    text = text.replace("√", r"\(\sqrt{\vphantom{x}}\)")
    text = re.sub(r"−\s*([0-9]+)", lambda m: rf"\(-{m.group(1)}\)", text)
    text = text.replace("−", r"\(-\)")

    for char, latex in MATH_MAP.items():
        text = text.replace(char, latex)

    for char in "⁰¹²³⁴⁵⁶⁷⁸⁹":
        text = text.replace(char, rf"\(^{{{char.translate(SUPERSCRIPTS)}}}\)")
    for char in "₀₁₂₃₄₅₆₇₈₉":
        text = text.replace(char, rf"\(_{{{char.translate(SUBSCRIPTS)}}}\)")

    text = re.sub(r"\bL1\b", r"\(L^1\)", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


source = DATA_FILE.read_text(encoding="utf-8")
match = re.fullmatch(r"window\.KOLMOGGOROV_DATA = (.*);\s*", source, re.DOTALL)
if not match:
    raise SystemExit("Unexpected tasks-data.js format")

payload = json.loads(match.group(1))
for task in payload["tasks"]:
    task["text"] = normalize_condition(task["text"])

DATA_FILE.write_text(
    "window.KOLMOGGOROV_DATA = "
    + json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    + ";\n",
    encoding="utf-8",
)
print(f"normalized {len(payload['tasks'])} tasks")
