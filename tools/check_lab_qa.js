// Checks the Lab's member Q&A demo (lab/lab-qa.js) against the project's main.py on its 26 labelled questions
// (lab/data/qa/answers.json, written by export_lab_data.py), with the same 8-bit all-MiniLM-L6-v2 model the page downloads:
// every question must pick the same member and the same top message, and return the same answer, word for word. Similarity
// scores may differ slightly (the browser model is the 8-bit copy); the largest difference is reported.
// npm install --no-save @huggingface/transformers@3.7.6 && [QA_MODEL_DIR=<folder with Xenova/all-MiniLM-L6-v2>] node tools/check_lab_qa.js
const fs = require("fs");
const path = require("path");
const qa = require("../lab/lab-qa.js");

const dir = path.join(__dirname, "..", "lab", "data", "qa");
const data = JSON.parse(fs.readFileSync(path.join(dir, "messages.json"), "utf8"));
const checks = JSON.parse(fs.readFileSync(path.join(dir, "answers.json"), "utf8")).questions;
const buf = fs.readFileSync(path.join(dir, "embeddings.bin"));
const matrix = qa.halfToFloat(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));

(async () => {
  const transformers = require("@huggingface/transformers");
  const embed = await qa.embedder(transformers, process.env.QA_MODEL_DIR); // a folder holding Xenova/all-MiniLM-L6-v2, or the hub
  let failed = 0, worst = 0, labelled = 0;
  for (const c of checks) {
    const subject = qa.findSubject(c.question, data.members);
    const rows = []; data.messages.forEach((m, i) => { if (m[0] === subject) rows.push(i); });
    const [v] = await embed([c.question]);
    const ranked = subject === null ? [] : qa.rank(v, matrix, data.dims, rows);
    const answer = qa.answerFor(c.question, subject, ranked, data.messages);
    if (ranked.length) worst = Math.max(worst, Math.abs(ranked[0][1] - c.top[0][1]));
    if (ranked.length && ranked[0][0] === c.labelled) labelled++;
    if (subject !== c.subject || !ranked.length || ranked[0][0] !== c.top[0][0] || answer !== c.answer) {
      failed++; console.log("FAIL", c.question, "|", subject, c.subject, "|", ranked[0] && ranked[0][0], c.top[0][0], "|", answer, "|", c.answer);
    }
  }
  if (failed) { console.log(failed + " of " + checks.length + " questions differ from main.py"); process.exit(1); }
  console.log(`${checks.length} questions give main.py's member, top message and answer (top similarity within ${worst.toExponential(1)}); ` +
              `${labelled}/${checks.length} top messages are the labelled ones`);
})().catch((e) => { console.error(e); process.exit(1); });
