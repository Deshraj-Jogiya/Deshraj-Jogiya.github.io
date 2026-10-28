// Runs lab/fit-engine.js on lab/fit_cases.json (scored by Career Pilot's Python fit_service) and fails on any difference.
// node tools/check_lab_fit.js
const fit = require("../lab/fit-engine.js");
const data = require("../lab/fit_cases.json");
const assert = require("assert");
const profile = data.profile;
const now = new Date(data.now + "T12:00:00");
let failed = 0;
for (const c of data.cases) {
  const r = fit.rulesFit(profile, c.title, c.posting, [], now);
  const got = { score: r.score, uncapped_score: r.uncapped_score, cap_reason: r.cap_reason, role_status: r.role.status,
                skills: r.skills, years: r.years };
  try { assert.deepStrictEqual(JSON.parse(JSON.stringify(got)), c.expected); console.log("ok  ", c.name, r.score); }
  catch (e) { failed++; console.log("FAIL", c.name, "\n", e.message.slice(0, 2000)); }
}
if (failed) { console.log(failed + " case(s) differ from fit_service.py"); process.exit(1); }
console.log(data.cases.length + " cases match fit_service.py");
