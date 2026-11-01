// Checks the Lab's shape demo (lab/lab-models.js) against Python, and fails on any difference:
// 1. shapeTensor and the same ONNX model on the 63 held-out images and the 12 unfamiliar ones in lab/data/shapes: every top-1
//    class must match what Python recorded and every probability must be within 1e-4.
// 2. geometryOf (OpenCV.js) on all 75 images, against the threshold path of src/traditional.py as ood_check.py recorded it in
//    geometry.json: the same shape, corner count, number of pieces and white pixels, and the largest outline's area within 1e-6.
// npm install --no-save onnxruntime-node@1.20.1 pngjs@7.0.0 @techstark/opencv-js@4.11.0-release.1 && node tools/check_lab_shapes.js
const fs = require("fs");
const path = require("path");
const ort = require("onnxruntime-node");
const { PNG } = require("pngjs");
const lab = require("../lab/lab-models.js");

const dir = path.join(__dirname, "..", "lab", "data", "shapes");
const data = JSON.parse(fs.readFileSync(path.join(dir, "samples.json"), "utf8"));
const geo = JSON.parse(fs.readFileSync(path.join(dir, "geometry.json"), "utf8"));

async function loadCv() {
  let cv = require("@techstark/opencv-js");
  if (cv instanceof Promise) cv = await cv;
  else if (!cv.Mat) await new Promise((resolve) => { cv.onRuntimeInitialized = resolve; });
  return cv;
}
const read = (file) => {
  const png = PNG.sync.read(fs.readFileSync(path.join(dir, file)));
  if (png.width !== lab.SIZE || png.height !== lab.SIZE) throw new Error(file + " is not 64 x 64");
  return png;
};

(async () => {
  const session = await ort.InferenceSession.create(path.join(__dirname, "..", "lab", "models", "shape_detector.onnx"));
  let failed = 0, worst = 0;
  const scored = data.samples.concat(geo.unseen);
  for (const s of scored) {
    const res = await session.run({ [data.input]: new ort.Tensor("float32", lab.shapeTensor(read(s.file).data), [1, 3, lab.SIZE, lab.SIZE]) });
    const probs = lab.softmax(Array.from(res.class_logits.data));
    const top = lab.CLASSES[probs.indexOf(Math.max(...probs))];
    const diff = Math.max(...probs.map((p, i) => Math.abs(p - s.probs[i])));
    worst = Math.max(worst, diff);
    if (top !== s.predicted || diff > 1e-4) { failed++; console.log("FAIL model", s.file, top, s.predicted, diff); }
  }
  const cv = await loadCv();
  const shapes = geo.held_out.concat(geo.unseen);
  for (const s of shapes) {
    const want = s.geometry, png = read(s.file);
    const got = lab.geometryOf(cv, new Uint8ClampedArray(png.data), png.width, png.height, false);
    if (got.label !== want.label || got.vertices !== want.vertices || got.contours !== want.contours || got.white !== want.white ||
        Math.abs(got.area - want.area) > 1e-6) { failed++; console.log("FAIL geometry", s.file, got, want); }
  }
  const correct = data.samples.filter((s) => s.predicted === s.label).length;
  if (failed) { console.log(failed + " check(s) differ from Python"); process.exit(1); }
  console.log(`${scored.length} images match Python's model scores (largest probability difference ${worst.toExponential(2)}; ` +
              `${correct}/${data.samples.length} held-out correct) and ${shapes.length} match its threshold-path geometry exactly`);
})().catch((e) => { console.error(e); process.exit(1); });
