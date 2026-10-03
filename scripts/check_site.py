"""Check the generated Hugo site with only the Python standard library."""

from html.parser import HTMLParser
import json
from pathlib import Path
from urllib.parse import unquote, urlparse
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1] / "public"
ERRORS = []


class Page(HTMLParser):
    def __init__(self, markup):
        super().__init__()
        self.ids = set()
        self.links = []
        self.lang = None
        self.description = None
        self.canonical = None
        self.feed(markup)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if "id" in attrs:
            self.ids.add(attrs["id"])
        if tag == "meta" and attrs.get("name") == "description":
            self.description = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        for name in ("href", "src"):
            if attrs.get(name):
                self.links.append(attrs[name])


pages = {path: Page(path.read_text()) for path in ROOT.rglob("*.html")}
if not pages:
    ERRORS.append("No HTML pages were generated")


def target_for(source, value):
    url = urlparse(value)
    if url.scheme and url.scheme not in ("http", "https"):
        return None, None
    if url.netloc and url.netloc != "mtthw.xyz":
        return None, None
    target = ROOT / unquote(url.path).lstrip("/") if url.path.startswith("/") else source.parent / unquote(url.path)
    if not url.path:
        target = source
    elif url.path.endswith("/"):
        target /= "index.html"
    return target, unquote(url.fragment)


for path, page in pages.items():
    route = "/" + str(path.relative_to(ROOT).parent).replace(".", "").strip("/")
    if route != "/":
        route += "/"
    if page.lang != "en-IE":
        ERRORS.append(f"{path}: missing en-IE language")
    if not page.description:
        ERRORS.append(f"{path}: missing description")
    if page.canonical != f"https://mtthw.xyz{route}":
        ERRORS.append(f"{path}: invalid canonical URL {page.canonical!r}")
    data_path = path.with_name("index.json")
    if not data_path.exists():
        ERRORS.append(f"{path}: missing JSON page")
    else:
        data = json.loads(data_path.read_text())
        if not all(key in data for key in ("title", "description", "canonical", "hero", "content", "toc")):
            ERRORS.append(f"{data_path}: incomplete page data")
        elif data["description"] != page.description or data["canonical"] != page.canonical:
            ERRORS.append(f"{data_path}: metadata differs from HTML")
    for link in page.links:
        target, fragment = target_for(path, link)
        if target is None:
            continue
        if not target.exists():
            ERRORS.append(f"{path}: missing target {link}")
        elif fragment and target in pages and fragment not in pages[target].ids:
            ERRORS.append(f"{path}: missing anchor {link}")

for route in ("categories", "tags"):
    if ROOT.joinpath(route, "index.html") not in pages:
        ERRORS.append(f"Missing {route} page")

for entry in ET.parse(ROOT / "sitemap.xml").iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc"):
    target, _ = target_for(ROOT / "index.html", entry.text)
    if target not in pages:
        ERRORS.append(f"Sitemap entry has no HTML page: {entry.text}")

if ERRORS:
    raise SystemExit("\n".join(ERRORS))
print(f"Checked {len(pages)} HTML pages, matching JSON, internal links, and sitemap entries.")
