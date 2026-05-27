"""
Convert GUIDE.md to GUIDE.pdf (requires: pip install markdown xhtml2pdf).
Run from project root: python web/export_guide_pdf.py
"""

from __future__ import annotations

import re
from pathlib import Path

import markdown
from xhtml2pdf import pisa

HERE = Path(__file__).resolve().parent
MD_PATH = HERE / "GUIDE.md"
PDF_PATH = HERE / "GUIDE.pdf"

PDF_CSS = """
@page { size: A4; margin: 2cm; }
body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 11pt;
  line-height: 1.5;
  color: #1a2332;
}
h1 { font-size: 22pt; border-bottom: 2px solid #3b82f6; padding-bottom: 0.3em; }
h2 { font-size: 16pt; margin-top: 1.2em; color: #334155; page-break-after: avoid; }
h3 { font-size: 13pt; page-break-after: avoid; }
code { background: #f1f5f9; font-size: 9pt; }
pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 0.8em;
  font-size: 8.5pt;
  white-space: pre-wrap;
  word-wrap: break-word;
}
table { border-collapse: collapse; width: 100%; margin: 1em 0; font-size: 10pt; }
th, td { border: 1px solid #cbd5e1; padding: 0.4em 0.6em; text-align: left; }
th { background: #e8eef4; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
blockquote {
  border-left: 4px solid #3b82f6;
  margin-left: 0;
  padding-left: 1em;
  color: #4a5568;
}
.diagram-note {
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 0.6em 1em;
  font-style: italic;
  color: #4a5568;
}
"""


def preprocess(md_text: str) -> str:
    """Replace mermaid blocks (not supported in PDF) with a short note."""
    return re.sub(
        r"```mermaid\n.*?```",
        '<div class="diagram-note">Flow diagram: open GUIDE.md in Markdown preview '
        "with a Mermaid extension, or view the HTML/Markdown source.</div>",
        md_text,
        flags=re.DOTALL,
    )


def md_to_html(md_text: str) -> str:
    return markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "nl2br"],
    )


def build_document(body_html: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>{PDF_CSS}</style>
</head>
<body>
{body_html}
</body>
</html>"""


def export_pdf() -> None:
    if not MD_PATH.is_file():
        raise FileNotFoundError(f"Missing {MD_PATH}")

    md_text = MD_PATH.read_text(encoding="utf-8")
    html = build_document(md_to_html(preprocess(md_text)))

    with PDF_PATH.open("wb") as pdf_file:
        status = pisa.CreatePDF(html, dest=pdf_file, encoding="utf-8")

    if status.err:
        raise RuntimeError(f"PDF generation failed (error code {status.err})")

    print(f"Created: {PDF_PATH}")


if __name__ == "__main__":
    export_pdf()
