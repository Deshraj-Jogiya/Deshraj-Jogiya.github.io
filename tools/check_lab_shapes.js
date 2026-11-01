// Runs the Lab's shape preprocessing (lab/lab-models.js shapeTensor) and the same ONNX model on the 63 held-out images in
// lab/data/shapes, and fails unless every top-1 class matches what Python recorded and every probability is within 1e-4.
// npm install --no-save onnxruntime-node@1.20.1 pngjs@7.0.0 && node tools/check_lab_shapes.js
const fs = require("fs");
const path = require("path");
const ort = require("onnxruntime-node");
const { PNG } = require("pngjs");
const lab = require("../lab/lab-models.js");

const dir = path.join(__dirname, "..", "lab", "data", "shapes");
const data = JSON.parse(fs.readFileSync(path.join(dir, "samples.json"), "utf8"));

(async () => {
  const session = await ort.InferenceSession.create(path.join(__dirname, "..", "lab", "models", "shape_detector.onnx"));
  let failed = 0, worst = 0;
  for (const s of data.samples) {
    const png = PNG.sync.read(fs.readFileSync(path.join(dir, s.file)));
    if (png.width !== lab.SIZE || png.height !== lab.SIZE) throw new Error(s.file + " is not 64 x 64");
    const feeds = { [data.input]: new ort.Tensor("float32", lab.shapeTensor(png.data), [1, 3, lab.SIZE, lab.SIZE]) };
    const res = await session.run(feeds);
    const probs = lab.softmax(Array.from(res.class_logits.data));
    const top = lab.CLASSES[probs.indexOf(Math.max(...probs))];
    const diff = Math.max(...probs.map((p, i) => Math.abs(p - s.probs[i])));
    worst = Math.max(worst, diff);
    if (top !== s.predicted || diff > 1e-4) { failed++; console.log("FAIL", s.file, top, s.predicted, diff); }
  }
  const correct = data.samples.filter((s) => s.predicted === s.label).length;
  if (failed) { console.log(failed + " image(s) differ from Python"); process.exit(1); }
  console.log(`${data.samples.length} images match Python (largest probability difference ${worst.toExponential(2)}); ` +
              `${correct}/${data.samples.length} correct`);
})().catch((e) => { console.error(e); process.exit(1); });
