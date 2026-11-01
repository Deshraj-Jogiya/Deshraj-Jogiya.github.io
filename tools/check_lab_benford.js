// Checks the Lab's Benford audit demo (lab/lab-benford.js) against the Tax Anomaly project's Python, using lab/data/benford.json:
// the Benford fit on all 9 ledger slices (counts exact; chi-square, MAD within 1e-8; p within 1e-6 relative; the same Nigrini
// range), every entry's Benford score and risk score at the project's 30/70 weights (within 1e-5), the model, rule and combined
// layers' flags at 65, and the review effort FINDINGS reports (43 entries).
// node tools/check_lab_benford.js
const fs = require("fs");
const path = require("path");
const b = require("../lab/lab-benford.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lab", "data", "benford.json"), "utf8"));
let failed = 0, checks = 0;
function check(what, ok, got, want) { checks++; if (!ok) { failed++; console.log("FAIL", what, got, want); } }

for (const [name, py] of Object.entries(data.fits)) {
  const rows = data.entries.filter((e) => name === "All entries" || (name === "Injected anomalies only" ? e.injected : e.department === name));
  const fit = b.benfordFit(rows.map((e) => b.firstDigit(e.amount)), data.mad_ranges);
  check(name + " n", fit.n === py.n, fit.n, py.n);
  check(name + " counts", fit.counts.join() === py.counts.join(), fit.counts, py.counts);
  check(name + " chi-square", Math.abs(fit.chi_square - py.chi_square) < 1e-8, fit.chi_square, py.chi_square);
  check(name + " p", Math.abs(fit.p - py.p) / py.p < 1e-6, fit.p, py.p);
  check(name + " mad", Math.abs(fit.mad - py.mad) < 1e-8, fit.mad, py.mad);
  check(name + " conformity", fit.conformity === py.conformity, fit.conformity, py.conformity);
}
const scores = b.benfordScores(data.entries.map((e) => e.amount));
const risk = b.riskScores(data.entries, scores, data.weights.benford);
let worst = 0;
data.entries.forEach((e, i) => {
  worst = Math.max(worst, Math.abs(scores[i] - e.benford_score), Math.abs(risk[i] - e.risk));
  check("entry " + e.id + " benford", Math.abs(scores[i] - e.benford_score) < 1e-5, scores[i], e.benford_score);
  check("entry " + e.id + " risk", Math.abs(risk[i] - e.risk) < 1e-5, risk[i], e.risk);
});
const layer = (flag) => {
  let flagged = 0, tp = 0;
  data.entries.forEach((e, i) => { if (flag(e, i)) { flagged++; tp += e.injected; } });
  return { flagged, true_positives: tp };
};
const got = { model: layer((e, i) => risk[i] >= data.threshold), rule: layer((e) => e.rule), combined: layer((e, i) => e.rule || risk[i] >= data.threshold) };
for (const k of Object.keys(got)) check("layer " + k, JSON.stringify(got[k]) === JSON.stringify(data.layers[k]), got[k], data.layers[k]);
const effort = b.reviewEffort(data.entries, risk, 0.9);
check("review effort", effort.opened === 43, effort.opened, 43);

if (failed) { console.log(failed + " of " + checks + " checks differ from Python"); process.exit(1); }
console.log(`${checks} Benford fits, entry scores, layer results and the review effort match Python (largest score difference ${worst.toExponential(2)})`);
