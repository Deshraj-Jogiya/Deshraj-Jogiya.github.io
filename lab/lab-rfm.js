// The Lab's RFM segment explorer (templates/lab_demos/st-rfm.html): the Sales-Customer-Segmentation-Pipeline project's
// segmentation (models/segmentation.py) rewritten for the browser. RFM per customer, standardised, K-Means for any k from 2 to 8,
// and the project's segment names at k = 4. Also runs on a visitor's own transactions. tools/check_lab_rfm.js holds this to
// scikit-learn on the project's 2,000 customers and to pandas on raw sample rows.
(function (root) {
  "use strict";
  var DAY = 86400000;

  // Rows of [customer, date, amount] -> customers' [recency, frequency, monetary], as models/segmentation.py computes them:
  // recency = whole days from the last sale to the day after the latest sale in the data.
  function rfmFromRows(rows) {
    var by = new Map(), latest = -Infinity;
    rows.forEach(function (r) {
      var c = by.get(r[0]);
      if (!c) { c = { last: -Infinity, n: 0, sum: 0 }; by.set(r[0], c); }
      if (r[1] > c.last) c.last = r[1];
      c.n++; c.sum += r[2];
      if (r[1] > latest) latest = r[1];
    });
    var ref = latest + DAY, ids = [], out = [];
    by.forEach(function (c, id) { ids.push(id); out.push([Math.floor((ref - c.last) / DAY), c.n, c.sum]); });
    return { ids: ids, rfm: out };
  }

  // CSV text: customer, date, amount (a header row is skipped). Dates are read as UTC so daylight saving cannot shift a day.
  function parseRows(text) {
    var rows = [], bad = [], first = true;
    text.split(/\r?\n/).forEach(function (line, i) {
      var raw = line.trim();
      if (!raw || raw[0] === "#") return;
      var f = raw.split(/\s*[,;\t]\s*/);
      if (first) { first = false; if (f.length >= 3 && isNaN(Number(f[2]))) return; }
      var d = /^\d{4}-\d{2}-\d{2}/.test(f[1] || "") ? Date.parse(f[1].replace(" ", "T") + (/[zZ]|[+-]\d\d:?\d\d$/.test(f[1]) ? "" : (f[1].length <= 10 ? "T00:00:00Z" : "Z"))) : Date.parse(f[1]);
      var amount = Number(f[2]);
      if (f.length < 3 || !f[0] || !isFinite(d) || !isFinite(amount)) { bad.push(i + 1); return; }
      rows.push([f[0], d, amount]);
    });
    return { rows: rows, bad: bad };
  }

  function standardise(X) { // scikit-learn StandardScaler: population standard deviation; a constant column is left at 0
    var n = X.length, m = X[0].length, mean = [], sd = [];
    for (var j = 0; j < m; j++) {
      var s = 0; for (var i = 0; i < n; i++) s += X[i][j]; mean.push(s / n);
      var v = 0; for (i = 0; i < n; i++) v += (X[i][j] - mean[j]) * (X[i][j] - mean[j]); sd.push(Math.sqrt(v / n) || 1);
    }
    return X.map(function (r) { return r.map(function (x, j) { return (x - mean[j]) / sd[j]; }); });
  }

  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function d2(a, b) { var s = 0; for (var j = 0; j < a.length; j++) { var d = a[j] - b[j]; s += d * d; } return s; }

  // K-Means with greedy k-means++ seeding (2 + log k trials per centre, as scikit-learn does) and Lloyd's iterations; the best
  // of nInit runs by inertia.
  function kmeans(X, k, nInit, seed) {
    var n = X.length, rnd = mulberry32(seed || 42), best = null, trials = 2 + Math.floor(Math.log(k));
    for (var run = 0; run < (nInit || 10); run++) {
      var centers = [X[Math.floor(rnd() * n)].slice()], closest = X.map(function (x) { return d2(x, centers[0]); });
      while (centers.length < k) {
        var total = closest.reduce(function (a, b) { return a + b; }, 0), pick = -1, pickPot = Infinity, pickClosest = null;
        for (var t = 0; t < trials; t++) {
          var r = rnd() * total, idx = 0;
          while (idx < n - 1 && r > closest[idx]) { r -= closest[idx]; idx++; }
          var cand = X.map(function (x, i) { return Math.min(closest[i], d2(x, X[idx])); }), pot = cand.reduce(function (a, b) { return a + b; }, 0);
          if (pot < pickPot) { pickPot = pot; pick = idx; pickClosest = cand; }
        }
        centers.push(X[pick].slice()); closest = pickClosest;
      }
      var labels = new Int32Array(n).fill(-1), inertia = 0;
      for (var it = 0; it < 300; it++) {
        var changed = 0; inertia = 0;
        for (var i = 0; i < n; i++) {
          var bi = 0, bd = Infinity;
          for (var c = 0; c < k; c++) { var dd = d2(X[i], centers[c]); if (dd < bd) { bd = dd; bi = c; } }
          if (labels[i] !== bi) { labels[i] = bi; changed++; }
          inertia += bd;
        }
        if (!changed) break;
        var sums = centers.map(function () { return new Float64Array(X[0].length); }), counts = new Int32Array(k);
        for (i = 0; i < n; i++) { counts[labels[i]]++; for (var j = 0; j < X[0].length; j++) sums[labels[i]][j] += X[i][j]; }
        for (c = 0; c < k; c++) if (counts[c]) centers[c] = Array.from(sums[c], function (s) { return s / counts[c]; });
      }
      if (!best || inertia < best.inertia) best = { labels: labels, inertia: inertia, centers: centers };
    }
    return best;
  }
  function totalSS(X) { var mean = X[0].map(function (_, j) { return X.reduce(function (s, r) { return s + r[j]; }, 0) / X.length; }); return X.reduce(function (s, r) { return s + d2(r, mean); }, 0); }

  // models/segmentation.py's names for 4 clusters, from the clusters' raw RFM means.
  function segmentNames(means) {
    var idx = [0, 1, 2, 3], byM = idx.slice().sort(function (a, b) { return means[a][2] - means[b][2]; }), byR = idx.slice().sort(function (a, b) { return means[a][0] - means[b][0]; });
    var champ = byM[3], lost = byR[3], active = byR.filter(function (c) { return c !== champ && c !== lost; });
    var loyal = means[active[0]][2] > means[active[1]][2] ? active[0] : active[1], fresh = loyal === active[0] ? active[1] : active[0];
    var names = []; names[champ] = "VIP Champions"; names[loyal] = "Loyal Customers"; names[fresh] = "New Customers"; names[lost] = "At Risk / Hibernating";
    return names.length === 4 && names.every(Boolean) && new Set(names).size === 4 ? names : null;
  }

  var api = { rfmFromRows: rfmFromRows, parseRows: parseRows, standardise: standardise, kmeans: kmeans, totalSS: totalSS, segmentNames: segmentNames };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabRFM = api;
  if (!document.getElementById("st-rfm")) return;

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function num(v, d) { return v.toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  var COLORS = ["var(--accent)", "var(--lt-warn)", "var(--lt-base)", "var(--lt-bad)", "var(--accent-indigo)", "var(--lt-orange)", "var(--accent-purple)", "var(--text-secondary)"];

  function init() {
    var sets = { project: null, own: null }, mode = "project", cache = {};
    function current() { return sets[mode]; }
    function prepare(rfm) {
      var X = standardise(rfm), tss = totalSS(X), runs = [];
      for (var k = 2; k <= Math.min(8, rfm.length - 1); k++) { var r = kmeans(X, k, 10, 42); r.k = k; r.ve = 1 - r.inertia / tss; runs.push(r); }
      return { rfm: rfm, runs: runs };
    }
    function elbow(set, k) {
      var W = 320, H = 180, L = 40, R = 10, T = 10, B = 30, runs = set.runs, ks = runs.map(function (r) { return r.k; });
      var x = function (kk) { return L + (W - L - R) * (kk - ks[0]) / Math.max(1, ks[ks.length - 1] - ks[0]); }, y = function (v) { return T + (H - T - B) * (1 - v); };
      var s = '<line class="ax" x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) + '"/>';
      [0, 0.5, 1].forEach(function (v) { s += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 5) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + (100 * v) + "%</text>"; });
      ks.forEach(function (kk) { s += '<text x="' + x(kk) + '" y="' + (H - 12) + '" text-anchor="middle">' + kk + "</text>"; });
      s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 1) + '" text-anchor="middle">k (number of clusters)</text>';
      s += '<polyline class="rf-line" points="' + runs.map(function (r) { return x(r.k) + "," + y(r.ve); }).join(" ") + '"/>';
      runs.forEach(function (r) { s += '<circle class="rf-dot' + (r.k === k ? " rf-on" : "") + '" cx="' + x(r.k) + '" cy="' + y(r.ve) + '" r="' + (r.k === k ? 5 : 3.5) + '"><title>k = ' + r.k + ": " + (100 * r.ve).toFixed(1) + "%</title></circle>"; });
      $("rf-elbow").innerHTML = s;
    }
    function scatter(set, run) {
      var W = 320, H = 220, L = 44, R = 10, T = 10, B = 30, rfm = set.rfm;
      var maxR = Math.max.apply(null, rfm.map(function (r) { return r[0]; })) || 1, lo = Math.log10(Math.max(1, Math.min.apply(null, rfm.map(function (r) { return Math.max(r[2], 1); })))), hi = Math.log10(Math.max(10, Math.max.apply(null, rfm.map(function (r) { return r[2]; }))));
      if (hi - lo < 0.5) hi = lo + 0.5;
      var x = function (v) { return L + (W - L - R) * v / maxR; }, y = function (m) { return T + (H - T - B) * (1 - (Math.log10(Math.max(m, 1)) - lo) / (hi - lo)); };
      var s = '<line class="ax" x1="' + L + '" y1="' + (H - B) + '" x2="' + (W - R) + '" y2="' + (H - B) + '"/>';
      [lo, (lo + hi) / 2, hi].forEach(function (p) {
        var v = Math.pow(10, p), lab = v >= 1000 ? "$" + (v >= 10000 ? Math.round(v / 1000) : (v / 1000).toFixed(1)) + "k" : "$" + Math.round(v);
        s += '<text x="' + (L - 5) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + lab + "</text>";
      });
      [0, Math.round(maxR / 2), maxR].forEach(function (v) { s += '<text x="' + x(v) + '" y="' + (H - 14) + '" text-anchor="middle">' + v + "</text>"; });
      s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 1) + '" text-anchor="middle">recency (days since last purchase)</text>';
      rfm.forEach(function (r, i) { s += '<circle cx="' + x(r[0]).toFixed(1) + '" cy="' + y(r[2]).toFixed(1) + '" r="2" style="fill:' + COLORS[run.labels[i]] + '"/>'; });
      $("rf-scatter").innerHTML = s;
    }
    function show() {
      var set = current(); if (!set) return;
      var k = Number($("rf-k").value), run = set.runs.filter(function (r) { return r.k === k; })[0];
      $("rf-k-out").textContent = k;
      if (!run) { $("rf-out").innerHTML = '<p class="lt-note">Too few customers for ' + k + " clusters.</p>"; return; }
      elbow(set, k); scatter(set, run);
      var groups = []; for (var c = 0; c < k; c++) groups.push({ c: c, n: 0, s: [0, 0, 0] });
      run.labels.forEach(function (l, i) { groups[l].n++; for (var j = 0; j < 3; j++) groups[l].s[j] += set.rfm[i][j]; });
      var means = groups.map(function (g) { return g.s.map(function (v) { return g.n ? v / g.n : 0; }); }), names = k === 4 ? segmentNames(means) : null;
      var order = groups.slice().sort(function (a, b) { return means[b.c][2] - means[a.c][2]; });
      var html = '<p class="lm-verdict">' + k + " clusters explain <b>" + (100 * run.ve).toFixed(1) + "%</b> of the variance in the scaled RFM features." +
        (mode === "project" && k === 4 ? ' <span class="lt-pill ok">FINDINGS: 93.9%</span>' : "") + "</p>";
      html += '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>' + (names ? "Segment" : "Cluster") + '</th><th class="num">Customers</th><th class="num">Recency (days)</th><th class="num">Purchases</th><th class="num">Spend</th></tr></thead><tbody>' +
        order.map(function (g, i) {
          return '<tr><td><span class="rf-key" style="background:' + COLORS[g.c] + '"></span>' + h(names ? names[g.c] : "Cluster " + (i + 1)) + '</td><td class="num">' + num(g.n) + '</td><td class="num">' + num(means[g.c][0], 1) +
            '</td><td class="num">' + num(means[g.c][1], 1) + '</td><td class="num">$' + num(means[g.c][2]) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      if (k !== 4) html += '<p class="lt-note">Names are given only at k = 4, the project\'s choice; other k values show clusters ordered by average spend.</p>';
      if (mode === "own") html += '<p class="lt-note">' + num(set.rfm.length) + " customers from " + num(set.rows) + " transactions" + (set.bad.length ? "; " + set.bad.length + " line" + (set.bad.length > 1 ? "s" : "") + " could not be read and " + (set.bad.length > 1 ? "were" : "was") + " skipped (line " + set.bad.slice(0, 8).join(", ") + (set.bad.length > 8 ? "..." : "") + ")" : "") + ". Read in your browser; nothing was uploaded. The names are the project's rules applied to your clusters, so check they fit your business before you use them.</p>";
      else html += '<p class="lt-note">2,000 synthetic customers from ' + num(set.tx) + " seeded transactions. The elbow chart shows each extra cluster explaining less; the project picked 4, where the curve bends.</p>";
      $("rf-out").innerHTML = html;
    }
    function useOwn(text, label) {
      var got = parseRows(text);
      if (!got.rows.length) { $("rf-out").innerHTML = '<p class="lt-note">No rows could be read. Use one row per purchase: customer, date (2025-03-01), amount.</p>'; return; }
      var r = rfmFromRows(got.rows);
      if (r.rfm.length < 3) { $("rf-out").innerHTML = '<p class="lt-note">At least 3 customers are needed to form clusters.</p>'; return; }
      if (r.rfm.length > 20000) { $("rf-out").innerHTML = '<p class="lt-note">Over 20,000 customers: use a sample, so the clustering stays quick in a browser.</p>'; return; }
      var set = prepare(r.rfm); set.rows = got.rows.length; set.bad = got.bad; sets.own = set;
      $("rf-own-name").textContent = label; $("rf-controls").hidden = false; show();
    }
    function setMode(m) {
      mode = m; $("rf-own-pick").hidden = m !== "own"; $("rf-out").innerHTML = "";
      $("rf-controls").hidden = !current(); $("rf-figs").hidden = !current();
      if (current()) { $("rf-figs").hidden = false; show(); }
    }
    $("rf-k").addEventListener("input", show);
    $("rf-file").addEventListener("change", function () {
      var f = this.files[0]; if (!f) return;
      if (f.size > 30 * 1024 * 1024) { $("rf-out").innerHTML = '<p class="lt-note">That file is over 30 MB. Upload a smaller export.</p>'; return; }
      f.text().then(function (t) { $("rf-figs").hidden = false; useOwn(t, f.name); });
    });
    $("rf-sample").addEventListener("click", function () {
      fetch("/lab/data/rfm/sample_transactions.csv").then(function (r) { return r.text(); }).then(function (t) { $("rf-figs").hidden = false; useOwn(t, "sample_transactions.csv (60 of the project's customers)"); });
    });
    document.querySelectorAll('input[name="rf-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    fetch("/lab/data/rfm/rfm.json").then(function (r) { return r.json(); }).then(function (d) {
      var set = prepare(d.customers); set.tx = d.transactions; sets.project = set;
      if (mode === "project") { $("rf-controls").hidden = false; $("rf-figs").hidden = false; show(); }
    }).catch(function () { $("rf-out").innerHTML = '<p class="lt-note">The customers could not be loaded.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
