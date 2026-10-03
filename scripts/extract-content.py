#!/usr/bin/env python3
"""Extract maintainable article records from the captured semantic DOM evidence."""

from __future__ import annotations

import json
import re
from pathlib import Path
from urllib.parse import urlsplit

from lxml import html


PROJECT_ROOT = Path(__file__).resolve().parent.parent
ROUTE_ROOT = PROJECT_ROOT / ".evidence" / "routes"
OUTPUT_PATH = PROJECT_ROOT / "src" / "data" / "articles.json"
ASSET_PREFIX = "/assets/framerusercontent.com/images/"


def normalize(value: str) -> str:
    return " ".join(value.split())


def image_path(src: str) -> str:
    return f"{ASSET_PREFIX}{Path(urlsplit(src).path).name}"


def load_route(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def semantic_elements(root):
    return root.xpath("//h1|//h2|//h3|//h4|//h5|//h6|//p|//li")


def inline_runs(element):
    runs = []

    def visit(node, bold=False, italic=False):
        bold = bold or node.tag in {"strong", "b"}
        italic = italic or node.tag in {"em", "i"}
        if node.text:
            runs.append({"text": re.sub(r"\s+", " ", node.text), "bold": bold, "italic": italic})
        for child in node:
            if child.tag == "br":
                runs.append({"text": "", "bold": False, "italic": False, "break": True})
            else:
                visit(child, bold, italic)
            if child.tail:
                runs.append({"text": re.sub(r"\s+", " ", child.tail), "bold": bold, "italic": italic})

    visit(element)
    if runs:
        runs[0]["text"] = runs[0]["text"].lstrip()
        runs[-1]["text"] = runs[-1]["text"].rstrip()
    return [run for run in runs if run["text"] or run.get("break")]


def article_record(route_file: Path) -> dict:
    route = load_route(route_file)
    root = html.fromstring(route["cleanDom"])
    title = re.sub(r" - My Framer Site$", "", route["title"])
    elements = semantic_elements(root)
    title_indices = [
        index
        for index, element in enumerate(elements)
        if normalize(element.text_content()) == title
    ]
    title_index = title_indices[1] if len(title_indices) > 1 else title_indices[0]

    category = normalize(elements[title_index + 1].text_content())
    date = normalize(elements[title_index + 2].text_content())
    blocks = []
    for element in elements[title_index + 3 :]:
        text = normalize(element.text_content())
        if not text:
            continue
        if text == "You Might Also Like":
            break
        if element.tag == "p" and element.xpath("ancestor::li"):
            continue
        if element.tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            blocks.append({"type": "heading", "tag": element.tag, "text": text, "runs": inline_runs(element)})
        elif element.tag == "li":
            siblings = element.getparent().xpath("./li")
            marker = f"{siblings.index(element) + 1}." if element.getparent().tag == "ol" else "•"
            blocks.append({"type": "listItem", "marker": marker, "text": text, "runs": inline_runs(element)})
        else:
            blocks.append({"type": "paragraph", "text": text, "runs": inline_runs(element)})

    images = []
    for element in root.xpath("//img[@src]"):
        candidate = image_path(element.get("src"))
        if candidate not in images:
            images.append(candidate)

    return {
        "slug": route["route"].removeprefix("/blog/"),
        "title": title,
        "category": category,
        "date": date,
        "image": images[1],
        "blocks": blocks,
    }


def index_metadata(records: list[dict]) -> None:
    route = load_route(ROUTE_ROOT / "blog.json")
    root = html.fromstring(route["cleanDom"])
    paragraphs = [normalize(element.text_content()) for element in root.xpath("//p")]
    images = []
    for element in root.xpath("//img[@src]"):
        candidate = image_path(element.get("src"))
        if candidate not in images:
            images.append(candidate)

    card_images = images[1:]
    for index, record in enumerate(records):
        title_index = paragraphs.index(record["title"])
        record["excerpt"] = paragraphs[title_index + 1]
        if index < len(card_images):
            record["image"] = card_images[index]


def main() -> None:
    records = [
        article_record(path)
        for path in sorted(ROUTE_ROOT.glob("blog__*.json"))
    ]
    order = [
        "innovative-marketing-strategies-for-small-businesses",
        "the-importance-of-diversity-and-inclusion-in-today-s-workplace",
        "mastering-time-management-tips-for-busy-professionals",
        "the-future-of-ai-opportunities-and-challenges",
        "strategies-for-building-a-resilient-business",
        "the-art-of-effective-communication-in-the-workplace",
        "digital-transformation-navigating-the-new-normal",
        "unlocking-the-secrets-of-successful-remote-teams",
        "the-power-of-emotional-intelligence-in-leadership",
    ]
    records.sort(key=lambda record: order.index(record["slug"]))
    index_metadata(records)
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(
        json.dumps(records, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(records)} article records to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
