// Checks the Lab's post checker (lab/lab-posts.js) against CurioSync's writing_problems on lab/data/posts.json (published and
// queued posts plus test drafts, written by curiosync's scripts/export_lab_posts.py): every draft must get the same problems, in
// the same order, word for word.
// node tools/check_lab_posts.js
const fs = require("fs");
const path = require("path");
const posts = require("../lab/lab-posts.js");

const data = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "lab", "data", "posts.json"), "utf8"));
let failed = 0, problems = 0;
data.drafts.forEach((d, i) => {
  const got = posts.writingProblems(d.text, "");
  problems += d.python.length;
  if (JSON.stringify(got) !== JSON.stringify(d.python)) {
    failed++;
    console.log("FAIL draft " + i);
    console.log("  browser:", JSON.stringify(got));
    console.log("  python: ", JSON.stringify(d.python));
  }
});
if (failed) { console.log(failed + " of " + data.drafts.length + " drafts differ from Python"); process.exit(1); }
console.log(`${data.drafts.length} drafts give the same ${problems} problems as CurioSync's writing_problems, in the same order`);
