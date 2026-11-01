// The Lab's ASL word-sign demo (templates/_lab_models.html, #lm-signs). It runs the project's own pipeline in the browser:
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

  var api = { SEQ_LEN: SEQ_LEN, PER_HAND: PER_HAND, PER_FRAME: PER_FRAME, normaliseLandmarks: normaliseLandmarks,
              contourFeatures: contourFeatures, frameFeatures: frameFeatures, resample: resample, softmax: softmax };
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
    var canvas = $("ls-canvas"), ctx = canvas.getContext("2d"), out = $("ls-out"), runBtn = $("ls-run"), video = $("ls-video");
    var data = null, session = null, mode = "clip", stream = null, anim = 0, ts = 0, busy = false;

    // The hand points of one frame, as the model reads them: each hand relative to its wrist, so hands are drawn side by side
    // (the signer's right hand on the left, as a camera sees it), not where they were in the picture.
    function drawFrame(seq, f) {
      var w = canvas.width, hgt = canvas.height, ink = css("--text-secondary", "#9aa"), acc = css("--accent", "#8fc4ad");
      ctx.clearRect(0, 0, w, hgt);
      ctx.font = "12px " + css("--font-mono", "monospace"); ctx.fillStyle = ink; ctx.textAlign = "center";
      [0, 1].forEach(function (slot) {
        var cx = slot ? w * 0.75 : w * 0.25, cy = hgt * 0.44, s = 32, start = f * PER_FRAME + slot * PER_HAND;
        ctx.fillText(slot ? "left hand" : "right hand", cx, hgt - 10);
        if (seq[start + LANDMARKS * 3] < 0.5) { ctx.fillText("not seen", cx, cy); return; }
        ctx.save(); ctx.beginPath(); ctx.rect(slot * w / 2, 22, w / 2, hgt - 46); ctx.clip(); // keep each hand in its half
        var pt = function (i) { return [cx + s * seq[start + 3 * i], cy + s * seq[start + 3 * i + 1]]; };
        ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath();
        LINKS.forEach(function (l) { var a = pt(l[0]), b = pt(l[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); });
        ctx.stroke(); ctx.fillStyle = acc;
        for (var i = 0; i < LANDMARKS; i++) { var p = pt(i); ctx.beginPath(); ctx.arc(p[0], p[1], 3, 0, 2 * Math.PI); ctx.fill(); }
        ctx.restore(); ctx.fillStyle = ink;
      });
      ctx.textAlign = "left"; ctx.fillText("frame " + (f + 1) + " of " + SEQ_LEN, 8, 16);
    }
    function play(seq) {
      cancelAnimationFrame(anim);
      if (reduced) { drawFrame(seq, SEQ_LEN >> 1); return; }
      var t0 = performance.now();
      (function tick(now) { drawFrame(seq, Math.floor((now - t0) / (1000 / FPS)) % SEQ_LEN); anim = requestAnimationFrame(tick); })(t0);
    }
    function blank(msg) {
      cancelAnimationFrame(anim); ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = css("--text-secondary", "#9aa"); ctx.font = "13px " + css("--font-body", "sans-serif"); ctx.textAlign = "center";
      ctx.fillText(msg, canvas.width / 2, canvas.height / 2);
    }

    function result(probs, extra) {
      var order = probs.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 3);
      var html = '<p class="lm-verdict">Top guess: <b>' + h(data.vocabulary[order[0][1]]) + "</b>, " + pct(order[0][0]) + ".";
      if (extra.truth) {
        var rank = order.map(function (o) { return data.vocabulary[o[1]]; }).indexOf(extra.truth);
        html += " " + (rank === 0 ? '<span class="lt-pill ok">correct</span>' : rank > 0 ? '<span class="lt-pill warn">right sign is number ' + (rank + 1) + "</span>"
          : '<span class="lt-pill bad">missed: it is ' + h(extra.truth) + "</span>");
      }
      html += '</p><ul class="lm-bars">' + order.map(function (o, k) {
        return '<li><span class="lm-name">' + h(data.vocabulary[o[1]]) + '</span><span class="lm-track"><span class="lm-fill' + (k ? "" : " lm-top") +
          '" style="width:' + (100 * o[0]).toFixed(2) + '%"></span></span><span class="lm-val">' + pct(o[0]) + "</span></li>";
      }).join("") + "</ul>" + (extra.note || "");
      out.innerHTML = html;
    }
    function score(seq) {
      return LabModels.loadOrt().then(function (ort) {
        return session || ort.InferenceSession.create("/lab/models/sign_gru.onnx", { executionProviders: ["wasm"] }).then(function (s) { session = s; return s; });
      }).then(function (s) {
        var t = performance.now();
        return s.run({ features: new root.ort.Tensor("float32", seq, [1, SEQ_LEN, PER_FRAME]) }).then(function (res) {
          var probs = softmax(Array.from(res.logits.data));
          probs.ms = performance.now() - t; // the model alone, not its first-time download
          return probs;
        });
      });
    }
    function loadClips() {
      if (data) return Promise.resolve(data);
      return fetch("/lab/data/signs/held_out.json").then(function (r) { if (!r.ok) throw new Error("The held-out clips could not be loaded"); return r.json(); })
        .then(function (d) {
          data = d;
          var seen = {}, opts = d.clips.map(function (c, i) { seen[c.sign] = (seen[c.sign] || 0) + 1; return [c.sign, seen[c.sign], i]; })
            .sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; });
          $("ls-clip").innerHTML = opts.map(function (o) { return '<option value="' + o[2] + '">' + h(o[0]) + ", clip " + o[1] + "</option>"; }).join("");
          return d;
        });
    }
    function clipSeq() { return new Float32Array(data.clips[Number($("ls-clip").value)].features.flat()); }

    function runClip() {
      return loadClips().then(function () {
        var clip = data.clips[Number($("ls-clip").value)], seq = clipSeq();
        play(seq);
        return score(seq).then(function (probs) {
          var py = clip.probs, diff = Math.max.apply(null, probs.map(function (p, i) { return Math.abs(p - py[i]); }));
          result(probs, { truth: clip.sign, note: '<p class="lt-note">Python gave the same clip ' + pct(py[probs.indexOf(Math.max.apply(null, probs))]) +
            " for the top guess; the largest difference from this page across the 29 scores is " + diff.toExponential(1) + ".</p>" });
        });
      });
    }

    function startCamera() {
      if (stream) return Promise.resolve();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return Promise.reject(new Error("This browser cannot open a camera here"));
      return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false })
        .then(function (s) { stream = s; video.srcObject = s; video.hidden = false; return video.play(); })
        .catch(function (e) {
          throw new Error(e && e.name === "NotAllowedError" ? "Camera access was not allowed. Allow it in the browser's address bar, or use a held-out clip"
            : "No camera could be opened (" + (e && e.name || e) + "). Try a held-out clip instead");
        });
    }
    function stopCamera() {
      if (stream) stream.getTracks().forEach(function (t) { t.stop(); });
      stream = null; video.srcObject = null; video.hidden = true;
    }
    function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
    function countdown(n) {
      if (!n) return Promise.resolve();
      out.innerHTML = '<p class="lm-verdict">Get ready: recording starts in <b>' + n + "</b>...</p>";
      return wait(1000).then(function () { return countdown(n - 1); });
    }
    function record() {
      var scale = Math.min(1, MAX_SIDE / Math.max(video.videoWidth, video.videoHeight)), grab = document.createElement("canvas");
      grab.width = Math.round(video.videoWidth * scale); grab.height = Math.round(video.videoHeight * scale);
      var g = grab.getContext("2d", { willReadFrequently: true }), frames = [];
      out.innerHTML = '<p class="lm-verdict"><b>Sign now</b> (two seconds)...</p>';
      return new Promise(function (resolve) {
        var timer = setInterval(function () {
          g.drawImage(video, 0, 0, grab.width, grab.height);
          frames.push(g.getImageData(0, 0, grab.width, grab.height));
          if (frames.length >= FRAMES) { clearInterval(timer); resolve(frames); }
        }, 1000 / FPS);
      });
    }
    function runCamera() {
      var t0, tFeat;
      out.innerHTML = '<p class="lt-note">Downloading MediaPipe\'s hand model and OpenCV.js (about 14 MB, first time only)...</p>';
      return Promise.all([loadCv(), loadHands(), loadClips(), startCamera()]).then(function (got) {
        return countdown(3).then(record).then(function (frames) {
          out.innerHTML = '<p class="lt-note">Reading the hands in ' + frames.length + " frames...</p>";
          return wait(30).then(function () {
            t0 = performance.now();
            var rows = frames.map(function (fr) {
              ts += 1000 / 25; // strictly increasing timestamps, the same 40 ms step the Python extractor uses
              return frameFeatures(got[0], fr.data, fr.width, fr.height, got[1].detectForVideo(fr, Math.round(ts)));
            });
            tFeat = performance.now() - t0;
            return resample(rows);
          });
        });
      }).then(function (seq) {
        play(seq);
        var found = 0;
        for (var f = 0; f < SEQ_LEN; f++) if (seq[f * PER_FRAME + 63] + seq[f * PER_FRAME + PER_HAND + 63] > 0) found++;
        return score(seq).then(function (probs) {
          var note = '<p class="lt-note">Hands were found in ' + Math.round(100 * found / SEQ_LEN) + "% of frames. Reading hands took " +
            Math.round(tFeat) + " ms, the model " + probs.ms.toFixed(1) + " ms, all in this browser.</p>";
          if (found < SEQ_LEN / 2) note += '<p class="lt-note">That is too few frames for a fair guess: step back so both hands stay in view, with light on them, and try again.</p>';
          note += '<p class="lt-note">Your signing, camera and light differ from the WLASL clips the model learned from, so expect it to miss more often than the 75.86% held-out score.</p>';
          result(probs, { note: note });
        });
      });
    }

    function run() {
      if (busy) return;
      busy = true; runBtn.disabled = true;
      if (mode === "clip" && !data) out.innerHTML = '<p class="lt-note">Downloading the model and the held-out clips...</p>';
      (mode === "clip" ? runClip() : runCamera()).then(function () {
        runBtn.textContent = mode === "clip" ? "Recognise the sign" : "Record and recognise again";
      }).catch(function (e) {
        out.innerHTML = '<p class="lt-note">' + h(e.message || "The model could not run") + ".</p>";
      }).then(function () { busy = false; runBtn.disabled = false; });
    }
    function setMode(m) {
      mode = m; $("ls-clip-pick").hidden = m !== "clip"; $("ls-camera-pick").hidden = m !== "camera"; out.innerHTML = "";
      if (m === "clip") { stopCamera(); runBtn.textContent = data ? "Recognise the sign" : "Recognise the sign (about 3 MB, first time only)"; blank("Pick a clip and press Recognise"); }
      else { runBtn.textContent = stream ? "Record and recognise again" : "Start the camera and record"; blank("Your hand points appear here after recording"); }
    }

    blank("Press Recognise to load the held-out clips");
    $("ls-clip").addEventListener("change", function () { if (data) { out.innerHTML = ""; play(clipSeq()); } });
    $("ls-clip").addEventListener("focus", function () { if (!data) loadClips().then(function () { play(clipSeq()); }).catch(function () {}); });
    document.querySelectorAll('input[name="ls-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    runBtn.addEventListener("click", run);
    root.addEventListener("pagehide", stopCamera);
  }

  function start() { try { initSigns(); } catch (e) { if (root.console) console.error("lm-signs", e); } }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})(typeof window !== "undefined" ? window : this);
