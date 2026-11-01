// Checks the Lab's fraud-rule tester (lab/lab-fraud.js) against etl/fraud_rules.py: at the project's settings and four others
// (lab/data/fraud/rules.json), every rule's alert count and true fraud caught must equal Python's exactly.
// node tools/check_lab_fraud.js
const fs = require("fs");
const path = require("path");
const f = require("../lab/lab-fraud.js");

const dir = path.join(__dirname, "..", "lab", "data", "fraud");
const meta = JSON.parse(fs.readFileSync(path.join(dir, "rules.json"), "utf8"));
const buf = fs.readFileSync(path.join(dir, "transactions.bin"));
const tx = f.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), meta.rows);
let fraud = 0;
for (let i = 0; i < tx.rows; i++) fraud += (tx.flags[i] >> 1) & 1;
let failed = fraud === meta.planted_fraud ? 0 : 1, checks = 1;
if (failed) console.log("FAIL planted fraud", fraud, meta.planted_fraud);
for (const s of meta.settings) {
  const got = f.runRules(tx, s.velocity_count, s.window_minutes, s.spike_multiple, true);
  for (const [rule, want] of Object.entries(s.results)) {
    checks++;
    if (got[rule][0] !== want.alerts || got[rule][1] !== want.true_fraud_caught) {
      failed++; console.log("FAIL", s.velocity_count, s.window_minutes, s.spike_multiple, rule, got[rule], want);
    }
  }
}
if (failed) { console.log(failed + " of " + checks + " checks differ from Python"); process.exit(1); }
console.log(`${checks - 1} rule results over ${meta.settings.length} settings match etl/fraud_rules.py exactly (${meta.rows.toLocaleString("en-US")} transactions)`);
