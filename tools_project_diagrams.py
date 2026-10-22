"""Draws the flow diagram shown on each personal project card that has no chart of its own.

Each diagram follows the architecture section (mermaid) of that project's README, in the same style as the case-study
diagrams. Run: python tools_project_diagrams.py  (writes assets/<slug>-flow.svg and their sizes)
"""

import json
from pathlib import Path

W, H = 960, 350
BOX_W, BOX_H, GAP = 210, 98, 28
COLS = [8 + i * (BOX_W + GAP) for i in range(4)]
ROWS = [62, 212]
TEAL, AMBER, VIOLET, BLUE = "#2dd4bf", "#f59e0b", "#a78bfa", "#60a5fa"


def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def box(col, row, tag, title, l1, l2="", colour=TEAL, dashed=False):
    x, y = COLS[col], ROWS[row]
    stroke = f'stroke="{colour}" stroke-dasharray="6 5"' if dashed else 'stroke="#30363d"'
    return (f'<rect x="{x}" y="{y}" width="{BOX_W}" height="{BOX_H}" rx="10" fill="#161b22" {stroke} stroke-width="1.3"/>\n'
            f'<text x="{x + 14}" y="{y + 22}" font-size="11" font-weight="700" letter-spacing="1.1" fill="{colour}">{esc(tag)}</text>\n'
            f'<text x="{x + 14}" y="{y + 45}" font-size="17" font-weight="700" fill="#e6edf3">{esc(title)}</text>\n'
            f'<text x="{x + 14}" y="{y + 66}" font-size="13" fill="#9198a1">{esc(l1)}</text>\n'
            f'<text x="{x + 14}" y="{y + 83}" font-size="13" fill="#9198a1">{esc(l2)}</text>\n')


def anchor(col, row, side):
    x, y = COLS[col], ROWS[row]
    return {"r": (x + BOX_W, y + BOX_H / 2), "l": (x, y + BOX_H / 2), "b": (x + BOX_W / 2, y + BOX_H),
            "t": (x + BOX_W / 2, y)}[side]


def arrow(a, b, label="", dashed=False):
    (x1, y1), (x2, y2) = anchor(*a), anchor(*b)
    dx, dy = x2 - x1, y2 - y1
    n = max((dx * dx + dy * dy) ** 0.5, 1)
    x2, y2 = x2 - 4 * dx / n, y2 - 4 * dy / n
    dash = ' stroke-dasharray="5 4"' if dashed else ""
    out = f'<path d="M{x1:.0f} {y1:.0f}L{x2:.0f} {y2:.0f}" stroke="#6e7681" stroke-width="1.6" fill="none"{dash} marker-end="url(#a)"/>\n'
    if label:
        out += f'<text x="{(x1 + x2) / 2 + 6:.0f}" y="{(y1 + y2) / 2 - 6:.0f}" font-size="11" fill="#8b949e">{esc(label)}</text>\n'
    return out


def svg(title, parts):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" '
            "font-family=\"-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif\">\n"
            '<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
            '<path d="M0 0L10 5L0 10z" fill="#6e7681"/></marker></defs>\n'
            f'<rect width="{W}" height="{H}" fill="#0d1117"/>\n'
            f'<text x="8" y="30" font-size="16" font-weight="700" fill="#e6edf3">{esc(title)}</text>\n' + "".join(parts) + "</svg>\n")


DIAGRAMS = {
    "reactive-gateway": ("How a posting flows through the reactive gateway", [
        box(0, 0, "CLIENT", "POST /postings", "a new job posting", "sent over HTTP"),
        box(1, 0, "SPRING WEBFLUX", "Controller", "non-blocking request", "handling"),
        box(2, 0, "SERVICE", "JobPostingService", "saves the posting and", "publishes it"),
        box(3, 0, "R2DBC", "Repository", "reactive database", "writes", BLUE),
        box(2, 1, "PROJECT REACTOR", "Sinks.Many replay", "keeps recent postings", "for late subscribers", VIOLET),
        box(3, 1, "SERVER-SENT EVENTS", "Live subscribers", "text/event-stream,", "history then live", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")), arrow((2, 0, "r"), (3, 0, "l")),
        arrow((2, 0, "b"), (2, 1, "t")), arrow((2, 1, "r"), (3, 1, "l")),
    ]),
    "job-notes": ("How a note is saved and enriched in Job Notes", [
        box(0, 0, "ANGULAR", "Client", "company research", "notes"),
        box(1, 0, "EXPRESS + MONGOOSE", "REST API", "create, list and", "search notes"),
        box(2, 0, "MONGODB", "Notes store", "text index for", "full-text search", BLUE),
        box(1, 1, "AFTER SAVE", "Wikipedia REST API", "company summary", "added to the note", VIOLET, dashed=True),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")),
        arrow((1, 0, "b"), (1, 1, "t"), dashed=True),
    ]),
    "interview-prep-api": ("How the Interview Prep API serves a question", [
        box(0, 0, "CLIENT", "Web or mobile app", "asks for a question,", "records an attempt"),
        box(1, 0, "ASP.NET CORE", "Minimal API", "C# endpoints with", "filtering and random pick"),
        box(2, 0, "EF CORE", "DbContext", "schema and seeding", "managed in code", BLUE),
        box(3, 0, "SQLITE", "Database", "questions and", "attempt history", BLUE),
        box(1, 1, "SCHEDULER", "SM-2", "spaced repetition picks", "when to ask again", VIOLET),
        box(2, 1, "TESTS", "19 xUnit tests", "12 integration tests on", "in-memory SQLite", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")), arrow((2, 0, "r"), (3, 0, "l")),
        arrow((1, 0, "b"), (1, 1, "t")),
    ]),
    "company-blocklist": ("How Company Blocklist checks a company", [
        box(0, 0, "CLIENT", "Request", "add, import CSV", "or look up a company"),
        box(1, 0, "CODEIGNITER 4", "Router", "routes to the", "controller"),
        box(2, 0, "CONTROLLER", "BlockedCompanies", "validates input,", "reports CSV results"),
        box(3, 0, "MODEL", "SQLite", "is_unique rule keeps", "one row per company", BLUE),
        box(2, 1, "SERVICE", "WARN lookup", "checks layoff notices", "for the company", VIOLET),
        box(3, 1, "CALIFORNIA EDD", "WARN notice file", "downloaded and", "cached for 24 hours", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")), arrow((2, 0, "r"), (3, 0, "l")),
        arrow((2, 0, "b"), (2, 1, "t")), arrow((2, 1, "r"), (3, 1, "l")),
    ]),
    "interview-prep-mobile": ("How Interview Prep Mobile keeps working offline", [
        box(0, 0, "REACT NATIVE", "App screen", "browse and answer", "interview questions"),
        box(1, 0, "HOOK", "Offline attempt queue", "decides where an", "attempt goes"),
        box(2, 0, "ONLINE", "Interview Prep API", "attempt saved", "on the server", BLUE),
        box(1, 1, "OFFLINE", "AsyncStorage queue", "attempts kept on", "the device", VIOLET),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")),
        arrow((1, 0, "b"), (1, 1, "t"), "offline"), arrow((1, 1, "r"), (2, 0, "b"), "sent on next success", dashed=True),
    ]),
    "htmx-search": ("How Company Search updates without a JavaScript framework", [
        box(0, 0, "BROWSER + HTMX", "Search box", "debounced on input,", "not just keyup"),
        box(1, 0, "FASTAPI", "Search endpoint", "renders an HTML", "fragment with Jinja2"),
        box(2, 0, "SQLITE", "Companies", "queried by name", "", BLUE),
        box(0, 1, "SWAP", "Results fragment", "replaces the list", "in place", VIOLET),
        box(1, 1, "INLINE EDIT", "Toggle sponsorship", "updates one row and", "returns its fragment"),
        box(2, 1, "SERVER-SENT EVENTS", "Refresh other tabs", "every open tab", "reloads its list", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")),
        arrow((1, 0, "b"), (0, 1, "t")), arrow((1, 1, "r"), (2, 1, "l")),
    ]),
    "arcgis-commute": ("How ArcGIS Commute Insights ranks companies", [
        box(0, 0, "INPUT", "Addresses", "home and each", "company"),
        box(1, 0, "ARCGIS", "Geocoding", "World Geocoding", "Service"),
        box(2, 0, "ARCGIS", "World Route", "drive time from", "home to each company"),
        box(3, 0, "OUTPUT", "Ranked companies", "shortest commute", "first", BLUE),
        box(2, 1, "FALLBACK", "Haversine distance", "great-circle distance", "when routing fails", VIOLET, dashed=True),
        box(3, 1, "LEAFLET", "Commute map", "HTML map with", "Esri vector tiles", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")), arrow((2, 0, "r"), (3, 0, "l")),
        arrow((1, 0, "b"), (2, 1, "l"), dashed=True), arrow((3, 0, "b"), (3, 1, "t")),
    ]),
    "member-qa": ("How the Member Messages QA system answers a question", [
        box(0, 0, "INPUT", "Question", "in plain English", ""),
        box(1, 0, "SPACY NER", "Who is it about?", "names matched with", "fuzzy first names"),
        box(2, 0, "SENTENCE-TRANSFORMERS", "Rank messages", "cosine similarity of", "MiniLM embeddings"),
        box(3, 0, "OUTPUT", "Answer", "extracted from the", "best message", BLUE),
        box(2, 1, "ALTERNATIVES", "Same retrieval via", "LangChain RAG, LlamaIndex,", "Semantic Kernel plugins", VIOLET, dashed=True),
        box(3, 1, "EVALUATION", "26 labelled questions", "right member 100%,", "right answer 96%", AMBER),
        arrow((0, 0, "r"), (1, 0, "l")), arrow((1, 0, "r"), (2, 0, "l")), arrow((2, 0, "r"), (3, 0, "l")),
        arrow((2, 0, "b"), (2, 1, "t"), dashed=True),
    ]),
}

if __name__ == "__main__":
    sizes_path = Path("assets/image_sizes.json")
    sizes = json.loads(sizes_path.read_text())
    for slug, (title, parts) in DIAGRAMS.items():
        Path(f"assets/{slug}-flow.svg").write_text(svg(title, parts), encoding="utf-8")
        sizes[f"assets/{slug}-flow.svg"] = [W, H]
    sizes_path.write_text(json.dumps(sizes, indent=1))
    print("wrote", len(DIAGRAMS), "diagrams")
