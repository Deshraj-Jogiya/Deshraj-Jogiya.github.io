// Checks the Lab's emissions forecast explorer (lab/lab-emissions.js) against the Multi-State-Land-Use-Emissions-Analysis project's
// models/epa_forecast.py (lab/data/emissions/emissions.json, written by export_lab_data.py), and fails on any difference:
// 1. the linear regression the browser fits on the years before 2018 must predict every 2018-2022 point within 0.0005 of
//    scikit-learn's (Python rounds to 4 decimals), on all 125 test points;
// 2. the accuracies (1 - WAPE over all 25 series) for the regression, the shipped Random Forest predictions and last year's value
//    must round to FINDINGS' 0.9418, 0.9329 and 0.947;
// 3. the own-series path must read a pasted series back exactly and refuse one with a gap.
// node tools/check_lab_emissions.js
const fs = require("fs");
const path = require("path");
const em = require("../lab/lab-emissions.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lab", "data", "emissions", "emissions.json"), "utf8"));
em.projectForecast(data.series, data.test_from);
let failed = 0, worst = 0, points = 0;
const pooled = { "Linear Regression": [[], []], "Random Forest": [[], []], "Last year's value": [[], []] };
for (const s of data.series) {
  const actual = s._test.map((r) => r.y), naive = s._test.map((r) => r.x[0]);
  s._lr.forEach((p, i) => {
    worst = Math.max(worst, Math.abs(p - s.holdout["Linear Regression"][i])); points++;
    if (Math.abs(p - s.holdout["Linear Regression"][i]) > 5e-4) { failed++; console.log("FAIL lr", s.state, s.land_type, s._test[i].year, p, s.holdout["Linear Regression"][i]); }
    if (Math.abs(naive[i] - s.holdout["Last year's value"][i]) > 5e-4) { failed++; console.log("FAIL naive", s.state, s.land_type, s._test[i].year); }
  });
  for (const [m, p] of [["Linear Regression", s._lr], ["Random Forest", s.holdout["Random Forest"]], ["Last year's value", naive]]) {
    pooled[m][0].push(...actual); pooled[m][1].push(...p);
  }
}
for (const m of Object.keys(pooled)) {
  const acc = em.accuracy(pooled[m][0], pooled[m][1]);
  if (Number(acc.toFixed(4)) !== data.accuracy[m]) { failed++; console.log("FAIL accuracy", m, acc, data.accuracy[m]); }
}

const tx = data.series.find((s) => s.state === "TX" && s.land_type === "forest");
const pasted = em.parseSeries("year,value\n" + tx.years.map((y, i) => y + "," + tx.values[i]).join("\n"));
if (JSON.stringify(pasted.values) !== JSON.stringify(tx.values) || pasted.bad.length || pasted.gaps.length || !em.ownForecast(pasted.years, pasted.values)) { failed++; console.log("FAIL own series read-back"); }
if (!em.parseSeries("2001,5\n2002,6\n2004,7").gaps.length) { failed++; console.log("FAIL gap not caught"); }

if (failed) { console.log(failed + " check(s) differ from Python"); process.exit(1); }
console.log(`${points} test predictions within ${worst.toExponential(1)} of scikit-learn's linear regression; accuracies ` +
            Object.entries(data.accuracy).map(([m, v]) => `${m} ${v}`).join(", ") + " reproduced; own-series path reads back and rejects gaps");
