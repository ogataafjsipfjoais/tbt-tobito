from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
TEMPLATE_DIR = Path(__file__).resolve().parent / "templates"
START_MARKER = "<!-- TOBITO:CONTENT:START -->"
END_MARKER = "<!-- TOBITO:CONTENT:END -->"


def extract_content(source):
    """Fail before writing output if the source boundaries are missing or ambiguous."""
    if source.count(START_MARKER) != 1 or source.count(END_MARKER) != 1:
        raise ValueError("index.php must contain exactly one pair of TOBITO content markers")
    _, _, remainder = source.partition(START_MARKER)
    body, separator, _ = remainder.partition(END_MARKER)
    if not separator:
        raise ValueError("TOBITO content markers are out of order")
    return body


def update_page_tobito(base_dir=BASE_DIR):
    body = extract_content((base_dir / "index.php").read_text(encoding="utf-8"))
    header = (TEMPLATE_DIR / "tobito-header.php").read_text(encoding="utf-8")
    footer = (TEMPLATE_DIR / "tobito-footer.php").read_text(encoding="utf-8")
    output = base_dir / "page-tobito.php"
    output.write_text(header + "\n" + body + "\n" + footer, encoding="utf-8")
    print("Updated page-tobito.php successfully!")


if __name__ == "__main__":
    update_page_tobito()
