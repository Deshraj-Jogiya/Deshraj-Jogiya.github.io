// Land-use emissions forecast explorer for the Lab: models/epa_forecast.py from Multi-State-Land-Use-Emissions-Analysis, rewritten
// for the browser. Each of EPA's 25 state land-use series is forecast a year ahead from its three previous years; the linear
// regression is fitted here on every series' years before 2018 and scored on 2018-2022, next to the project's Random Forest
// (predictions shipped from Python) and "last year's value". A visitor can paste their own yearly series and get the same test.
// Node (tools/check_lab_emissions.js) uses the pure functions; the browser also runs the UI.
(function (root) {
  "use strict";
  var LAGS = 3;

  // Rows of [lag1, lag2, lag3] -> next value. Python also feeds trend = lag1 - lag2, which is a combination of the lags, so a
  // least-squares fit gives the same predictions without it.
  function lagRows(years, values, lags) {
    var rows = [];
    for (var i = lags; i < values.length; i++) {
      var x = []; for (var k = 1; k <= lags; k++) x.push(values[i - k]);
      rows.push({ year: years[i], x: x, y: values[i] });
    }
    return rows;
  }

  // Ordinary least squares with an intercept, by the normal equations (a 4 x 4 system) and Gaussian elimination.
  function ols(rows) {
    var p = rows[0].x.length + 1, A = [], b = [], i, j, r;
    for (i = 0; i < p; i++) { A.push(new Array(p).fill(0)); b.push(0); }
    rows.forEach(function (row) {
      var z = [1].concat(row.x);
      for (i = 0; i < p; i++) { b[i] += z[i] * row.y; for (j = 0; j < p; j++) A[i][j] += z[i] * z[j]; }
    });
    for (i = 0; i < p; i++) {
      var piv = i; for (r = i + 1; r < p; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      var t = A[i]; A[i] = A[piv]; A[piv] = t; t = b[i]; b[i] = b[piv]; b[piv] = t;
      if (Math.abs(A[i][i]) < 1e-12) return null;
      for (r = i + 1; r < p; r++) { var f = A[r][i] / A[i][i]; for (j = i; j < p; j++) A[r][j] -= f * A[i][j]; b[r] -= f * b[i]; }
    }
    var w = new Array(p).fill(0);
    for (i = p - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < p; j++) s -= A[i][j] * w[j]; w[i] = s / A[i][i]; }
    return w;
  }
  function predict(w, x) { var s = w[0]; for (var k = 0; k < x.length; k++) s += w[k + 1] * x[k]; return s; }

  // 1 - WAPE: the sum of absolute errors over the sum of absolute actual values.
  function accuracy(actual, pred) {
    var e = 0, a = 0; for (var i = 0; i < actual.length; i++) { e += Math.abs(actual[i] - pred[i]); a += Math.abs(actual[i]); }
    return a ? 1 - e / a : NaN;
  }

  // The project's test: one regression fitted on every series' rows before testFrom, then each series' later years predicted from
  // its real previous values.
  function projectForecast(series, testFrom) {
    var train = [];
    series.forEach(function (s) {
      var rows = lagRows(s.years, s.values, LAGS);
      rows.forEach(function (r) { if (r.year < testFrom) train.push(r); });
      s._test = rows.filter(function (r) { return r.year >= testFrom; });
    });
    var w = ols(train);
    series.forEach(function (s) { s._lr = s._test.map(function (r) { return predict(w, r.x); }); });
    return w;
  }

  // A visitor's own series: hold out the last years (5, or a quarter of the rows if shorter), fit on the rest.
  function ownForecast(years, values) {
    var rows = lagRows(years, values, LAGS);
    var nTest = Math.min(5, Math.floor(rows.length / 4));
    if (rows.length - nTest < 6 || nTest < 2) return null;
    var train = rows.slice(0, rows.length - nTest), test = rows.slice(rows.length - nTest), w = ols(train);
    if (!w) return null;
    var actual = test.map(function (r) { return r.y; }), lr = test.map(function (r) { return predict(w, r.x); }), naive = test.map(function (r) { return r.x[0]; });
    return { test: test, lr: lr, naive: naive, accLr: accuracy(actual, lr), accNaive: accuracy(actual, naive), nTrain: train.length };
  }

  // "year,value" per line (header or blank lines skipped; comma, tab, semicolon or spaces between). Years must be consecutive.
  function parseSeries(text) {
    var pts = [], bad = [];
    String(text).split(/\r?\n/).forEach(function (line, i) {
      var t = line.trim(); if (!t) return;
      var parts = t.split(/[\s,;\t]+/), yr = Number(parts[0]), v = Number(String(parts[1] || "").replace(/[$,]/g, ""));
      if (parts.length >= 2 && /^\d{4}$/.test(parts[0]) && isFinite(v)) pts.push([yr, v]);
      else if (!(i === 0 && isNaN(yr))) bad.push(i + 1);
    });
    pts.sort(function (a, b) { return a[0] - b[0]; });
    var gaps = [];
    for (var i = 1; i < pts.length; i++) if (pts[i][0] !== pts[i - 1][0] + 1) gaps.push(pts[i - 1][0] + "-" + pts[i][0]);
    return { years: pts.map(function (p) { return p[0]; }), values: pts.map(function (p) { return p[1]; }), bad: bad, gaps: gaps };
  }

  var api = { LAGS: LAGS, lagRows: lagRows, ols: ols, predict: predict, accuracy: accuracy, projectForecast: projectForecast, ownForecast: ownForecast, parseSeries: parseSeries };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabEmissions = api;
  if (!document.getElementById("st-em")) return;

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function pct(v) { return isFinite(v) ? (100 * v).toFixed(1) + "%" : "n/a"; }
  function fmt(v) { var a = Math.abs(v); return a >= 1000 ? v.toLocaleString("en-US", { maximumFractionDigits: 0 }) : a >= 10 ? v.toFixed(1) : v.toFixed(2); }
  var STATES = { AL: "Alabama", CA: "California", FL: "Florida", TX: "Texas", WA: "Washington" };
  var LANDS = { forest: "Forest land", agriculture: "Cropland", shrubland: "Grassland", urban: "Settlements", wetland: "Wetlands" };

  // years/values: the full series; lines: [{cls, label, years, values}] drawn over the shaded test years.
  function chart(years, values, testYears, lines, unit) {
    var box = $("em-chart").parentNode.clientWidth || 640, W = Math.max(300, Math.min(640, box)), H = W < 480 ? 220 : 250, L = 52, R = 12, T = 12, B = 34;
    var all = values.slice(); lines.forEach(function (l) { all = all.concat(l.values); });
    var lo = Math.min.apply(null, all), hi = Math.max.apply(null, all); if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    var x0 = years[0], x1 = years[years.length - 1];
    var x = function (yr) { return L + (W - L - R) * (yr - x0) / Math.max(1, x1 - x0); }, y = function (v) { return T + (H - T - B) * (1 - (v - lo) / (hi - lo)); };
    var s = '<rect class="em-test" x="' + x(testYears[0] - 0.5) + '" y="' + T + '" width="' + (x(testYears[testYears.length - 1] + 0.5) - x(testYears[0] - 0.5)) + '" height="' + (H - T - B) + '"/>';
    s += '<text x="' + ((x(testYears[0] - 0.5) + x(testYears[testYears.length - 1] + 0.5)) / 2) + '" y="' + (T + 11) + '" text-anchor="middle">test years</text>';
    [lo + pad, (lo + hi) / 2, hi - pad].forEach(function (v) { s += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + fmt(v) + "</text>"; });
    if (lo < 0 && hi > 0) s += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    var step = Math.max(1, Math.ceil((x1 - x0) / (W < 480 ? 4 : 6)));
    for (var yr = x0; yr <= x1; yr += step) s += '<text x="' + x(yr) + '" y="' + (H - 16) + '" text-anchor="middle">' + yr + "</text>";
    s += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 2) + '" text-anchor="middle">' + h(unit) + "</text>";
    s += '<polyline class="em-act" points="' + years.map(function (yr, i) { return x(yr).toFixed(1) + "," + y(values[i]).toFixed(1); }).join(" ") + '"/>';
    lines.forEach(function (l) {
      s += '<polyline class="' + l.cls + '" points="' + l.years.map(function (yr, i) { return x(yr).toFixed(1) + "," + y(l.values[i]).toFixed(1); }).join(" ") + '"/>';
      l.years.forEach(function (yr, i) { s += '<circle class="' + l.cls + '-pt" cx="' + x(yr).toFixed(1) + '" cy="' + y(l.values[i]).toFixed(1) + '" r="3"><title>' + h(l.label) + ", " + yr + ": " + fmt(l.values[i]) + "</title></circle>"; });
    });
    $("em-chart").setAttribute("viewBox", "0 0 " + W + " " + H); $("em-chart").innerHTML = s;
  }
  function legend(withRf) {
    var items = [["act", "Actual"], ["lr", "Linear regression"]].concat(withRf ? [["rf", "Random Forest"]] : [], [["naive", "Last year's value"]]);
    return '<p class="em-legend">' + items.map(function (it) { return '<span class="em-li"><span class="em-k em-k-' + it[0] + '"></span>' + h(it[1]) + "</span>"; }).join("") + "</p>";
  }

  function init() {
    var data = null, mode = "project";
    function showProject() {
      var s = data.series.filter(function (z) { return z.state === $("em-state").value && z.land_type === $("em-land").value; })[0]; if (!s) return;
      var ty = s._test.map(function (r) { return r.year; }), actual = s._test.map(function (r) { return r.y; }), naive = s._test.map(function (r) { return r.x[0]; });
      var rf = s.holdout["Random Forest"];
      chart(s.years, s.values, ty, [{ cls: "em-lr", label: "Linear regression", years: ty, values: s._lr }, { cls: "em-rf", label: "Random Forest", years: ty, values: rf },
                                     { cls: "em-naive", label: "Last year's value", years: ty, values: naive }], "Tg CO2e per year (removals below zero)");
      var rows = [["Linear regression", accuracy(actual, s._lr), data.accuracy["Linear Regression"]], ["Random Forest", accuracy(actual, rf), data.accuracy["Random Forest"]],
                  ["Last year's value", accuracy(actual, naive), data.accuracy["Last year's value"]]];
      var best = rows.reduce(function (a, r) { return r[1] > a[1] ? r : a; });
      var html = legend(true) + '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Model</th><th class="num">This series</th><th class="num">All 25</th></tr></thead><tbody>' +
        rows.map(function (r) { return "<tr><td>" + h(r[0]) + (r === best ? ' <span class="lt-pill ok">best here</span>' : "") + '</td><td class="num">' + pct(r[1]) + '</td><td class="num">' + pct(r[2]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      html += '<p class="lt-note">Accuracy on 2018-2022 is 1 minus WAPE: the sum of absolute errors divided by the sum of absolute actual values. Across all 25 series last year\'s value wins (94.7%), so the project reports the baseline beside its models. ' +
        (s.values.some(function (v) { return v < 0; }) ? "Negative values are removals: this land takes in more CO2e than it releases. " : "") + "Every forecast uses only the real values of the three years before it. The regression was fitted in your browser just now; the Random Forest's predictions come from the project's Python.</p>";
      $("em-out").innerHTML = html;
    }
    function showOwn() {
      var got = parseSeries($("em-paste").value), msg = [];
      if (got.bad.length) msg.push(got.bad.length + " line" + (got.bad.length > 1 ? "s" : "") + " could not be read (line " + got.bad.slice(0, 6).join(", ") + (got.bad.length > 6 ? "..." : "") + ")");
      if (got.gaps.length) { $("em-chart").innerHTML = ""; $("em-out").innerHTML = '<p class="lt-note">Years must follow one another with no gaps; missing years between ' + h(got.gaps.slice(0, 4).join(", ")) + ". Fill them in or start after the gap.</p>"; return; }
      var f = got.values.length ? ownForecast(got.years, got.values) : null;
      if (!f) { $("em-chart").innerHTML = ""; $("em-out").innerHTML = '<p class="lt-note">At least 11 consecutive years are needed: 3 to start the lags, 6 to fit the model and 2 to test it.' + (msg.length ? " " + h(msg.join("; ")) + "." : "") + "</p>"; return; }
      var ty = f.test.map(function (r) { return r.year; });
      chart(got.years, got.values, ty, [{ cls: "em-lr", label: "Linear regression", years: ty, values: f.lr }, { cls: "em-naive", label: "Last year's value", years: ty, values: f.naive }], $("em-unit").value || "your values");
      var win = f.accLr > f.accNaive;
      var html = '<p class="lm-verdict">On your last ' + ty.length + " years, " + (win ? "the regression beats last year's value: <b>" + pct(f.accLr) + "</b> vs " + pct(f.accNaive) + "." : "last year's value is as good or better: <b>" + pct(f.accNaive) + "</b> vs the regression's " + pct(f.accLr) + ".") + "</p>";
      html += '<div class="lt-scroll"><table class="lt-table"><thead><tr><th class="num">Year</th><th class="num">Actual</th><th class="num">Regression</th><th class="num">Last year</th></tr></thead><tbody>' +
        f.test.map(function (r, i) { return '<tr><td class="num">' + r.year + '</td><td class="num">' + fmt(r.y) + '</td><td class="num">' + fmt(f.lr[i]) + '</td><td class="num">' + fmt(f.naive[i]) + "</td></tr>"; }).join("") + "</tbody></table></div>";
      html += '<p class="lt-note">The regression learned from your ' + f.nTrain + " earlier years only (the project's learned from 25 series at once), so a short series gives it little to go on. " +
        (win ? "" : "When a series moves slowly, repeating last year is hard to beat; that is what the project found on EPA's data too. ") + "Read in your browser; nothing was uploaded." + (msg.length ? " " + h(msg.join("; ")) + "." : "") + "</p>";
      $("em-out").innerHTML = legend(false) + html;
    }
    function show() { if (mode === "own") showOwn(); else if (data) showProject(); }
    var resized = null;
    window.addEventListener("resize", function () { clearTimeout(resized); resized = setTimeout(show, 200); });
    function setMode(m) { mode = m; $("em-project-pick").hidden = m !== "project"; $("em-own-pick").hidden = m !== "own"; show(); }
    document.querySelectorAll('input[name="em-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    $("em-state").addEventListener("change", show); $("em-land").addEventListener("change", show); $("em-run").addEventListener("click", showOwn);
    fetch("/lab/data/emissions/emissions.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d; projectForecast(d.series, d.test_from);
      $("em-state").innerHTML = Object.keys(STATES).map(function (k) { return '<option value="' + k + '"' + (k === "TX" ? " selected" : "") + ">" + STATES[k] + "</option>"; }).join("");
      $("em-land").innerHTML = Object.keys(LANDS).map(function (k) { return '<option value="' + k + '"' + (k === "forest" ? " selected" : "") + ">" + LANDS[k] + "</option>"; }).join("");
      show();
    }).catch(function () { $("em-out").innerHTML = '<p class="lt-note">The EPA series could not be loaded.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
