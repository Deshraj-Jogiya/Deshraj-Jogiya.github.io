// Checks the Lab's ASL word-sign demo against Python, in two parts, and fails on any difference:
// 1. lab/lab-signs.js contourFeatures (OpenCV.js) on the 30 frames in tools/fixtures/sign_contour, against the values
//    word_signs/features.py contour_features measured on the same pixels (tolerance 1e-4).
// 2. lab/models/sign_gru.onnx on the 58 held-out clips in lab/data/signs/held_out.json: every top-1 sign must match PyTorch and
//    every probability must be within 1e-4.
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
  if (failed) { console.log(failed + " check(s) differ from Python"); process.exit(1); }
  console.log(`${frames.length} contour frames match Python (largest difference ${worstContour.toExponential(2)}); ` +
              `${data.clips.length} held-out clips match PyTorch (largest probability difference ${worst.toExponential(2)}), ` +
              `${correct}/${data.clips.length} correct`);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
