// The Lab's ASL word-sign demo (templates/lab_demos/lm-signs.html). It runs the project's own pipeline in the browser:
// MediaPipe's hand landmarker for 21 points per hand, OpenCV.js for the hand-shape contour values (a port of
// word_signs/features.py contour_features), and the trained SignGRU as ONNX. Everything downloads only when the visitor asks;
// camera frames never leave the page. The feature functions are shared with tools/check_lab_signs.js, which checks them in CI
// against the values Python recorded.
(function (root) {
  "use strict";
  var SEQ_LEN = 32, LANDMARKS = 21, CONTOUR = 6, PER_HAND = LANDMARKS * 3 + 1 + CONTOUR, PER_FRAME = 2 * PER_HAND;

  // (21 x {x, y, z}) -> relative to the wrist (point 0), scaled by the wrist-to-middle-knuckle (point 9) distance in x, y.
  // Math.fround keeps each step in float32, as numpy does with MediaPipe's float32 points.
  function normaliseLandmarks(points) {
    var f = Math.fround, w = points[0], rel = points.map(function (p) { return [f(f(p.x) - f(w.x)), f(f(p.y) - f(w.y)), f(f(p.z) - f(w.z))]; });
    var scale = f(Math.sqrt(f(f(rel[9][0] * rel[9][0]) + f(rel[9][1] * rel[9][1]))));
    var out = [];
    rel.forEach(function (r) { r.forEach(function (v) { out.push(scale > 1e-6 ? f(v / scale) : v); }); });
    return out;
  }

  // Shape of the hand's largest contour inside the points' bounding box, padded 20% (word_signs/features.py contour_features).
  // rgba: the frame's pixels (RGBA, width x height); points: [[x, y], ...] in 0-1 image coordinates.
  function contourFeatures(cv, rgba, width, height, points) {
    var f = Math.fround, xs = points.map(function (p) { return f(f(p[0]) * width); }), ys = points.map(function (p) { return f(f(p[1]) * height); });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs), minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var padX = f(0.2 * f(f(maxX - minX) + 1)), padY = f(0.2 * f(f(maxY - minY) + 1));
    var x0 = Math.floor(Math.max(f(minX - padX), 0)), x1 = Math.floor(Math.min(f(maxX + padX), width));
    var y0 = Math.floor(Math.max(f(minY - padY), 0)), y1 = Math.floor(Math.min(f(maxY + padY), height));
    var zeros = [0, 0, 0, 0, 0, 0];
    if (x1 - x0 < 4 || y1 - y0 < 4) return zeros;
    var mats = [], keep = function (m) { mats.push(m); return m; };
    try {
      var frame = keep(new cv.Mat(height, width, cv.CV_8UC4));
      frame.data.set(rgba);
      var crop = keep(frame.roi(new cv.Rect(x0, y0, x1 - x0, y1 - y0)));
      var gray = keep(new cv.Mat()), blur = keep(new cv.Mat()), mask = keep(new cv.Mat());
      cv.cvtColor(crop, gray, cv.COLOR_RGBA2GRAY);
      cv.GaussianBlur(gray, blur, new cv.Size(5, 5), 0);
      cv.threshold(blur, mask, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU);
      // keep the side of the threshold that holds the hand: the one containing the crop's centre
      if (mask.ucharAt(Math.floor(mask.rows / 2), Math.floor(mask.cols / 2)) === 0) cv.bitwise_not(mask, mask);
      var contours = keep(new cv.MatVector()), hierarchy = keep(new cv.Mat());
      cv.findContours(mask, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
      var n = contours.size();
      if (!n) return zeros;
      var best = -1, area = -1;
      for (var i = 0; i < n; i++) { var a = cv.contourArea(contours.get(i)); if (a > area) { area = a; best = i; } }
      var c = keep(contours.get(best)), hull = keep(new cv.Mat());
      cv.convexHull(c, hull, false, true);
      var hullArea = cv.contourArea(hull), rect = cv.boundingRect(c), perimeter = cv.arcLength(c, true), defects = 0;
      if (c.rows > 3) {
        var hullIdx = keep(new cv.Mat());
        cv.convexHull(c, hullIdx, false, false);
        if (hullIdx.rows > 3) {
          try {
            var d = keep(new cv.Mat());
            cv.convexityDefects(c, hullIdx, d);
            var limit = 256 * 0.1 * Math.max(rect.width, rect.height);
            for (var j = 0; j < d.rows; j++) if (d.intAt(j, 3) > limit) defects++;
          } catch (e) { defects = 0; }
        }
      }
      return [area / (mask.rows * mask.cols), hullArea > 0 ? area / hullArea : 0, rect.height > 0 ? rect.width / rect.height : 0,
              perimeter > 0 ? 4 * Math.PI * area / (perimeter * perimeter) : 0, Math.min(defects, 5) / 5, n / 10]
        .map(function (v) { return f(v); });
    } finally {
      mats.forEach(function (m) { m.delete(); });
    }
  }

  // One frame's 140 values from a MediaPipe HandLandmarker result; a missing hand stays zero with presence 0.
  function frameFeatures(cv, rgba, width, height, result) {
    var out = new Float32Array(PER_FRAME);
    (result.landmarks || []).forEach(function (points, k) {
      var slot = result.handedness[k][0].categoryName === "Right" ? 0 : 1, start = slot * PER_HAND;
      out.set(normaliseLandmarks(points), start);
      out[start + LANDMARKS * 3] = 1;
      out.set(contourFeatures(cv, rgba, width, height, points.map(function (p) { return [p.x, p.y]; })), start + LANDMARKS * 3 + 1);
    });
    return out;
  }

  // Pick SEQ_LEN evenly spaced frames (repeating frames for short recordings), rounding like numpy (half to even).
  function resample(frames) {
    var out = new Float32Array(SEQ_LEN * PER_FRAME);
    if (!frames.length) return out;
    for (var i = 0; i < SEQ_LEN; i++) {
      var t = (frames.length - 1) * i / (SEQ_LEN - 1), r = Math.round(t);
      if (Math.abs(t - Math.floor(t) - 0.5) < 1e-9 && r % 2) r -= 1;
      out.set(frames[r], i * PER_FRAME);
    }
    return out;
  }

  function softmax(logits) {
    var m = Math.max.apply(null, logits), e = logits.map(function (v) { return Math.exp(v - m); });
    var s = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (v) { return v / s; });
  }

  // ---- practice mode: is the attempt still on track? (tools/build_sign_refs.py builds the references and measures the rule)
  // One frame's 140 model values -> the 128 values matched against the training clips: each hand's 63 landmark values times
  // its presence, then its presence times 3; stored as whole thousandths (rounded half to even, like numpy).
  function matchFeatures(frame, offset) {
    var out = new Float64Array(128), o = offset || 0;
    for (var slot = 0; slot < 2; slot++) {
      var s = o + slot * PER_HAND, pres = frame[s + 63], d = slot * 64;
      for (var i = 0; i < 63; i++) out[d + i] = q3(frame[s + i] * pres);
      out[d + 63] = q3(pres * 3);
    }
    return out;
  }
  function q3(v) {
    var t = v * 1000, r = Math.round(t);
    if (Math.abs(t - Math.floor(t) - 0.5) < 1e-9 && r % 2) r -= 1;
    return r / 1000;
  }
  // refs: [{sign: index, frames: [Float64Array(128) x 32]}]. push(frame) takes one user frame (128 values) and returns, per sign,
  // the average distance over the last `window` frames to its best-matching training clip, using open-end dynamic time warping:
  // the frames so far are matched to the start of each clip, so a slower or faster signer still lines up.
  function Tracker(refs, nSigns, window) {
    this.refs = refs.map(function (r) { var n = r.frames.length; return { sign: r.sign, frames: r.frames, D: new Float64Array(n), L: new Float64Array(n), locs: [], pos: 0 }; });
    this.nSigns = nSigns; this.window = window; this.t = 0;
  }
  Tracker.prototype.push = function (u) {
    var scores = new Float64Array(this.nSigns).fill(Infinity), first = this.t === 0, w = this.window;
    this.refs.forEach(function (r) {
      var n = r.frames.length, C = new Float64Array(n), D = r.D, L = r.L, j;
      for (j = 0; j < n; j++) {
        var f = r.frames[j], s = 0;
        for (var k = 0; k < u.length; k++) { var d = u[k] - f[k]; s += d * d; }
        C[j] = Math.sqrt(s / u.length);
      }
      if (first) {
        D[0] = C[0]; L[0] = 1;
        for (j = 1; j < n; j++) { D[j] = D[j - 1] + C[j]; L[j] = L[j - 1] + 1; }
      } else {
        var nD = new Float64Array(n), nL = new Float64Array(n);
        for (j = 0; j < n; j++) {
          var bd = D[j], bl = L[j];
          if (j) {
            if (D[j - 1] / L[j - 1] < bd / bl) { bd = D[j - 1]; bl = L[j - 1]; }
            if (nD[j - 1] / nL[j - 1] < bd / bl) { bd = nD[j - 1]; bl = nL[j - 1]; }
          }
          nD[j] = bd + C[j]; nL[j] = bl + 1;
        }
        r.D = D = nD; r.L = L = nL;
      }
      var best = 0;
      for (j = 1; j < n; j++) if (D[j] / L[j] < D[best] / L[best]) best = j;
      r.pos = best; r.locs.push(C[best]);
      var from = Math.max(0, r.locs.length - w), sum = 0;
      for (j = from; j < r.locs.length; j++) sum += r.locs[j];
      r.score = sum / (r.locs.length - from);
      if (r.score < scores[r.sign]) scores[r.sign] = r.score;
    });
    this.t++;
    return scores;
  };
  // the training clip of `sign` matching best right now, and the frame of it the attempt has reached
  Tracker.prototype.closest = function (sign) {
    var best = null;
    this.refs.forEach(function (r) { if (r.sign === sign && (!best || r.score < best.score)) best = r; });
    return best;
  };
  function rankOf(scores, target) { var n = 0; for (var c = 0; c < scores.length; c++) if (scores[c] < scores[target]) n++; return n; }
  // the frame where the attempt went wrong: the first of N frames in a row with the sign outside the K closest (none before `start`)
  function flagAt(ranks, K, N, start) {
    var run = 0;
    for (var t = start; t < ranks.length; t++) { run = ranks[t] >= K ? run + 1 : 0; if (run >= N) return t - N + 1; }
    return null;
  }
  function decodeRefs(practice) {
    var dims = practice.dims, frames = practice.frames;
    return practice.refs.map(function (r) {
      var bin = atobBytes(r.q), v = new Int16Array(bin.buffer, bin.byteOffset, frames * dims), fr = [];
      for (var f = 0; f < frames; f++) { var a = new Float64Array(dims); for (var k = 0; k < dims; k++) a[k] = v[f * dims + k] / practice.scale; fr.push(a); }
      return { sign: practice.vocabulary.indexOf(r.sign), frames: fr, typical: r.typical };
    });
  }
  function atobBytes(b64) {
    if (typeof Buffer !== "undefined" && typeof atob === "undefined") { var b = Buffer.from(b64, "base64"); return new Uint8Array(b.buffer, b.byteOffset, b.length).slice(); }
    var s = atob(b64), out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  var api = { SEQ_LEN: SEQ_LEN, PER_HAND: PER_HAND, PER_FRAME: PER_FRAME, normaliseLandmarks: normaliseLandmarks,
              contourFeatures: contourFeatures, frameFeatures: frameFeatures, resample: resample, softmax: softmax,
              matchFeatures: matchFeatures, Tracker: Tracker, rankOf: rankOf, flagAt: flagAt, decodeRefs: decodeRefs };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabSigns = api;
  if (!document.getElementById("lm-signs")) return;

  var CV_URL = "https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.11.0-release.1/dist/opencv.js";
  var CV_SRI = "sha384-oavEdO4ZHMHZLyB8LRX8Vmsn9BuESS2RmefVDvsZOcvAlEtuRiiUj4CZGMEL1fPU";
  var MP_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/"; // the version word_signs ran in Python (1.1.1)
  var FPS = 15, FRAMES = 30, MAX_SIDE = 480; // what the project's own webcam page records: two seconds at 15 frames a second
  var LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14],
               [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct(p) { return (100 * p).toFixed(p >= 0.9995 || p < 0.0005 ? 1 : 2) + "%"; }
  function css(name, fallback) { return getComputedStyle(document.body).getPropertyValue(name).trim() || fallback; }
  var reduced = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function loadScript(src, sri) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; if (sri) { s.integrity = sri; s.crossOrigin = "anonymous"; }
      s.onload = resolve; s.onerror = function () { reject(new Error("A file the camera mode needs could not be downloaded")); };
      document.head.appendChild(s);
    });
  }
  var cvPromise = null, handsPromise = null;
  function loadCv() {
    if (root.LabModels && root.LabModels.loadCv) return root.LabModels.loadCv(); // the shape demo's loader: one download for both
    if (!cvPromise) cvPromise = loadScript(CV_URL, CV_SRI).then(function () {
      var cv = root.cv;
      if (cv instanceof Promise) return cv;
      return cv.Mat ? cv : new Promise(function (resolve) { cv.onRuntimeInitialized = function () { resolve(cv); }; });
    }).catch(function (e) { cvPromise = null; throw e; });
    return cvPromise;
  }
  function loadHands() {
    if (!handsPromise) handsPromise = import(MP_URL + "vision_bundle.mjs").then(function (V) {
      return V.FilesetResolver.forVisionTasks(MP_URL + "wasm").then(function (files) {
        return V.HandLandmarker.createFromOptions(files, { baseOptions: { modelAssetPath: "/lab/models/hand_landmarker.task" },
                                                           runningMode: "VIDEO", numHands: 2 });
      });
    }).catch(function (e) { handsPromise = null; throw new Error("MediaPipe's hand model could not be loaded (" + (e.message || e) + ")"); });
    return handsPromise;
  }

  function initSigns() {
    var canvas = $("ls-canvas"), ctx = canvas.getContext("2d"), refCanvas = $("ls-ref"), refCtx = refCanvas.getContext("2d");
    var out = $("ls-out"), runBtn = $("ls-run"), video = $("ls-video"), statusEl = $("ls-status"), nowEl = $("ls-now"), timeline = $("ls-timeline");
    var data = null, practice = null, refs = null, session = null, mode = "camera", stream = null, ts = 0, busy = false, stopNow = false;
    var refSeq = null, refFrame = 0, refTimer = 0, playing = false;
    var MAX_FRAMES = 60; // four seconds of camera at 15 frames a second

    // One frame of hand points, as the model reads them: each hand relative to its wrist, so the hands are drawn side by side
    // (the signer's right hand on the left, as a camera sees it), not where they were in the picture.
    function drawFrame(c, cv, seq, f, total, label) {
      var w = cv.width, hgt = cv.height, ink = css("--text-secondary", "#9aa"), acc = css("--accent", "#8fc4ad");
      c.clearRect(0, 0, w, hgt);
      c.font = "12px " + css("--font-mono", "monospace"); c.fillStyle = ink; c.textAlign = "center";
      [0, 1].forEach(function (slot) {
        var cx = slot ? w * 0.75 : w * 0.25, cy = hgt * 0.44, s = 32, start = f * PER_FRAME + slot * PER_HAND;
        c.fillText(slot ? "left hand" : "right hand", cx, hgt - 10);
        if (seq[start + LANDMARKS * 3] < 0.5) { c.fillText("not seen", cx, cy); return; }
        c.save(); c.beginPath(); c.rect(slot * w / 2, 22, w / 2, hgt - 46); c.clip(); // keep each hand in its half
        var pt = function (i) { return [cx + s * seq[start + 3 * i], cy + s * seq[start + 3 * i + 1]]; };
        c.strokeStyle = acc; c.lineWidth = 2; c.beginPath();
        LINKS.forEach(function (l) { var a = pt(l[0]), b = pt(l[1]); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); });
        c.stroke(); c.fillStyle = acc;
        for (var i = 0; i < LANDMARKS; i++) { var p = pt(i); c.beginPath(); c.arc(p[0], p[1], 3, 0, 2 * Math.PI); c.fill(); }
        c.restore(); c.fillStyle = ink;
      });
      c.textAlign = "left"; c.fillText(label || "frame " + (f + 1) + " of " + total, 8, 16);
    }
    function blank(c, cv, msg) {
      c.clearRect(0, 0, cv.width, cv.height);
      c.fillStyle = css("--text-secondary", "#9aa"); c.font = "13px " + css("--font-body", "sans-serif"); c.textAlign = "center";
      c.fillText(msg, cv.width / 2, cv.height / 2);
    }
    // a training clip's 128 matching values back to the model's frame layout (for drawing): landmarks and presence per hand
    function refToSeq(r) {
      var seq = new Float32Array(r.frames.length * PER_FRAME);
      r.frames.forEach(function (fr, f) {
        for (var slot = 0; slot < 2; slot++) {
          var d = slot * 64, s = f * PER_FRAME + slot * PER_HAND;
          for (var i = 0; i < 63; i++) seq[s + i] = fr[d + i];
          seq[s + 63] = fr[d + 63] / 3;
        }
      });
      return seq;
    }

    // ---- 1. learn it: the sign's most typical training clip, slowed down, paused or stepped
    function target() { return Number($("ls-sign").value); }
    function speed() { return Number(document.querySelector('input[name="ls-speed"]:checked').value); }
    function showRef(f) {
      refFrame = (f + SEQ_LEN) % SEQ_LEN;
      drawFrame(refCtx, refCanvas, refSeq, refFrame, SEQ_LEN);
      $("ls-scrub").value = refFrame; $("ls-scrub-v").textContent = (refFrame + 1) + " of " + SEQ_LEN;
    }
    function pause() { playing = false; clearTimeout(refTimer); $("ls-play").textContent = "Play"; }
    function tick() { if (!playing) return; showRef(refFrame + 1); refTimer = setTimeout(tick, 1000 / (FPS * speed())); }
    function loadRef() {
      pause();
      var r = refs.filter(function (x) { return x.sign === target() && x.typical; })[0];
      refSeq = refToSeq(r); showRef(0);
      var word = practice.vocabulary[target()], n = refs.filter(function (x) { return x.sign === target(); }).length;
      $("ls-ref-note").innerHTML = "<b>" + h(word) + "</b>, from the one of its " + n + " training clips with hands in view in the most frames, drawn as the 21 points per hand the model reads. " +
        "Each hand is drawn from its wrist, so where the hands move in front of the body is not shown; " +
        '<a href="https://www.signasl.org/sign/' + encodeURIComponent(word) + '" target="_blank" rel="noopener">watch a person sign ' + h(word) + " on SignASL.org</a> for that.";
      fillOther();
      if (data) pickClipFor(target());
    }

    // ---- 2. check an attempt
    var allPromise = null;
    function loadAll() { // one download however many times it is asked for
      if (!allPromise) allPromise = fetchAll().catch(function (e) { allPromise = null; throw e; });
      return allPromise;
    }
    function fetchAll() {
      return Promise.all([fetch("/lab/data/signs/held_out.json"), fetch("/lab/data/signs/practice.json")]).then(function (rs) {
        if (!rs[0].ok || !rs[1].ok) throw new Error("The sign data could not be loaded");
        return Promise.all([rs[0].json(), rs[1].json()]);
      }).then(function (d) {
        data = d[0]; practice = d[1]; refs = decodeRefs(practice);
        var m = practice.held_out, P = function (v) { return Math.round(100 * v) + "%"; };
        $("ls-reliability").innerHTML = "<b>How far to trust the flag.</b> Measured on the " + m.n_correct + " held-out clips, which none of this was tuned on: " +
          P(m.correct_flagged) + " of correct attempts were flagged by mistake. Of " + m.n_switch + " made-up attempts that switch to another sign half-way, " +
          P(m.switch_caught) + " were flagged, a median of " + m.median_delay_frames + " frames after the switch, and " + P(m.switch_flagged_early) + " too early. " +
          "With about " + Math.round(practice.refs.length / practice.vocabulary.length) + " training clips per sign, and hand points that do not record where on the body the hands are, " +
          "it misses many switches, most often between signs with the same hand shape. A green timeline means nothing was caught, not that the sign was right; the model's final scores are the second opinion.";
        var order = practice.vocabulary.map(function (w, i) { return [w, i]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
        $("ls-sign").innerHTML = order.map(function (o) { return '<option value="' + o[1] + '">' + h(o[0]) + "</option>"; }).join("");
        $("ls-sign").value = String(practice.vocabulary.indexOf("computer"));
        var seen = {};
        $("ls-clip").innerHTML = data.clips.map(function (c, i) { seen[c.sign] = (seen[c.sign] || 0) + 1; return [c.sign, seen[c.sign], i]; })
          .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; })
          .map(function (o) { return '<option value="' + o[2] + '">' + h(o[0]) + ", clip " + o[1] + "</option>"; }).join("");
        loadRef();
      });
    }
    function clipsOf(word) { return data.clips.map(function (c, i) { return [c, i]; }).filter(function (p) { return p[0].sign === word; }); }
    function pickClipFor(t) { var c = clipsOf(practice.vocabulary[t])[0]; if (c) $("ls-clip").value = String(c[1]); }
    function fillOther() {
      var word = practice.vocabulary[target()];
      $("ls-other").innerHTML = practice.vocabulary.filter(function (w) { return w !== word; }).sort()
        .map(function (w) { return '<option value="' + h(w) + '">' + h(w) + "</option>"; }).join("");
      $("ls-other").value = word === "math" ? "computer" : "math";
    }
    function clipFrames(i) { return data.clips[i].features.map(function (fr) { return Float32Array.from(fr); }); }

    // The live check: one call per arriving frame (140 model values). Draws the frame, extends the timeline and says whether the
    // attempt is still on track; the first frame of the flag rule's run is where it went wrong.
    function Checker(t, framesTotal, timeUnit) {
      this.t = t; this.tracker = new Tracker(refs, practice.vocabulary.length, practice.window); this.ranks = []; this.frames = [];
      this.flag = null; this.snap = null; this.total = framesTotal; this.unit = timeUnit; this.cells = [];
      timeline.innerHTML = ""; timeline.style.setProperty("--cells", framesTotal);
      for (var i = 0; i < framesTotal; i++) { var s = document.createElement("span"); timeline.appendChild(s); this.cells.push(s); }
      nowEl.innerHTML = "";
    }
    Checker.prototype.when = function (f) { return this.unit === "s" ? (f / FPS).toFixed(1) + " s" : "frame " + (f + 1); };
    Checker.prototype.push = function (frame) {
      var f = this.frames.length, scores = this.tracker.push(matchFeatures(frame)), rank = rankOf(scores, this.t), K = practice.K;
      this.frames.push(frame); this.ranks.push(rank);
      var order = Array.from(scores).map(function (v, i) { return [v, i]; }).sort(function (a, b) { return a[0] - b[0]; });
      var close = this.tracker.closest(this.t);
      if (this.flag === null) {
        var fl = flagAt(this.ranks, K, practice.N, practice.start);
        if (fl !== null) {
          this.flag = fl;
          var fr = this.frames[fl], ref = this.tracker.closest(this.t);
          // shown against the clip from "Learn it" (hands in view in the most frames), at the point of the sign the attempt had
          // reached in its best-matching training clip: that clip may have frames where the hands were not detected
          var learn = refs.filter(function (x) { return x.sign === this.t && x.typical; }, this)[0];
          this.snap = { user: fr, refSeq: refToSeq(learn), refPos: Math.min(ref.pos, SEQ_LEN - 1), looks: order.slice(0, 3).map(function (o) { return o[1]; }) };
          for (var g = fl; g < f; g++) this.cells[g].className = "bad";
        }
      }
      var hands = frame[63] + frame[PER_HAND + 63] > 0; // a frame with no hand is never "on track": empty frames match every clip
      if (this.cells[f]) this.cells[f].className = this.flag !== null ? "bad" : !hands ? "none" : f < practice.start ? "wait" : rank < K ? "ok" : "warn";
      var word = practice.vocabulary[this.t], seq = frame;
      drawFrame(ctx, canvas, seq, 0, 1, (this.unit === "s" ? "your hands, " : "") + this.when(f));
      var names = order.slice(0, 3).map(function (o) { return "<b>" + h(practice.vocabulary[o[1]]) + "</b>"; }).join(", ");
      if (this.flag !== null) statusEl.innerHTML = '<span class="lt-pill bad">went wrong at ' + this.when(this.flag) + "</span> From there it stopped matching " + h(word) + ".";
      else if (!hands) statusEl.innerHTML = '<span class="lt-pill idle">no hands</span> No hand is in view in this frame.';
      else if (f < practice.start) statusEl.innerHTML = '<span class="lt-pill idle">starting</span> Reading the first frames...';
      else statusEl.innerHTML = rank < K ? '<span class="lt-pill ok">on track</span> ' + h(word) + " is the " + ordinal(rank + 1) + " closest sign so far."
        : '<span class="lt-pill warn">drifting</span> ' + h(word) + " has dropped to " + ordinal(rank + 1) + " closest.";
      nowEl.innerHTML = '<p class="lt-note">Closest signs so far: ' + names + ". You are about " + Math.round(100 * (close.pos + 1) / SEQ_LEN) + "% of the way through the training clip it matches best.</p>";
    };
    function ordinal(n) { return n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"); }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

    // feed stored frames at the camera's pace, so a clip is checked exactly as a live attempt would be
    function feed(chk, frames) {
      var i = 0;
      return new Promise(function (resolve) {
        (function next() {
          if (i >= frames.length || stopNow) return resolve();
          chk.push(frames[i++]); setTimeout(next, 1000 / FPS);
        })();
      });
    }
    function runStored() {
      return loadAll().then(function () {
        var t = target(), frames, truth = null, note = "";
        if (mode === "clip") {
          var ci = Number($("ls-clip").value); frames = clipFrames(ci); truth = data.clips[ci].sign;
          note = truth === practice.vocabulary[t] ? "This clip is a real attempt at " + h(truth) + "." : "This clip is <b>" + h(truth) + "</b>, not " + h(practice.vocabulary[t]) + ", so it should be flagged.";
        } else {
          var mine = clipsOf(practice.vocabulary[t])[0], other = clipsOf($("ls-other").value)[0];
          frames = clipFrames(mine[1]).slice(0, practice.cut).concat(clipFrames(other[1]).slice(practice.cut));
          note = "Made up: " + h(practice.vocabulary[t]) + " for 16 frames, then " + h($("ls-other").value) + " from frame " + (practice.cut + 1) + ".";
        }
        var chk = new Checker(t, frames.length, "frame");
        out.innerHTML = '<p class="lt-note">' + note + "</p>";
        return feed(chk, frames).then(function () { return finish(chk, flatten(frames), { note: note, cut: mode === "mistake" ? practice.cut : null }); });
      });
    }
    function flatten(frames) { var s = new Float32Array(frames.length * PER_FRAME); frames.forEach(function (f, i) { s.set(f, i * PER_FRAME); }); return s; }

    function startCamera() {
      if (stream) return Promise.resolve();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("This browser cannot open a camera here"));
      return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false })
        .then(function (s) { stream = s; video.srcObject = s; video.hidden = false; return video.play(); })
        .catch(function (e) {
          throw new Error(e && e.name === "NotAllowedError" ? "Camera access was not allowed. Allow it in the browser's address bar, or try a held-out clip"
            : "No camera could be opened (" + (e && e.name || e) + "). Try a held-out clip instead");
        });
    }
    function stopCamera() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null; video.srcObject = null; video.hidden = true;
    }
    function countdown(n) {
      if (!n) return Promise.resolve();
      statusEl.innerHTML = 'Get ready: start signing <b>' + h(practice.vocabulary[target()]) + "</b> in <b>" + n + "</b>...";
      return wait(1000).then(function () { return countdown(n - 1); });
    }
    function runCamera() {
      statusEl.textContent = "Downloading MediaPipe's hand model and OpenCV.js (about 14 MB, first time only)...";
      return Promise.all([loadCv(), loadHands(), loadAll(), startCamera()]).then(function (got) {
        var cv = got[0], hands = got[1];
        return countdown(3).then(function () {
          var scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight)), grab = document.createElement("canvas");
          grab.width = Math.round(video.videoWidth * scale); grab.height = Math.round(video.videoHeight * scale);
          var g = grab.getContext("2d", { willReadFrequently: true }), chk = new Checker(target(), MAX_FRAMES, "s"), rows = [], slow = 0;
          runBtn.textContent = "Stop"; runBtn.disabled = false;
          return new Promise(function (resolve) {
            var due = performance.now();
            (function next() {
              if (stopNow || rows.length >= MAX_FRAMES) return resolve();
              var t0 = performance.now();
              g.drawImage(video, 0, 0, grab.width, grab.height);
              var fr = g.getImageData(0, 0, grab.width, grab.height);
              ts += 1000 / 25; // strictly increasing timestamps, the same 40 ms step the Python extractor uses
              var row = frameFeatures(cv, fr.data, fr.width, fr.height, hands.detectForVideo(fr, Math.round(ts)));
              rows.push(row); chk.push(row);
              if (performance.now() - t0 > 1000 / FPS) slow++;
              due += 1000 / FPS; setTimeout(next, Math.max(0, due - performance.now()));
            })();
          }).then(function () {
            // the model scores the stretch with hands in view, resampled to its 32 frames, as the project's own webcam page does
            var seen = rows.map(function (r) { return r[63] + r[PER_HAND + 63] > 0; }), a = seen.indexOf(true), b = seen.lastIndexOf(true);
            chk.cells.slice(rows.length).forEach(function (c) { c.className = "unused"; });
            if (a < 0) throw new Error("No hands were found in any frame. Step back so both hands are in view, with light on them, and try again");
            var note = "Hands were found in " + seen.filter(Boolean).length + " of " + rows.length + " frames." +
              (slow > rows.length / 3 ? " This device could not keep up with 15 frames a second, so some moments were read late." : "") +
              " Your signing, camera and light differ from the WLASL clips the model learned from, so expect more misses than its 75.86% held-out score.";
            return finish(chk, resample(rows.slice(a, b + 1)), { note: note });
          });
        });
      });
    }

    // ---- the end: where it went wrong (if it did), then the model's best match and all 29 scores
    function finish(chk, seq, extra) {
      if (seq.length !== SEQ_LEN * PER_FRAME) seq = resample(splitRows(seq));
      return score(seq).then(function (probs) {
        var word = practice.vocabulary[chk.t], html = "";
        if (chk.flag !== null) {
          var looks = chk.snap.looks.filter(function (c) { return c !== chk.t; }).slice(0, 2).map(function (c) { return "<b>" + h(practice.vocabulary[c]) + "</b>"; });
          html += '<div class="lm-trust bad"><p><b>Went wrong at ' + chk.when(chk.flag) + ".</b> Up to there your signing matched " + h(word) +
            "; from there it looks more like " + looks.join(" or ") + ". " + handHint(chk.snap) + "</p>" +
            (extra.cut != null ? "<p>The switch really happened at frame " + (extra.cut + 1) + (chk.flag >= extra.cut ? ", so the flag came " + (chk.flag - extra.cut) + " frame" + (chk.flag - extra.cut === 1 ? "" : "s") + " later." : "; this flag came early.") + "</p>" : "") +
            '<div class="ls-compare"><figure><canvas id="ls-c-you" width="300" height="196"></canvas><figcaption>The attempt at ' + chk.when(chk.flag) +
            '</figcaption></figure><figure><canvas id="ls-c-ref" width="300" height="196"></canvas><figcaption>' + h(word) + " at the same point, in the clip from Learn it</figcaption></figure></div></div>";
        } else {
          html += '<div class="lm-trust ok"><p><b>No point went wrong.</b> ' + h(word) + " stayed among the " + practice.K + " closest signs from frame " + (practice.start + 1) + " to the end.</p></div>";
        }
        var order = probs.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return b[0] - a[0]; });
        var tIdx = data.vocabulary.indexOf(word), rank = order.map(function (o) { return o[1]; }).indexOf(tIdx);
        html += '<p class="lm-verdict">The model\'s best match: <b>' + h(data.vocabulary[order[0][1]]) + "</b>, " + pct(order[0][0]) + ". " +
          (rank === 0 ? '<span class="lt-pill ok">that is ' + h(word) + "</span>" : '<span class="lt-pill ' + (rank < 3 ? "warn" : "bad") + '">' + h(word) + " is number " + (rank + 1) + "</span>") + "</p>";
        html += '<ul class="lm-bars ls-all">' + order.map(function (o, k) {
          var isT = o[1] === tIdx;
          return '<li' + (isT ? ' class="ls-target"' : "") + '><span class="lm-name">' + h(data.vocabulary[o[1]]) + '</span><span class="lm-track"><span class="lm-fill' + (k ? "" : " lm-top") +
            '" style="width:' + (100 * o[0]).toFixed(2) + '%"></span></span><span class="lm-val">' + pct(o[0]) + "</span></li>";
        }).join("") + "</ul>";
        html += '<p class="lt-note">The flag and the final scores answer different questions. The flag follows the attempt frame by frame against the training clips; the final scores come from the trained model reading the whole attempt at once, so they can disagree.</p>';
        if (extra.note) html += '<p class="lt-note">' + extra.note + "</p>";
        out.innerHTML = html; nowEl.innerHTML = "";
        if (chk.flag !== null) {
          var cy = $("ls-c-you"), cr = $("ls-c-ref");
          drawFrame(cy.getContext("2d"), cy, chk.snap.user, 0, 1, "attempt");
          drawFrame(cr.getContext("2d"), cr, chk.snap.refSeq, chk.snap.refPos, SEQ_LEN, "training clip");
        }
        statusEl.innerHTML = chk.flag !== null ? '<span class="lt-pill bad">went wrong at ' + chk.when(chk.flag) + "</span> Details below."
          : '<span class="lt-pill ok">done</span> It stayed on track. Details below.';
      });
    }
    function splitRows(seq) { var rows = []; for (var i = 0; i < seq.length; i += PER_FRAME) rows.push(seq.subarray(i, i + PER_FRAME)); return rows; }
    // which hand differs most at the flagged frame: a hand missing on one side, or the hand whose points are furthest apart
    function handHint(s) {
      var names = ["right hand", "left hand"], gaps = [0, 1].map(function (slot) {
        var u = s.user, r = s.refSeq, us = slot * PER_HAND, rs = s.refPos * PER_FRAME + slot * PER_HAND, up = u[us + 63] > 0.5, rp = r[rs + 63] > 0.5;
        if (up !== rp) return { slot: slot, missing: rp ? "yours" : "theirs", d: Infinity };
        if (!up) return { slot: slot, d: 0 };
        var d = 0; for (var i = 0; i < 63; i++) { var x = u[us + i] - r[rs + i]; d += x * x; }
        return { slot: slot, d: Math.sqrt(d / 63) };
      }).sort(function (a, b) { return b.d - a.d; });
      var g = gaps[0];
      if (g.missing === "yours") return "The sign uses your " + names[g.slot] + " here, and it was not seen.";
      if (g.missing === "theirs") return "Your " + names[g.slot] + " is in view here, but the sign does not use it at this point.";
      return g.d > 0 ? "The " + names[g.slot] + "'s shape differs most from the training clip at this point." : "";
    }
    function score(seq) {
      return LabModels.loadOrt().then(function (ort) {
        return session || ort.InferenceSession.create("/lab/models/sign_gru.onnx", { executionProviders: ["wasm"] }).then(function (s) { session = s; return s; });
      }).then(function (s) {
        return s.run({ features: new root.ort.Tensor("float32", seq, [1, SEQ_LEN, PER_FRAME]) }).then(function (res) { return softmax(Array.from(res.logits.data)); });
      });
    }

    function run() {
      if (busy) { stopNow = true; return; } // the button reads Stop while the camera records
      busy = true; stopNow = false; runBtn.disabled = true; pause(); out.innerHTML = "";
      if (!practice) statusEl.textContent = "Downloading the model and the sign data (about 5 MB, first time only)...";
      var ok = false;
      (mode === "camera" ? runCamera() : runStored()).then(function () { ok = true; }).catch(function (e) {
        statusEl.innerHTML = h(e.message || "The check could not run") + ".";
      }).then(function () {
        busy = false; runBtn.disabled = false; runBtn.textContent = mode === "camera" ? (ok ? "Check my signing again" : "Check my signing") : "Check this attempt";
      });
    }
    function setMode(m) {
      mode = m; ["camera", "clip", "mistake"].forEach(function (k) { $("ls-" + k + "-pick").hidden = k !== m; });
      if (m !== "camera") stopCamera();
      runBtn.textContent = m === "camera" ? "Check my signing" : "Check this attempt";
      blank(ctx, canvas, m === "camera" ? "Your hand points appear here as you sign" : "The attempt's hand points appear here");
    }

    blank(ctx, canvas, "Your hand points appear here as you sign");
    blank(refCtx, refCanvas, "Loading the sign...");
    $("ls-sign").addEventListener("change", function () { if (practice) loadRef(); });
    $("ls-play").addEventListener("click", function () { if (!refSeq) return; if (playing) pause(); else { playing = true; this.textContent = "Pause"; tick(); } });
    $("ls-back").addEventListener("click", function () { if (refSeq) { pause(); showRef(refFrame - 1); } });
    $("ls-fwd").addEventListener("click", function () { if (refSeq) { pause(); showRef(refFrame + 1); } });
    $("ls-scrub").addEventListener("input", function () { if (refSeq) { pause(); showRef(Number(this.value)); } });
    document.querySelectorAll('input[name="ls-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    runBtn.addEventListener("click", run);
    root.addEventListener("pagehide", stopCamera);
    // the sign list and the learning clip are small (about 2 MB) and load when the demo first scrolls into view
    var io = root.IntersectionObserver ? new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { io.disconnect(); loadAll().catch(function () { blank(refCtx, refCanvas, "The sign data could not be loaded"); }); }
    }, { rootMargin: "400px" }) : null;
    if (io) io.observe($("lm-signs")); else loadAll().catch(function () {});
  }

  function start() { try { initSigns(); } catch (e) { if (root.console) console.error("lm-signs", e); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})(typeof window !== "undefined" ? window : this);
