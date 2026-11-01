// The Lab's trained-model demos (templates/_lab_models.html). Models and ONNX Runtime load only when the visitor presses Run;
// images never leave the page. shapeTensor() is shared with tools/check_lab_shapes.js, which runs it in CI against the
// probabilities Python recorded for the same images.
(function (root) {
  "use strict";
  var CLASSES = ["circle", "square", "triangle", "rectangle", "pentagon", "hexagon", "star"];
  var SIZE = 64;
  var ORT_URL = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/";
  var ORT_SRI = "sha384-6hgW9I+eQKl5CrHLstudPd4L3E2eTYHm+qNKvf4pI+RZnfBJILOHAiaalHV+trgG";

  // RGBA pixels of a 64 x 64 image -> the model's input: RGB scaled to [0, 1], channels first (as src/inference.py does).
  function shapeTensor(rgba) {
    var n = SIZE * SIZE, out = new Float32Array(3 * n);
    for (var i = 0; i < n; i++) {
      out[i] = rgba[4 * i] / 255;
      out[n + i] = rgba[4 * i + 1] / 255;
      out[2 * n + i] = rgba[4 * i + 2] / 255;
    }
    return out;
  }
  function softmax(logits) {
    var m = Math.max.apply(null, logits), e = logits.map(function (v) { return Math.exp(v - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }
  var api = { CLASSES: CLASSES, SIZE: SIZE, shapeTensor: shapeTensor, softmax: softmax };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabModels = api;
  if (!document.getElementById("model-demos")) return;

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct(p) { return (100 * p).toFixed(p >= 0.9995 || p < 0.0005 ? 1 : 2) + "%"; }

  var ortPromise = null;
  function loadOrt() {
    if (ortPromise) return ortPromise;
    ortPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = ORT_URL + "ort.wasm.min.js"; s.integrity = ORT_SRI; s.crossOrigin = "anonymous";
      s.onload = function () {
        root.ort.env.wasm.wasmPaths = ORT_URL;
        root.ort.env.wasm.numThreads = 1; // GitHub Pages can't send the headers multi-threading needs
        resolve(root.ort);
      };
      s.onerror = function () { ortPromise = null; reject(new Error("ONNX Runtime could not be downloaded")); };
      document.head.appendChild(s);
    });
    return ortPromise;
  }

  // ------------------------------------------------------------------ shape classifier
  function initShapes() {
    var canvas = $("lm-canvas"), ctx = canvas.getContext("2d"), out = $("lm-out"), runBtn = $("lm-run");
    var small = document.createElement("canvas"); small.width = small.height = SIZE;
    var sctx = small.getContext("2d", { willReadFrequently: true });
    var data = null, current = null, session = null, mode = "test", drawn = false, seen = false;

    function show(img) { // the 64 x 64 image, enlarged without smoothing so the visitor sees the model's real input
      sctx.clearRect(0, 0, SIZE, SIZE); sctx.drawImage(img, 0, 0, SIZE, SIZE); enlarge();
    }
    function enlarge() {
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    }
    function pick(i) {
      current = data.samples[i]; out.innerHTML = "";
      Array.prototype.forEach.call($("lm-thumbs").children, function (b) { b.setAttribute("aria-selected", String(b.dataset.i === String(i))); });
      var img = new Image();
      img.onload = function () { show(img); };
      img.src = "/lab/data/shapes/" + current.file;
    }
    function thumbs(all) {
      var list = data.samples.map(function (s, i) { return [s, i]; });
      if (!all) list = CLASSES.map(function (c) { return list.filter(function (p) { return p[0].label === c; })[0]; });
      $("lm-thumbs").innerHTML = list.map(function (p) {
        return '<button type="button" role="option" aria-selected="false" class="lm-thumb" data-i="' + p[1] + '" aria-label="Test shape ' +
          (p[1] + 1) + ', a ' + h(p[0].label) + '"><img src="/lab/data/shapes/' + h(p[0].file) + '" alt="" width="48" height="48" loading="lazy"></button>';
      }).join("");
    }
    function clearDrawing() {
      ctx.imageSmoothingEnabled = true; ctx.fillStyle = "rgb(238,238,238)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawn = false; seen = false; out.innerHTML = "";
    }
    function setMode(m) {
      mode = m; $("lm-test-pick").hidden = m !== "test"; $("lm-draw-pick").hidden = m !== "draw";
      canvas.classList.toggle("lm-drawing", m === "draw");
      if (m === "draw") clearDrawing(); else if (current) pick(data.samples.indexOf(current));
    }

    // drawing: pointer events cover mouse, pen and touch
    var down = false;
    function pos(e) { var r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * canvas.width / r.width, (e.clientY - r.top) * canvas.height / r.height]; }
    canvas.addEventListener("pointerdown", function (e) {
      if (mode !== "draw") return; if (seen) clearDrawing(); down = true; drawn = true; canvas.setPointerCapture(e.pointerId);
      var p = pos(e); ctx.beginPath(); ctx.moveTo(p[0], p[1]); e.preventDefault();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!down) return; var p = pos(e);
      ctx.lineTo(p[0], p[1]); ctx.strokeStyle = "rgb(40,60,90)"; ctx.lineWidth = 22; ctx.lineCap = ctx.lineJoin = "round"; ctx.stroke();
    });
    ["pointerup", "pointercancel"].forEach(function (t) { canvas.addEventListener(t, function () {
      if (!down) return; down = false; ctx.closePath(); ctx.fillStyle = "rgb(40,60,90)"; ctx.fill(); // fill the outline, like the training shapes
    }); });

    // Training shapes sit near the centre and span about half the 64-pixel frame. A drawing is centred and scaled to that size
    // first, so the model judges the shape, not how large it was drawn.
    var FILL = 0.5;
    function fitDrawing() {
      var w = canvas.width, px = ctx.getImageData(0, 0, w, w).data, x0 = w, y0 = w, x1 = -1, y1 = -1;
      for (var y = 0; y < w; y++) for (var x = 0; x < w; x++) if (px[4 * (y * w + x)] < 150) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      sctx.fillStyle = "rgb(238,238,238)"; sctx.fillRect(0, 0, SIZE, SIZE); sctx.imageSmoothingEnabled = true;
      if (x1 < 0) return;
      var side = Math.max(x1 - x0, y1 - y0) + 1, scale = FILL * SIZE / side, dw = (x1 - x0 + 1) * scale, dh = (y1 - y0 + 1) * scale;
      sctx.drawImage(canvas, x0, y0, x1 - x0 + 1, y1 - y0 + 1, (SIZE - dw) / 2, (SIZE - dh) / 2, dw, dh);
    }

    function result(probs, box) {
      var order = probs.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return b[0] - a[0]; });
      var top = CLASSES[order[0][1]], html = '<p class="lm-verdict">The model says <b>' + h(top) + "</b>, " + pct(order[0][0]) + " sure.";
      if (mode === "test") html += " " + (top === current.label ? '<span class="lt-pill ok">correct</span>' : '<span class="lt-pill bad">wrong: it is a ' + h(current.label) + "</span>");
      html += "</p><ul class=\"lm-bars\">" + order.map(function (o) {
        return '<li><span class="lm-name">' + h(CLASSES[o[1]]) + '</span><span class="lm-track"><span class="lm-fill' + (o[1] === order[0][1] ? " lm-top" : "") +
          '" style="width:' + (100 * o[0]).toFixed(2) + '%"></span></span><span class="lm-val">' + pct(o[0]) + "</span></li>";
      }).join("") + "</ul>";
      if (mode === "test") {
        var diff = Math.max.apply(null, probs.map(function (p, i) { return Math.abs(p - current.probs[i]); }));
        html += '<p class="lt-note">Python gave this image ' + pct(current.probs[CLASSES.indexOf(top)]) + " for " + h(top) +
          "; the largest difference from this page across the 7 scores is " + diff.toExponential(1) + ".</p>";
      } else {
        html += '<p class="lt-note">The picture now shows your drawing as the model saw it: centred and scaled to the size of the training shapes, at 64 x 64 pixels. Draw again to try another.</p>';
      }
      out.innerHTML = html;
      var x0 = box[0] * canvas.width, y0 = box[1] * canvas.height, x1 = box[2] * canvas.width, y1 = box[3] * canvas.height;
      ctx.lineWidth = 3; ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#8fc4ad";
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }

    function run() {
      if (mode === "test" && !current) { out.innerHTML = '<p class="lt-note">Pick a test shape first.</p>'; return; }
      if (mode === "draw" && !drawn) { out.innerHTML = '<p class="lt-note">Draw a shape first.</p>'; return; }
      runBtn.disabled = true;
      if (!session) out.innerHTML = '<p class="lt-note">Downloading the model and ONNX Runtime...</p>';
      if (mode === "draw") fitDrawing();
      var pixels = sctx.getImageData(0, 0, SIZE, SIZE).data;
      loadOrt().then(function (ort) {
        return session || ort.InferenceSession.create("/lab/models/shape_detector.onnx", { executionProviders: ["wasm"] }).then(function (s) { session = s; return s; });
      }).then(function (s) {
        var feeds = {}; feeds[data.input] = new root.ort.Tensor("float32", shapeTensor(pixels), [1, 3, SIZE, SIZE]);
        return s.run(feeds);
      }).then(function (res) {
        enlarge(); // show exactly what the model saw, then draw its box on that
        if (mode === "draw") seen = true;
        result(softmax(Array.from(res.class_logits.data)), Array.from(res.bbox.data));
        runBtn.textContent = "Run the model";
      }).catch(function (e) {
        out.innerHTML = '<p class="lt-note">' + h(e.message || "The model could not run") + ". Check your connection and try again.</p>";
      }).then(function () { runBtn.disabled = false; });
    }

    fetch("/lab/data/shapes/samples.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d; thumbs(false); pick(0);
    }).catch(function () { out.innerHTML = '<p class="lt-note">The test shapes could not be loaded.</p>'; });
    $("lm-thumbs").addEventListener("click", function (e) { var b = e.target.closest(".lm-thumb"); if (b) pick(Number(b.dataset.i)); });
    $("lm-more").addEventListener("click", function () { thumbs(true); this.hidden = true; });
    $("lm-random").addEventListener("click", function () { if (data) pick(Math.floor(Math.random() * data.samples.length)); });
    $("lm-clear").addEventListener("click", clearDrawing);
    document.querySelectorAll('input[name="lm-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    runBtn.addEventListener("click", run);
  }

  function start() { try { initShapes(); } catch (e) { if (root.console) console.error("lm-shapes", e); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})(typeof window !== "undefined" ? window : this);
