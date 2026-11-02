// Checks the Lab's ASL word-sign demo against Python, in two parts, and fails on any difference:
// 1. lab/lab-signs.js contourFeatures (OpenCV.js) on the 30 frames in tools/fixtures/sign_contour, against the values
//    word_signs/features.py contour_features measured on the same pixels (tolerance 1e-4).
// 2. lab/models/sign_gru.onnx on the 58 held-out clips in lab/data/signs/held_out.json: every top-1 sign must match PyTorch and
//    every probability must be within 1e-4.
// 3. The practice-mode tracker (Tracker, rankOf, flagAt) on the 12 held-out switch cases in tools/fixtures/sign_track.json,
//    against the per-frame ranks and flag frames tools/build_sign_refs.py recorded: every flag frame must match, and at most 1
//    rank in 100 may differ (sums over 128 values are added in a different order in numpy, which can break an exact tie).
// npm install --no-save onnxruntime-node@1.20.1 pngjs@7.0.0 @techstark/opencv-js@4.11.0-release.1 && node tools/check_lab_signs.js
const fs = require("fs");
const path = require("path");
const ort = require("onnxruntime-node");
const { PNG } = require("pngjs");
const signs = require("../lab/lab-signs.js");

const repo = path.join(__dirname, "..");

async function loadCv() {
  let cv = require("@techstark/opencv-js");
  if (cv instanceof Promise) cv = await cv;
  else if (!cv.Mat) await new Promise((resolve) => { cv.onRuntimeInitialized = resolve; });
  return cv;
}

(async () => {
  let failed = 0;
  const cv = await loadCv();
  const fixDir = path.join(__dirname, "fixtures", "sign_contour");
  const frames = JSON.parse(fs.readFileSync(path.join(fixDir, "contour.json"), "utf8")).frames;
  let worstContour = 0;
  for (const fr of frames) {
    const png = PNG.sync.read(fs.readFileSync(path.join(fixDir, fr.file)));
    const got = signs.contourFeatures(cv, png.data, png.width, png.height, fr.points);
    const diff = Math.max(...got.map((v, i) => Math.abs(v - fr.features[i])));
    worstContour = Math.max(worstContour, diff);
    if (diff > 1e-4) { failed++; console.log("FAIL contour", fr.file, got, fr.features); }
  }

  const data = JSON.parse(fs.readFileSync(path.join(repo, "lab", "data", "signs", "held_out.json"), "utf8"));
  const session = await ort.InferenceSession.create(path.join(repo, "lab", "models", "sign_gru.onnx"));
  let worst = 0, correct = 0;
  for (const clip of data.clips) {
    const x = new Float32Array(clip.features.flat());
    const res = await session.run({ features: new ort.Tensor("float32", x, [1, data.seq_len, data.features_per_frame]) });
    const probs = signs.softmax(Array.from(res.logits.data));
    const top = probs.indexOf(Math.max(...probs)), pyTop = clip.probs.indexOf(Math.max(...clip.probs));
    const diff = Math.max(...probs.map((p, i) => Math.abs(p - clip.probs[i])));
    worst = Math.max(worst, diff);
    if (data.vocabulary[top] === clip.sign) correct++;
    if (top !== pyTop || diff > 1e-4) { failed++; console.log("FAIL clip", clip.sign, data.vocabulary[top], diff); }
  }
  const practice = JSON.parse(fs.readFileSync(path.join(repo, "lab", "data", "signs", "practice.json"), "utf8"));
  const refs = signs.decodeRefs(practice);
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures", "sign_track.json"), "utf8")).cases;
  let rankDiffs = 0, rankTotal = 0;
  for (const c of cases) {
    const frames = data.clips[c.first].features.slice(0, practice.cut).concat(data.clips[c.second].features.slice(practice.cut));
    const tracker = new signs.Tracker(refs, practice.vocabulary.length, practice.window), target = practice.vocabulary.indexOf(c.target);
    const ranks = frames.map((f) => signs.rankOf(tracker.push(signs.matchFeatures(f)), target));
    ranks.forEach((r, i) => { rankTotal++; if (r !== c.ranks[i]) rankDiffs++; });
    const flag = signs.flagAt(ranks, practice.K, practice.N, practice.start);
    if (flag !== c.flag) { failed++; console.log("FAIL tracker flag", c.target, flag, c.flag); }
  }
  if (rankDiffs > rankTotal / 100) { failed++; console.log("FAIL tracker ranks", rankDiffs, "of", rankTotal, "differ"); }
  if (failed) { console.log(failed + " check(s) differ from Python"); process.exit(1); }
  console.log(`${frames.length} contour frames match Python (largest difference ${worstContour.toExponential(2)}); ` +
              `${data.clips.length} held-out clips match PyTorch (largest probability difference ${worst.toExponential(2)}), ` +
              `${correct}/${data.clips.length} correct; tracker: ${cases.length} switch cases flag the same frame, ${rankDiffs}/${rankTotal} ranks differ`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
