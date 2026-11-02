// The Lab's trained-model demos (templates/lab_demos/lm-shapes.html). Models and ONNX Runtime load only when the visitor presses Run;
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
  // The project's threshold path (src/traditional.py preprocess_image, then classify_shape_by_geometry on the largest contour),
  // in OpenCV.js. Returns what Python's ood_check.py geometry() records; with keep, also the image after each step, so the page
  // can show them.
  function geometryOf(cv, rgba, w, h, keep) {
    var src = cv.matFromImageData({ data: rgba, width: w, height: h }), gray = new cv.Mat(), blurred = new cv.Mat();
    var thresh = new cv.Mat(), cleaned = new cv.Mat(), kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3));
    var contours = new cv.MatVector(), hierarchy = new cv.Mat(), steps = null, out;
    try {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
      var level = cv.threshold(blurred, thresh, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU);
      cv.morphologyEx(thresh, cleaned, cv.MORPH_CLOSE, kernel);
      cv.morphologyEx(cleaned, cleaned, cv.MORPH_OPEN, kernel);
      var white = cv.countNonZero(cleaned);
      if (keep) steps = { gray: gray.clone(), blurred: blurred.clone(), thresh: thresh.clone(), cleaned: cleaned.clone(), level: level };
      cv.findContours(cleaned.clone(), contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      out = { label: "unknown", vertices: 0, area: 0, contours: contours.size(), white: white };
      if (contours.size()) {
        var best = 0, bestArea = -1;
        for (var i = 0; i < contours.size(); i++) { var a = cv.contourArea(contours.get(i)); if (a > bestArea) { bestArea = a; best = i; } }
        var c = contours.get(best), g = classify(cv, c);
        out.label = g.label; out.vertices = g.approx.length; out.area = bestArea; out.convexity = g.convexity; out.circularity = g.circularity;
        if (keep) { steps.outline = g.points; steps.approx = g.approx; }
      }
    } finally { [src, gray, blurred, thresh, cleaned, kernel, hierarchy].forEach(function (m) { m.delete(); }); contours.delete(); }
    if (keep) out.steps = steps;
    return out;
  }
  function classify(cv, contour) { // src/traditional.py classify_shape_by_geometry, rule for rule
    var peri = cv.arcLength(contour, true), approx = new cv.Mat(), hull = new cv.Mat();
    try {
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);
      var pts = [], outline = [], n = approx.rows, area = cv.contourArea(contour), shape;
      for (var i = 0; i < n; i++) pts.push([approx.data32S[2 * i], approx.data32S[2 * i + 1]]);
      for (var j = 0; j < contour.rows; j++) outline.push([contour.data32S[2 * j], contour.data32S[2 * j + 1]]);
      var info = { approx: pts, points: outline, convexity: 0, circularity: 0 };
      if (area < 50) { info.label = "unknown"; return info; }
      var r = cv.boundingRect(approx), aspect = r.width / r.height;
      cv.convexHull(contour, hull, false, true);
      var hullArea = cv.contourArea(hull), convexity = hullArea > 0 ? area / hullArea : 0;
      var circularity = peri > 0 ? (4 * Math.PI * area) / (peri * peri) : 0;
      if (n === 3) shape = "triangle";
      else if (n === 4) shape = aspect >= 0.88 && aspect <= 1.12 ? "square" : "rectangle";
      else if (n === 5) shape = convexity < 0.85 ? "star" : "pentagon";
      else if (n === 6) shape = "hexagon";
      else if (n >= 7) shape = convexity < 0.85 || circularity < 0.75 ? "star" : "circle";
      else shape = circularity > 0.82 ? "circle" : convexity < 0.80 ? "star" : "unknown";
      info.label = shape; info.convexity = convexity; info.circularity = circularity;
      return info;
    } finally { approx.delete(); hull.delete(); }
  }

  // Whether to trust an answer, by the checks ood_check.py measured (docs/FINDINGS.md, "What does it do with a shape it was
  // never trained on?"): the CNN at least 90% sure, contour geometry naming the same shape, and one piece in the mask.
  var CONFIDENT = 0.9;
  function judge(probs, geo) {
    var top = probs.indexOf(Math.max.apply(null, probs)), reasons = [];
    if (geo.contours > 1) reasons.push("pieces");
    if (geo.label === "unknown") reasons.push("no-outline");
    if (probs[top] < CONFIDENT) reasons.push("unsure");
    if (geo.label !== "unknown" && geo.label !== CLASSES[top]) reasons.push("disagree");
    return { top: CLASSES[top], trusted: reasons.length === 0, reasons: reasons };
  }

  var api = { CLASSES: CLASSES, SIZE: SIZE, CONFIDENT: CONFIDENT, shapeTensor: shapeTensor, softmax: softmax, geometryOf: geometryOf, judge: judge };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabModels = api;
  if (!document.getElementById("lm-shapes") && !document.getElementById("lm-signs")) return;

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
  api.loadOrt = loadOrt; // shared with lab-signs.js, so ONNX Runtime downloads once


  var CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.11.0-release.1/dist/opencv.js";
  var CV_SRI = "sha384-oavEdO4ZHMHZLyB8LRX8Vmsn9BuESS2RmefVDvsZOcvAlEtuRiiUj4CZGMEL1fPU";
  var cvPromise = null;
  function loadCv() {
    if (cvPromise) return cvPromise;
    cvPromise = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = CV_URL; s.integrity = CV_SRI; s.crossOrigin = "anonymous";
      s.onload = function () {
        var cv = root.cv;
        if (cv instanceof Promise) cv.then(resolve, reject);
        else if (cv.Mat) resolve(cv);
        else cv.onRuntimeInitialized = function () { resolve(cv); };
      };
      s.onerror = function () { cvPromise = null; reject(new Error("OpenCV.js could not be downloaded")); };
      document.head.appendChild(s);
    });
    return cvPromise;
  }
  api.loadCv = loadCv; // shared with lab-signs.js, so OpenCV.js downloads once

  // ------------------------------------------------------------------ shape classifier
  var REASONS = {
    pieces: function (r) { return "The black-and-white mask has " + r.geo.contours + " separate pieces. Every one of the 2,000 test images had exactly one, so this picture is outside what the model was tested on."; },
    "no-outline": function () { return "No outline was big enough to measure (the project ignores anything under 50 pixels at 64 x 64)."; },
    unsure: function (r) { return "The CNN is only " + pct(r.conf) + " sure. It was at least 90% sure on 96.3% of the test shapes."; },
    disagree: function (r) { return "Contour geometry says " + h(r.geo.label) + " (" + r.geo.vertices + " corners); the CNN says " + h(r.top) + ". On test shapes this alone is a weak warning (the geometry rules often miss a corner at 64 x 64, and the CNN was still right 97.8% of the time), but it is the check that catches most shapes the model never saw."; }
  };

  function initShapes() {
    var canvas = $("lm-canvas"), ctx = canvas.getContext("2d"), out = $("lm-out"), runBtn = $("lm-run"), pipe = $("lm-pipeline");
    var small = document.createElement("canvas"); small.width = small.height = SIZE;
    var sctx = small.getContext("2d", { willReadFrequently: true });
    var data = null, geo = null, current = null, session = null, mode = "test", drawn = false, seen = false, upload = null;

    function show(img) { // the 64 x 64 image, enlarged without smoothing so the visitor sees the model's real input
      sctx.clearRect(0, 0, SIZE, SIZE); sctx.drawImage(img, 0, 0, SIZE, SIZE); enlarge();
    }
    function enlarge() {
      ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
    }
    function samples() { return data.samples.concat(geo ? geo.unseen : []); }
    function pick(i) {
      current = samples()[i]; out.innerHTML = ""; pipe.hidden = true;
      document.querySelectorAll("#lm-shapes .lm-thumb").forEach(function (b) { b.setAttribute("aria-selected", String(b.dataset.i === String(i))); });
      var img = new Image();
      img.onload = function () { show(img); };
      img.src = "/lab/data/shapes/" + current.file;
    }
    function thumb(s, i, what) {
      return '<button type="button" role="option" aria-selected="false" class="lm-thumb" data-i="' + i + '" aria-label="' + what + ', a ' + h(s.label) +
        '"><img src="/lab/data/shapes/' + h(s.file) + '" alt="" width="48" height="48" loading="lazy"></button>';
    }
    function thumbs(all) {
      var list = data.samples.map(function (s, i) { return [s, i]; });
      if (!all) list = CLASSES.map(function (c) { return list.filter(function (p) { return p[0].label === c; })[0]; });
      $("lm-thumbs").innerHTML = list.map(function (p) { return thumb(p[0], p[1], "Test shape " + (p[1] + 1)); }).join("");
    }
    function unseenThumbs() {
      var n = data.samples.length;
      $("lm-unseen").innerHTML = geo.unseen.map(function (s, i) { return thumb(s, n + i, "Shape it never saw"); }).join("");
    }
    function blank() { ctx.imageSmoothingEnabled = true; ctx.fillStyle = "rgb(238,238,238)"; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    function clearDrawing() { blank(); drawn = false; seen = false; out.innerHTML = ""; pipe.hidden = true; }
    function setMode(m) {
      mode = m; $("lm-test-pick").hidden = m !== "test"; $("lm-draw-pick").hidden = m !== "draw"; $("lm-upload-pick").hidden = m !== "upload";
      canvas.classList.toggle("lm-drawing", m === "draw"); out.innerHTML = ""; pipe.hidden = true;
      if (m === "draw") clearDrawing();
      else if (m === "upload") { if (upload) show(upload.square); else blank(); }
      else if (current) pick(samples().indexOf(current));
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

    // An uploaded picture is padded to a square with its own edge colour (so a circle stays round, where the project's
    // cv2.resize would squash it), then shrunk to 64 x 64, the only size the model takes. It never leaves the page.
    function readUpload(file) {
      if (!file || !/^image\//.test(file.type)) { out.innerHTML = '<p class="lt-note">Choose an image file (JPEG, PNG, WebP...).</p>'; return; }
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var side = Math.max(img.naturalWidth, img.naturalHeight), lim = Math.min(side, 768), k = lim / side;
        var sq = document.createElement("canvas"); sq.width = sq.height = lim;
        var q = sq.getContext("2d", { willReadFrequently: true }), w = Math.round(img.naturalWidth * k), hh = Math.round(img.naturalHeight * k);
        q.drawImage(img, 0, 0, w, hh);
        var px = q.getImageData(0, 0, w, hh).data, edge = [[], [], []];
        for (var x = 0; x < w; x++) [0, hh - 1].forEach(function (y) { var o = 4 * (y * w + x); for (var c = 0; c < 3; c++) edge[c].push(px[o + c]); });
        for (var y = 0; y < hh; y++) [0, w - 1].forEach(function (xx) { var o = 4 * (y * w + xx); for (var c = 0; c < 3; c++) edge[c].push(px[o + c]); });
        var med = edge.map(function (v) { v.sort(function (a, b) { return a - b; }); return v[v.length >> 1]; });
        q.fillStyle = "rgb(" + med.join(",") + ")"; q.fillRect(0, 0, lim, lim);
        q.drawImage(img, Math.round((lim - w) / 2), Math.round((lim - hh) / 2), w, hh);
        upload = { square: sq, name: file.name, width: img.naturalWidth, height: img.naturalHeight };
        URL.revokeObjectURL(url);
        sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = "high"; show(sq);
        out.innerHTML = '<p class="lt-note">Loaded ' + h(file.name) + " (" + img.naturalWidth + " x " + img.naturalHeight + "). Press <b>Run the model</b>.</p>";
      };
      img.onerror = function () { URL.revokeObjectURL(url); out.innerHTML = '<p class="lt-note">That file could not be read as an image. Try a JPEG or PNG.</p>'; };
      img.src = url;
    }

    // ---- the processing steps, drawn from the images OpenCV.js produced at each step
    function paint(id, cv, mat) { var c = $(id); cv.imshow(c, mat); mat.delete(); return c; }
    function drawSteps(cv, g) {
      var st = g.steps, acc = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#8fc4ad";
      $("lm-step-orig").hidden = mode !== "upload";
      if (mode === "upload") {
        var o = $("lm-c-orig"), oc = o.getContext("2d"); oc.clearRect(0, 0, o.width, o.height); oc.drawImage(upload.square, 0, 0, o.width, o.height);
      }
      var inp = $("lm-c-input"), ic = inp.getContext("2d"); ic.imageSmoothingEnabled = false; ic.drawImage(small, 0, 0, inp.width, inp.height);
      paint("lm-c-gray", cv, st.gray); paint("lm-c-blur", cv, st.blurred); paint("lm-c-thresh", cv, st.thresh); paint("lm-c-clean", cv, st.cleaned);
      $("lm-level").textContent = Math.round(st.level);
      var oc2 = $("lm-c-outline"), x = oc2.getContext("2d"), k = oc2.width / SIZE;
      x.imageSmoothingEnabled = false; x.globalAlpha = 0.35; x.drawImage($("lm-c-clean"), 0, 0, oc2.width, oc2.height); x.globalAlpha = 1;
      if (st.outline) {
        x.lineWidth = 2; x.strokeStyle = acc; x.beginPath();
        st.outline.forEach(function (p, i) { (i ? x.lineTo : x.moveTo).call(x, (p[0] + 0.5) * k, (p[1] + 0.5) * k); }); x.closePath(); x.stroke();
        x.fillStyle = acc; x.strokeStyle = "#1c2421"; x.lineWidth = 1.5;
        st.approx.forEach(function (p) { x.beginPath(); x.arc((p[0] + 0.5) * k, (p[1] + 0.5) * k, 4.5, 0, 2 * Math.PI); x.fill(); x.stroke(); });
      }
      $("lm-corners").textContent = g.contours ? g.vertices + " corners, " + g.contours + (g.contours === 1 ? " piece" : " pieces") : "no outline";
      pipe.hidden = false;
    }

    function bars(probs, order) {
      return '<ul class="lm-bars">' + order.map(function (o) {
        return '<li><span class="lm-name">' + h(CLASSES[o[1]]) + '</span><span class="lm-track"><span class="lm-fill' + (o[1] === order[0][1] ? " lm-top" : "") +
          '" style="width:' + (100 * o[0]).toFixed(2) + '%"></span></span><span class="lm-val">' + pct(o[0]) + "</span></li>";
      }).join("") + "</ul>";
    }
    function result(probs, box, g) {
      var order = probs.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return b[0] - a[0]; });
      var j = judge(probs, g), unseen = mode === "test" && CLASSES.indexOf(current.label) < 0;
      var html = '<p class="lm-verdict">The CNN says <b>' + h(j.top) + "</b>, " + pct(order[0][0]) + " sure.";
      if (mode === "test") html += " " + (j.top === current.label ? '<span class="lt-pill ok">correct</span>'
        : '<span class="lt-pill bad">wrong: it is ' + (/^[aeiou]/.test(current.label) ? "an " : "a ") + h(current.label) + (unseen ? ", not one of its 7 shapes" : "") + "</span>");
      html += "</p>" + bars(probs, order);
      html += '<p class="lm-geo">Contour geometry (no learning, just the outline): <b>' + h(g.label) + "</b>" +
        (g.contours ? ", " + g.vertices + " corners, convexity " + (g.convexity || 0).toFixed(2) + ", circularity " + (g.circularity || 0).toFixed(2) : "") + ".</p>";
      var info = { geo: g, conf: order[0][0], top: j.top };
      html += '<div class="lm-trust ' + (j.trusted ? "ok" : "bad") + '"><p><b>' + (j.trusted ? "Trust check passed." : "Not confirmed: treat this answer with caution.") + "</b></p>";
      if (j.trusted) html += "<p>The CNN is at least 90% sure, the outline's geometry names the same shape and the mask is one piece. Every test-shape answer that passed this was right, but 22.0% of shapes the model never saw pass it too (plus signs and arrows read as stars, some octagons as circles), so a pass is not proof." +
        (unseen && j.top !== current.label ? " This is one of those: the check passed and the answer is still wrong." : "") + "</p>";
      else html += "<ul>" + j.reasons.map(function (r) { return "<li>" + REASONS[r](info) + "</li>"; }).join("") + "</ul>";
      html += "</div>";
      if (mode !== "test" || unseen) html += '<p class="lt-note">The model only knows 7 shapes and has no "none of these" answer, so anything else is forced into the nearest one. A stop sign (an octagon) usually comes out as a hexagon or a circle, often with high confidence.</p>';
      if (mode === "test") {
        var diff = Math.max.apply(null, probs.map(function (p, i) { return Math.abs(p - current.probs[i]); }));
        html += '<p class="lt-note">Python gave this image ' + pct(current.probs[CLASSES.indexOf(j.top)]) + " for " + h(j.top) +
          "; the largest difference from this page across the 7 scores is " + diff.toExponential(1) + ".</p>";
      } else if (mode === "draw") {
        html += '<p class="lt-note">The picture shows your drawing as the model saw it: centred and scaled to the size of the training shapes, at 64 x 64 pixels. Draw again to try another.</p>';
      }
      out.innerHTML = html;
      var x0 = box[0] * canvas.width, y0 = box[1] * canvas.height, x1 = box[2] * canvas.width, y1 = box[3] * canvas.height;
      ctx.lineWidth = 3; ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#8fc4ad";
      ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
    }

    function run() {
      if (mode === "test" && !current) { out.innerHTML = '<p class="lt-note">Pick a test shape first.</p>'; return; }
      if (mode === "draw" && !drawn) { out.innerHTML = '<p class="lt-note">Draw a shape first.</p>'; return; }
      if (mode === "upload" && !upload) { out.innerHTML = '<p class="lt-note">Choose a picture first.</p>'; return; }
      runBtn.disabled = true;
      if (!session) out.innerHTML = '<p class="lt-note">Downloading the model, ONNX Runtime and OpenCV.js...</p>';
      if (mode === "draw") fitDrawing();
      if (mode === "upload") show(upload.square);
      var pixels = sctx.getImageData(0, 0, SIZE, SIZE).data, cv = null;
      Promise.all([loadOrt(), loadCv()]).then(function (got) {
        cv = got[1];
        return session || got[0].InferenceSession.create("/lab/models/shape_detector.onnx", { executionProviders: ["wasm"] }).then(function (s) { session = s; return s; });
      }).then(function (s) {
        var feeds = {}; feeds[data.input] = new root.ort.Tensor("float32", shapeTensor(pixels), [1, 3, SIZE, SIZE]);
        return s.run(feeds);
      }).then(function (res) {
        var g = geometryOf(cv, new Uint8ClampedArray(pixels), SIZE, SIZE, true);
        enlarge(); // show exactly what the model saw, then draw its box on that
        if (mode === "draw") seen = true;
        drawSteps(cv, g);
        result(softmax(Array.from(res.class_logits.data)), Array.from(res.bbox.data), g);
        runBtn.textContent = "Run the model";
      }).catch(function (e) {
        out.innerHTML = '<p class="lt-note">' + h(e.message || "The model could not run") + ". Check your connection and try again.</p>";
      }).then(function () { runBtn.disabled = false; });
    }

    Promise.all([fetch("/lab/data/shapes/samples.json").then(function (r) { return r.json(); }),
                 fetch("/lab/data/shapes/geometry.json").then(function (r) { return r.json(); })]).then(function (d) {
      data = d[0]; geo = d[1]; thumbs(false); unseenThumbs(); pick(0);
    }).catch(function () { out.innerHTML = '<p class="lt-note">The test shapes could not be loaded.</p>'; });
    $("lm-shapes").addEventListener("click", function (e) { var b = e.target.closest(".lm-thumb"); if (b) pick(Number(b.dataset.i)); });
    $("lm-more").addEventListener("click", function () { thumbs(true); this.hidden = true; });
    $("lm-random").addEventListener("click", function () { if (data) pick(Math.floor(Math.random() * data.samples.length)); });
    $("lm-clear").addEventListener("click", clearDrawing);
    $("lm-file").addEventListener("change", function () { readUpload(this.files[0]); });
    document.querySelectorAll('input[name="lm-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    runBtn.addEventListener("click", run);

    // ---- square or rectangle: a short side of 24 px, a long side the visitor sets, turned by an angle. The picture is drawn
    // the way src/dataset.py draws its training shapes (a dark fill on a light background, corners turned with
    // cv2.getRotationMatrix2D and rounded to whole pixels, filled with cv2.fillPoly), then both answers are read for it and for
    // every long side from 24 to 48 px at the same angle.
    var srCanvas = $("lm-sr-canvas"), srOut = $("lm-sr-out"), srBtn = $("lm-sr-run"), srReady = false, srTimer = null;
    var SR_SHORT = 12, SR_LONGS = []; for (var L = 12; L <= 24; L++) SR_LONGS.push(L); // half-sides in pixels
    function srCorners(halfLong, angle) {
      var a = angle * Math.PI / 180, c = Math.cos(a), sn = Math.sin(a), cx = 32, cy = 32;
      return [[-SR_SHORT, -halfLong], [SR_SHORT, -halfLong], [SR_SHORT, halfLong], [-SR_SHORT, halfLong]].map(function (p) {
        var x = cx + p[0], y = cy + p[1];
        return [Math.round(c * x + sn * y + (1 - c) * cx - sn * cy), Math.round(-sn * x + c * y + sn * cx + (1 - c) * cy)];
      });
    }
    function srPixels(cv, halfLong, angle) {
      var m = new cv.Mat(SIZE, SIZE, cv.CV_8UC4, new cv.Scalar(238, 238, 238, 255));
      var pts = cv.matFromArray(4, 1, cv.CV_32SC2, [].concat.apply([], srCorners(halfLong, angle))), v = new cv.MatVector();
      v.push_back(pts);
      cv.fillPoly(m, v, new cv.Scalar(40, 60, 90, 255));
      var px = new Uint8ClampedArray(m.data); m.delete(); pts.delete(); v.delete();
      return px;
    }
    function srMeasure(cv, px) {
      var g = geometryOf(cv, px, SIZE, SIZE, true), out = { label: g.label, corners: g.vertices };
      if (g.steps) ["gray", "blurred", "thresh", "cleaned"].forEach(function (k) { g.steps[k].delete(); });
      if (g.steps && g.steps.approx && g.steps.approx.length === 4) {
        var q = g.steps.approx, xs = q.map(function (p) { return p[0]; }), ys = q.map(function (p) { return p[1]; });
        out.boxW = Math.max.apply(null, xs) - Math.min.apply(null, xs) + 1; out.boxH = Math.max.apply(null, ys) - Math.min.apply(null, ys) + 1;
        out.sides = q.map(function (p, i) { var n = q[(i + 1) % 4]; return Math.hypot(n[0] - p[0], n[1] - p[1]); });
        out.approx = q;
      }
      return out;
    }
    function srProbs(s, px) {
      var feeds = {}; feeds[data.input] = new root.ort.Tensor("float32", shapeTensor(px), [1, 3, SIZE, SIZE]);
      return s.run(feeds).then(function (r) { return softmax(Array.from(r.class_logits.data)); });
    }
    function srSession() {
      return Promise.all([loadOrt(), loadCv()]).then(function (got) {
        var made = session ? Promise.resolve(session) : got[0].InferenceSession.create("/lab/models/shape_detector.onnx", { executionProviders: ["wasm"] })
          .then(function (x) { session = x; return x; });
        return made.then(function (x) { return [x, got[1]]; });
      });
    }
    function srLabels() {
      var long = Number($("lm-sr-long").value);
      $("lm-sr-long-v").textContent = long + " px (" + (long / 24).toFixed(2) + " x 24)";
      $("lm-sr-angle-v").textContent = $("lm-sr-angle").value + "°";
    }
    function srRun() {
      if (!data) return;
      var halfLong = Number($("lm-sr-long").value) / 2, angle = Number($("lm-sr-angle").value);
      srBtn.disabled = true;
      if (!srReady) srOut.innerHTML = '<p class="lt-note">Downloading the model, ONNX Runtime and OpenCV.js...</p>';
      srSession().then(function (got) {
        var s = got[0], cv = got[1], rows = [];
        return SR_LONGS.reduce(function (chain, hl) {
          return chain.then(function () {
            var px = srPixels(cv, hl, angle);
            return srProbs(s, px).then(function (p) { rows.push({ half: hl, ratio: hl / SR_SHORT, p: p, geo: srMeasure(cv, px), px: px }); });
          });
        }, Promise.resolve()).then(function () { srReady = true; srShow(rows, halfLong, angle); });
      }).catch(function (e) {
        srOut.innerHTML = '<p class="lt-note">' + h(e.message || "The model could not run") + ". Check your connection and try again.</p>";
      }).then(function () { srBtn.disabled = false; srBtn.textContent = "Run it again"; });
    }
    function srShow(rows, halfLong, angle) {
      var now = rows.filter(function (r) { return r.half === halfLong; })[0], g = now.geo, sq = now.p[1], re = now.p[3];
      var top = now.p.indexOf(Math.max.apply(null, now.p));
      // the 64 x 64 picture, enlarged, with the 4 corners geometry found and the upright box it measured
      var x = srCanvas.getContext("2d"), k = srCanvas.width / SIZE, t = document.createElement("canvas");
      t.width = t.height = SIZE; t.getContext("2d").putImageData(new ImageData(new Uint8ClampedArray(now.px), SIZE, SIZE), 0, 0);
      x.imageSmoothingEnabled = false; x.clearRect(0, 0, srCanvas.width, srCanvas.height); x.drawImage(t, 0, 0, srCanvas.width, srCanvas.height);
      var acc = getComputedStyle(document.body).getPropertyValue("--accent").trim() || "#8fc4ad";
      if (g.approx) {
        var xs = g.approx.map(function (p) { return p[0]; }), ys = g.approx.map(function (p) { return p[1]; });
        x.setLineDash([5, 4]); x.strokeStyle = "#e0b35a"; x.lineWidth = 2;
        x.strokeRect(Math.min.apply(null, xs) * k, Math.min.apply(null, ys) * k, g.boxW * k, g.boxH * k); x.setLineDash([]);
        x.fillStyle = acc; x.strokeStyle = "#1c2421"; x.lineWidth = 1.5;
        g.approx.forEach(function (p) { x.beginPath(); x.arc((p[0] + 0.5) * k, (p[1] + 0.5) * k, 4.5, 0, 2 * Math.PI); x.fill(); x.stroke(); });
      }
      var html = "<dl><dt>Drawn</dt><dd>24 x " + (2 * halfLong) + " px, long side " + now.ratio.toFixed(2) + " times the short side, turned " + angle + "°</dd>";
      if (g.sides) {
        var sides = g.sides.slice().sort(function (a, b) { return a - b; }), boxRatio = Math.max(g.boxW, g.boxH) / Math.min(g.boxW, g.boxH);
        html += "<dt>Sides found</dt><dd>" + g.sides.map(function (v) { return v.toFixed(1); }).join(", ") + " px (long / short " + ((sides[2] + sides[3]) / (sides[0] + sides[1])).toFixed(2) + ")</dd>";
        html += "<dt>Upright box</dt><dd>" + g.boxW + " x " + g.boxH + " px (dashed), ratio " + boxRatio.toFixed(2) + (boxRatio <= 1.12 ? ", inside 0.88 to 1.12" : ", outside 0.88 to 1.12") + "</dd>";
      } else html += "<dt>Corners found</dt><dd>" + g.corners + " (the rule needs exactly 4)</dd>";
      html += "<dt>Geometry says</dt><dd><b>" + h(g.label) + "</b></dd>";
      html += "<dt>CNN says</dt><dd><b>" + h(CLASSES[top]) + "</b>: square " + pct(sq) + ", rectangle " + pct(re) + "</dd></dl>";
      var expected = now.ratio === 1 ? "square" : "rectangle", notes = [];
      if (g.sides && g.label !== expected && angle % 90 !== 0)
        notes.push("Geometry is wrong here. Turning a shape changes its upright box, not the shape, and the rule measures that box: a long shape turned near 45° has a nearly square box.");
      if (now.ratio > 1 && top === 1) notes.push("The CNN is wrong here: the sides are not equal, but the shape is still closer to the squares it was trained on than to its rectangles.");
      if (now.ratio > 1 && now.ratio < 1.4) notes.push("This stretch is in the gap no training picture covered (1.0 to 1.4), so the CNN's answer here was never tested.");
      else if (now.ratio >= 1.4 && now.ratio <= 1.8) notes.push("This stretch is inside the range of the training rectangles.");
      else if (now.ratio > 1.8) notes.push("This is longer than any training rectangle (they stopped at 1.8).");
      if (top !== 1 && top !== 3) notes.push("The CNN's top answer is neither square nor rectangle here, a sign the picture is far from its training shapes.");
      srOut.innerHTML = html + notes.map(function (n) { return '<p class="lt-note">' + n + "</p>"; }).join("");
      $("lm-sr-chart").innerHTML = srChart(rows, halfLong, angle);
    }
    function srChart(rows, halfLong, angle) {
      var W = 640, H = 236, pl = 64, pr = 14, pt = 22, pb = 70, iw = W - pl - pr, ih = H - pt - pb, b = "";
      var X = function (r) { return pl + (r - 1) * iw; }, Y = function (v) { return pt + (1 - v) * ih; };
      b += '<rect class="sr-band" x="' + X(1.4) + '" y="' + pt + '" width="' + (X(1.8) - X(1.4)) + '" height="' + ih + '"/>';
      b += '<rect class="sr-band" x="' + X(1) + '" y="' + pt + '" width="5" height="' + ih + '"/>';
      [0, 0.5, 1].forEach(function (v) { b += '<line class="ax" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(v) + '" y2="' + Y(v) + '"/><text x="' + (pl - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end">' + (v * 100) + "%</text>"; });
      [1, 1.2, 1.4, 1.6, 1.8, 2].forEach(function (r) { b += '<text x="' + X(r) + '" y="' + (pt + ih + 16) + '" text-anchor="middle">' + r.toFixed(1) + "</text>"; });
      b += '<text x="' + (pl + iw / 2) + '" y="' + (pt + ih + 32) + '" text-anchor="middle">long side / short side</text>';
      b += '<text x="' + ((X(1.4) + X(1.8)) / 2) + '" y="' + (pt - 7) + '" text-anchor="middle">training rectangles</text>';
      b += '<text x="' + X(1) + '" y="' + (pt - 7) + '">training squares</text>';
      b += '<text transform="translate(14 ' + (pt + ih / 2) + ') rotate(-90)" text-anchor="middle">CNN: rectangle</text>';
      b += '<path class="sr-cnn" d="' + rows.map(function (r, i) { return (i ? "L" : "M") + X(r.ratio).toFixed(1) + " " + Y(r.p[3]).toFixed(1); }).join(" ") + '"/>';
      rows.forEach(function (r) {
        var gl = r.geo.label, cls = gl === "square" ? "sr-geo-sq" : gl === "rectangle" ? "sr-geo-rect" : "base";
        b += '<circle class="sr-dot" cx="' + X(r.ratio).toFixed(1) + '" cy="' + Y(r.p[3]).toFixed(1) + '" r="3"/>';
        b += '<rect class="' + cls + '" x="' + (X(r.ratio) - 5).toFixed(1) + '" y="' + (pt + ih + 42) + '" width="10" height="10"><title>' + r.ratio.toFixed(2) + ": geometry says " + h(gl) + "</title></rect>";
        if (r.half === halfLong) b += '<circle class="sr-now" cx="' + X(r.ratio).toFixed(1) + '" cy="' + Y(r.p[3]).toFixed(1) + '" r="7"/>';
      });
      b += '<text x="' + (pl - 12) + '" y="' + (pt + ih + 51) + '" text-anchor="end">geometry</text>';
      var flip = rows.filter(function (r) { return r.p[3] > r.p[1]; })[0];
      var cap = "The line is the CNN's chance of rectangle for every stretch at " + angle + "°; the ring marks the shape above. " +
        (flip ? "It first prefers rectangle at " + flip.ratio.toFixed(2) + (flip.ratio < 1.4 ? ", inside the gap between the training squares and rectangles" : "") + ". " : "") +
        "The small squares under the chart are geometry's answer for each stretch: amber for square, green for rectangle.";
      return '<div class="lt-scroll"><svg class="lt-svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="CNN chance of rectangle for each stretch, with geometry answers below">' + b + "</svg></div>" + '<p class="lt-note">' + cap + "</p>";
    }
    srLabels();
    ["lm-sr-long", "lm-sr-angle"].forEach(function (id) {
      $(id).addEventListener("input", function () { srLabels(); if (srReady) { clearTimeout(srTimer); srTimer = setTimeout(srRun, 150); } });
    });
    srBtn.addEventListener("click", srRun);
  }

  function start() { try { initShapes(); } catch (e) { if (root.console) console.error("lm-shapes", e); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})(typeof window !== "undefined" ? window : this);
