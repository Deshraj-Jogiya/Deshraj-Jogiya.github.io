"""Scores the Lab's sample postings with Career Pilot's own fit_service.py and writes lab/fit_cases.json.

The Lab's job-fit explainer (lab/fit-engine.js) is a JavaScript port of that module; tools/check_lab_fit.js runs the
port on the same cases and fails on any difference. Rerun this after changing fit_service.py or projects.json:

    python tools/make_lab_fit_cases.py --crm G:/Job-Search-CRM-Automation
    node tools/check_lab_fit.js
"""
import argparse
import json
import subprocess
import sys
from datetime import date
from functools import partial
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOW = date(2026, 10, 1)  # fixed so "Present" means the same month in both runs


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--crm", required=True, help="path to the Job-Search-CRM-Automation checkout")
    args = ap.parse_args()
    sys.path.insert(0, args.crm)
    from app.services import fit_service, resume_rules

    fit_service.total_experience_months = partial(resume_rules.total_experience_months, now=NOW)
    # the same profile the page builds from projects.json, frozen into the cases file so a later profile edit
    # never fails the check; the check is about the port matching the rules, not about the data
    profile = json.loads(subprocess.check_output(
        ["node", "-e", "const f=require('./lab/fit-engine.js');"
         "process.stdout.write(JSON.stringify(f.profileFromSite(require('./projects.json'))))"], cwd=ROOT))
    samples = json.loads((ROOT / "lab" / "fit_samples.json").read_text(encoding="utf-8"))
    cases = []
    for s in samples:
        fit = fit_service.rules_fit(profile, s["title"], s["posting"])
        cases.append({"name": s["name"], "title": s["title"], "posting": s["posting"], "expected": {
            "score": fit["score"], "uncapped_score": fit["uncapped_score"], "cap_reason": fit["cap_reason"],
            "role_status": fit["role"]["status"], "skills": fit["skills"], "years": fit["years"]}})
    out = {"now": NOW.isoformat(), "source": "Job-Search-CRM-Automation app/services/fit_service.py",
           "profile": profile, "cases": cases}
    (ROOT / "lab" / "fit_cases.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"wrote {len(cases)} cases: " + ", ".join(f"{c['name']}={c['expected']['score']}" for c in cases))


if __name__ == "__main__":
    main()
