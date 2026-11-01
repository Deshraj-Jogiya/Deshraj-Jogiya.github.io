// Checks the Lab's survival-curve demo (lab/lab-trials.js) against lifelines and SciPy on all 12 gender x age filters in
// lab/data/trials.json: every Kaplan-Meier step, survival at day 365, the median, every log-rank test and every adverse-event
// chi-square test (each arm pair and all three arms). Statistics must agree within 1e-6, p-values within 1e-6 relative.
// node tools/check_lab_trials.js
const fs = require("fs");
const path = require("path");
const t = require("../lab/lab-trials.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lab", "data", "trials.json"), "utf8"));
let failed = 0, checks = 0, worst = 0;
function close(what, got, want, rel) {
  checks++;
  const diff = want === 0 ? Math.abs(got) : (rel ? Math.abs(got - want) / Math.abs(want) : Math.abs(got - want));
  worst = Math.max(worst, diff);
  if (!(diff <= 1e-6)) { failed++; console.log("FAIL", what, got, want); }
}
const key = (arms) => arms.join("|");

for (const view of data.python) {
  const band = data.age_bands[view.age_band];
  const rows = data.patients.filter((p) => (view.gender === "All" || p.gender === view.gender) && p.age >= band[0] && p.age <= band[1]);
  const tag = view.gender + "/" + view.age_band;
  if (rows.length !== view.n) { failed++; console.log("FAIL count", tag, rows.length, view.n); }
  const byArm = {};
  for (const arm of data.arms) {
    const a = rows.filter((p) => p.arm === arm), py = view.arms[arm];
    byArm[arm] = a;
    if (a.length !== py.n) { failed++; console.log("FAIL arm count", tag, arm); continue; }
    if (a.length < data.min_arm) continue;
    const km = t.kaplanMeier(a.map((p) => p.days), a.map((p) => p.death));
    if (km.times.length !== py.times.length || km.times.some((x, i) => x !== py.times[i])) { failed++; console.log("FAIL km times", tag, arm); continue; }
    km.survival.forEach((s, i) => close(tag + " " + arm + " S(" + km.times[i] + ")", s, py.survival[i]));
    close(tag + " " + arm + " S(365)", t.survivalAt(km, 365), py.at_365);
    checks++;
    if (t.medianSurvival(km) !== py.median) { failed++; console.log("FAIL median", tag, arm, t.medianSurvival(km), py.median); }
  }
  for (const lr of view.logrank) {
    const [x, y] = lr.arms.map((arm) => byArm[arm]);
    const r = t.logRank(x.map((p) => p.days), x.map((p) => p.death), y.map((p) => p.days), y.map((p) => p.death));
    close(tag + " log-rank " + key(lr.arms), r.statistic, lr.statistic);
    close(tag + " log-rank p " + key(lr.arms), r.p, lr.p, true);
  }
  for (const c of view.chi_square) {
    const r = t.chiSquare(c.arms.map((arm) => { const adv = byArm[arm].filter((p) => p.adverse).length; return [byArm[arm].length - adv, adv]; }));
    if (c.statistic === null) { checks++; if (r !== null) { failed++; console.log("FAIL chi null", tag); } continue; }
    close(tag + " chi-square " + key(c.arms), r.statistic, c.statistic);
    close(tag + " chi-square p " + key(c.arms), r.p, c.p, true);
  }
}
// "Your own data" mode: the example the page pre-fills (Freireich et al. 1963, 6-MP against placebo) read by parseOwn, against
// lifelines 0.30 on the same rows (logrank_test 16.792940989216547, p 4.168809109334511e-05; median 23 and 8 weeks).
{
  const html = fs.readFileSync(path.join(__dirname, "..", "templates", "_lab_stats.html"), "utf8");
  const own = t.parseOwn(html.split('id="tr-paste"')[1].split(">").slice(1).join(">").split("</textarea")[0]);
  const a = own.groups["6-MP"], b = own.groups["Placebo"], r = t.logRank(a.days, a.deaths, b.days, b.deaths);
  checks += 2; if (own.bad.length || a.days.length !== 21 || b.days.length !== 21) { failed++; console.log("FAIL own-data rows", own.bad); }
  close("own-data log-rank", r.statistic, 16.792940989216547);
  close("own-data log-rank p", r.p, 4.168809109334511e-05, true);
  if (t.medianSurvival(t.kaplanMeier(a.days, a.deaths)) !== 23 || t.medianSurvival(t.kaplanMeier(b.days, b.deaths)) !== 8) { failed++; console.log("FAIL own-data medians"); }
}
if (failed) { console.log(failed + " of " + checks + " checks differ from Python"); process.exit(1); }
console.log(`${checks} survival, log-rank and chi-square values over ${data.python.length} filters and the own-data example match lifelines and SciPy ` +
            `(largest difference ${worst.toExponential(2)})`);
