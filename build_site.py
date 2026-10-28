"""Static site build: renders index.html, one page per featured case study (projects/<slug>/index.html), the Lab page
(lab/index.html), sitemap.xml and robots.txt from projects.json, case_studies.json and the Jinja2 templates.

Only needs Jinja2. Image sizes come from assets/image_sizes.json (written by prepare_assets.py, run locally).
"""
import hashlib
import json
import os
from datetime import date

from jinja2 import Environment, FileSystemLoader

SITE_URL = "https://deshraj-jogiya.github.io"
# Paste the token from Google Search Console's "HTML tag" verification here to verify the site
GOOGLE_SITE_VERIFICATION = ""


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def write(path, text):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def asset_version():
    h = hashlib.sha256()
    for name in ("app.js", "style.css", "assistant-local.js", "lab/fit-engine.js", "lab/lab-tools.js", "lab/lab-tools.css"):
        with open(name, "rb") as f:
            h.update(f.read())
    return h.hexdigest()[:10]


def web_image(path, sizes):
    """Use the WebP copy of a PNG chart when prepare_assets.py has made one."""
    if path and path.endswith(".png"):
        webp = path[:-4] + ".webp"
        if webp in sizes:
            return webp
    return path


def person_json_ld(data):
    person = {
        "@type": "Person",
        "name": "Deshraj Jogiya",
        "jobTitle": data["title"],
        "description": data["summary"],
        "url": SITE_URL + "/",
        "image": SITE_URL + "/assets/profile.jpg",
        "email": "mailto:djogiya786@gmail.com",
        "address": {"@type": "PostalAddress", "addressLocality": "Tempe", "addressRegion": "AZ", "addressCountry": "US"},
        "alumniOf": {"@type": "CollegeOrUniversity", "name": "Arizona State University"},
        "sameAs": ["https://www.linkedin.com/in/deshrajjogiya", "https://github.com/Deshraj-Jogiya"],
        "knowsAbout": ["Data Engineering", "Machine Learning", "PySpark", "dbt", "Apache Airflow", "Snowflake",
                       "Databricks", "Python", "SQL", "FastAPI", "MLflow"],
    }
    return json.dumps({"@context": "https://schema.org", "@type": "ProfilePage", "mainEntity": person}, ensure_ascii=False)


def main():
    print("Building the static site...")
    data = load("projects.json")
    case_studies = load("case_studies.json")
    sizes = load("assets/image_sizes.json") if os.path.exists("assets/image_sizes.json") else {}

    for p in data["projects"]:
        if p.get("dashboard_url"):
            p["dashboard_url"] = web_image(p["dashboard_url"], sizes)
            sizes.setdefault(p["dashboard_url"], [1600, 900])
    sizes.setdefault("assets/profile.jpg", [400, 400])

    featured = sorted((p for p in data["projects"] if p.get("featured")), key=lambda p: p["featured"])
    others = [p for p in data["projects"] if not p.get("featured") and not p.get("team")]
    team = [p for p in data["projects"] if p.get("team")]

    env = Environment(loader=FileSystemLoader("templates"))
    common = dict(data, site_url=SITE_URL, img_sizes=sizes, case_studies=case_studies, featured_projects=featured,
                  other_projects=others, team_projects=team, asset_version=asset_version(),
                  google_site_verification=GOOGLE_SITE_VERIFICATION)

    write("index.html", env.get_template("index.html").render(
        common, page_path="/",
        page_title="Deshraj Jogiya | Data Engineer & Machine Learning Engineer",
        page_description=("Deshraj Jogiya, Data Engineer and Machine Learning Engineer in Tempe, AZ (open to relocation). "
                          "Case studies: Career Pilot, a job-search platform in production, plus PySpark, dbt and ML projects."),
        json_ld=person_json_ld(data)))
    pages = ["/"]

    for p in featured:
        cs = case_studies[p["slug"]]
        path = f"/projects/{p['slug']}/"
        write(f"projects/{p['slug']}/index.html", env.get_template("case_study.html").render(
            common, project=p, cs=cs, page_path=path, og_type="article",
            page_title=f"{cs['title']} | Deshraj Jogiya",
            page_description=cs["summary"][:300], json_ld=None))
        pages.append(path)

    write("lab/index.html", env.get_template("lab.html").render(
        common, page_path="/lab/", page_title="The Lab | Deshraj Jogiya",
        page_description="In-browser demos of data work: SQL, a pipeline monitor, A/B tests, model thresholds, job fit, data contracts, SCD Type 2, drift and fairness, table time travel, event-time windows and Airflow backfills.",
        json_ld=None))
    pages.append("/lab/")

    today = date.today().isoformat()
    urls = "\n".join(f"  <url><loc>{SITE_URL}{p}</loc><lastmod>{today}</lastmod></url>" for p in pages)
    write("sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}\n</urlset>\n')
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {SITE_URL}/sitemap.xml\n")
    print(f"  Built {len(pages)} pages, sitemap.xml and robots.txt.")


if __name__ == "__main__":
    main()
