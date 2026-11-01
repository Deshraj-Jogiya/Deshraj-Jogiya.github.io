// Checks the Lab's RFM explorer (lab/lab-rfm.js) against the Sales-Customer-Segmentation-Pipeline project's Python
// (export_lab_data.py), and fails on any difference:
// 1. RFM from raw rows: the 60 customers in lab/data/rfm/sample_transactions.csv must get pandas' recency and frequency exactly
//    and its monetary value within a cent.
// 2. K-Means on the 2,000 customers: for every k from 2 to 8, the browser's variance explained must be within 0.001 of
//    scikit-learn's (KMeans, random_state=42, n_init=10), and at k = 4 (the project's choice, 93.9% in FINDINGS) every segment
//    must get the same name and a size within 6 customers of Python's. (K-Means stops at a local optimum; the browser's seeded
//    restarts reach one where a few boundary customers sit in the next cluster: 93.900% vs 93.901% of variance explained.)
// node tools/check_lab_rfm.js
const fs = require("fs");
const path = require("path");
const rfm = require("../lab/lab-rfm.js");

const dir = path.join(__dirname, "..", "lab", "data", "rfm");
let failed = 0, worst = 0;

const sample = rfm.parseRows(fs.readFileSync(path.join(dir, "sample_transactions.csv"), "utf8"));
const want = JSON.parse(fs.readFileSync(path.join(dir, "sample_rfm.json"), "utf8"));
const got = rfm.rfmFromRows(sample.rows);
if (sample.bad.length || got.ids.length !== Object.keys(want).length) { failed++; console.log("FAIL sample rows", sample.bad.length, got.ids.length); }
got.ids.forEach((id, i) => {
  const w = want[id], g = got.rfm[i];
  if (!w || g[0] !== w[0] || g[1] !== w[1] || Math.abs(g[2] - w[2]) > 0.01) { failed++; console.log("FAIL rfm", id, g, w); }
});

const data = JSON.parse(fs.readFileSync(path.join(dir, "rfm.json"), "utf8"));
const X = rfm.standardise(data.customers), tss = rfm.totalSS(X);
for (const py of data.kmeans) {
  const run = rfm.kmeans(X, py.k, 10, 42), ve = 1 - run.inertia / tss;
  worst = Math.max(worst, Math.abs(ve - py.variance_explained));
  if (Math.abs(ve - py.variance_explained) > 1e-3) { failed++; console.log("FAIL k", py.k, ve, py.variance_explained); }
  if (py.k === 4) {
    const sizes = [0, 0, 0, 0], sums = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    run.labels.forEach((l, i) => { sizes[l]++; for (let j = 0; j < 3; j++) sums[l][j] += data.customers[i][j]; });
    const names = rfm.segmentNames(sums.map((s, c) => s.map((v) => v / sizes[c])));
    const order = sizes.map((n, c) => c).sort((a, b) => sizes[a] - sizes[b]);
    const expected = ["At Risk / Hibernating", "VIP Champions", "New Customers", "Loyal Customers"]; // FINDINGS, smallest first
    if (!names || order.some((c, i) => Math.abs(sizes[c] - py.sizes[i]) > 6 || names[c] !== expected[i])) {
      failed++; console.log("FAIL k=4 segments", sizes, names);
    }
  }
}
if (failed) { console.log(failed + " check(s) differ from Python"); process.exit(1); }
console.log(`${got.ids.length} customers' RFM match pandas; variance explained for k = 2-8 within ${worst.toExponential(1)} of scikit-learn, ` +
            "and k = 4 gives FINDINGS' four segments within 6 customers of 159 / 400 / 504 / 937");
