// The Lab's survival-curve demo (templates/_lab_stats.html, #st-trials): the Clinical Trials project's simulated patients,
// filtered by the visitor, with Kaplan-Meier curves, log-rank tests and the adverse-event chi-square test computed on the page.
// The statistics functions are shared with tools/check_lab_trials.js, which holds them to lifelines and SciPy on every filter.
(function (root) {
  "use strict";

  // Kaplan-Meier estimate, as lifelines fits it: S drops at each death time by (1 - deaths / at risk); patients censored at a
  // death time still count as at risk there. Like lifelines, the product is taken as exp(sum of logs), so a curve that lands on
  // exactly 0.5 rounds the same way and the median agrees. Returns the step points from day 0.
  function kaplanMeier(days, deaths) {
    var order = days.map(function (d, i) { return i; }).sort(function (a, b) { return days[a] - days[b]; });
    var times = [0], surv = [1], atRisk = [days.length], logS = 0, n = days.length, i = 0;
    while (i < order.length) {
      var t = days[order[i]], d = 0, c = 0;
      while (i < order.length && days[order[i]] === t) { if (deaths[order[i]]) d++; else c++; i++; }
      if (t === 0) { n -= d + c; continue; }
      logS += Math.log(1 - d / n);
      times.push(t); surv.push(Math.exp(logS)); atRisk.push(n);
      n -= d + c;
    }
    return { times: times, survival: surv, atRisk: atRisk };
  }
  function survivalAt(km, t) {
    var s = 1;
    for (var i = 0; i < km.times.length && km.times[i] <= t; i++) s = km.survival[i];
    return s;
  }
  // The first time the curve is at or below one half (lifelines' median_survival_time_); null if it never gets there.
  function medianSurvival(km) {
    for (var i = 0; i < km.times.length; i++) if (km.survival[i] <= 0.5) return km.times[i];
    return null;
  }

  // Complementary error function (Numerical Recipes erfcc, fractional error under 1.2e-7).
  function erfc(x) {
    var z = Math.abs(x), t = 1 / (1 + 0.5 * z);
    var r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 +
            t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
    return x >= 0 ? r : 2 - r;
  }
  // Upper tail of the chi-square distribution, for the 1 and 2 degrees of freedom these tests use.
  function chi2Sf(x, dof) {
    if (dof === 1) return erfc(Math.sqrt(x / 2));
    if (dof === 2) return Math.exp(-x / 2);
    throw new Error("only 1 or 2 degrees of freedom");
  }

  // Two-group log-rank test (lifelines logrank_test): observed minus expected deaths in group A, over its hypergeometric variance.
  function logRank(daysA, deathsA, daysB, deathsB) {
    var all = daysA.concat(daysB), ts = Array.from(new Set(all.filter(function (t, i) { return (i < daysA.length ? deathsA[i] : deathsB[i - daysA.length]); })))
      .sort(function (a, b) { return a - b; });
    var oMinusE = 0, v = 0;
    ts.forEach(function (t) {
      var nA = 0, nB = 0, dA = 0, dB = 0;
      daysA.forEach(function (x, i) { if (x >= t) nA++; if (x === t && deathsA[i]) dA++; });
      daysB.forEach(function (x, i) { if (x >= t) nB++; if (x === t && deathsB[i]) dB++; });
      var n = nA + nB, d = dA + dB;
      oMinusE += dA - d * nA / n;
      if (n > 1) v += nA * nB * d * (n - d) / (n * n * (n - 1));
    });
    var stat = oMinusE * oMinusE / v;
    return { statistic: stat, p: chi2Sf(stat, 1) };
  }

  // Chi-square test of independence (SciPy chi2_contingency): Yates' continuity correction when there is 1 degree of freedom.
  function chiSquare(table) {
    var rows = table.map(function (r) { return r[0] + r[1]; }), cols = [0, 1].map(function (j) { return table.reduce(function (s, r) { return s + r[j]; }, 0); });
    var total = rows.reduce(function (a, b) { return a + b; }, 0), dof = (table.length - 1) * (cols.length - 1), stat = 0;
    if (cols.some(function (c) { return c === 0; })) return null;
    table.forEach(function (r, i) { r.forEach(function (o, j) {
      var e = rows[i] * cols[j] / total, diff = Math.abs(o - e);
      if (dof === 1) diff = Math.max(0, diff - Math.min(0.5, diff));
      stat += diff * diff / e;
    }); });
    return { statistic: stat, p: chi2Sf(stat, dof), dof: dof };
  }

  var api = { kaplanMeier: kaplanMeier, survivalAt: survivalAt, medianSurvival: medianSurvival, logRank: logRank, chiSquare: chiSquare, chi2Sf: chi2Sf };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabTrials = api;
  if (!document.getElementById("st-trials")) return;

  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  var CLS = { "Control": "tr-control", "Low-dosage": "tr-low", "High-dosage": "tr-high" };
  function fmtP(p) { return p < 0.0001 ? p.toExponential(1) : p.toFixed(4); }
  function pct(v) { return (100 * v).toFixed(1) + "%"; }

  function init() {
    var data = null;
    function filtered() {
      var g = $("tr-gender").value, band = data.age_bands[$("tr-age").value];
      return data.patients.filter(function (p) { return (g === "All" || p.gender === g) && p.age >= band[0] && p.age <= band[1]; });
    }
    function chart(curves) {
      var W = 560, H = 300, L = 44, R = 12, T = 12, B = 34, svg = $("tr-chart");
      var x = function (d) { return L + (W - L - R) * d / 365; }, y = function (s) { return T + (H - T - B) * (1 - s); };
      var out = '<line class="ax" x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) + '"/>';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (s) { out += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(s) + '" y2="' + y(s) + '"/><text x="' + (L - 6) + '" y="' + (y(s) + 4) + '" text-anchor="end">' + s.toFixed(2) + "</text>"; });
      [0, 90, 180, 270, 365].forEach(function (d) { out += '<text x="' + x(d) + '" y="' + (H - 16) + '" text-anchor="middle">' + d + "</text>"; });
      out += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 2) + '" text-anchor="middle">days since the trial began</text>';
      out += '<line class="tr-half" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0.5) + '" y2="' + y(0.5) + '"/>';
      curves.forEach(function (c) {
        var pts = "M" + x(0) + "," + y(1), km = c.km;
        for (var i = 1; i < km.times.length; i++) pts += "H" + x(km.times[i]) + "V" + y(km.survival[i]);
        pts += "H" + x(365);
        out += '<path class="tr-line ' + CLS[c.arm] + '" d="' + pts + '"/>';
      });
      svg.innerHTML = out;
    }
    function update() {
      var rows = filtered(), picked = data.arms.filter(function (a) { return $("tr-arm-" + CLS[a]).checked; });
      var curves = [], small = [];
      picked.forEach(function (arm) {
        var a = rows.filter(function (p) { return p.arm === arm; });
        if (a.length < data.min_arm) { small.push(arm + " (" + a.length + ")"); return; }
        curves.push({ arm: arm, n: a.length, rows: a, km: kaplanMeier(a.map(function (p) { return p.days; }), a.map(function (p) { return p.death; })) });
      });
      chart(curves);
      var html = '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Arm</th><th class="num">Patients</th><th class="num">Alive at day 365</th><th class="num">Median survival</th><th class="num">Adverse events</th></tr></thead><tbody>' +
        curves.map(function (c) {
          var med = medianSurvival(c.km), adv = c.rows.filter(function (p) { return p.adverse; }).length;
          return '<tr><td><span class="tr-key ' + CLS[c.arm] + '"></span>' + c.arm + '</td><td class="num">' + c.n + '</td><td class="num">' + pct(survivalAt(c.km, 365)) +
            '</td><td class="num">' + (med === null ? "not reached" : med + " days") + '</td><td class="num">' + pct(adv / c.n) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      if (curves.length >= 2) {
        var tests = [];
        for (var i = 0; i < curves.length; i++) for (var j = i + 1; j < curves.length; j++) {
          var a = curves[i], b = curves[j], r = logRank(a.rows.map(function (p) { return p.days; }), a.rows.map(function (p) { return p.death; }),
                                                      b.rows.map(function (p) { return p.days; }), b.rows.map(function (p) { return p.death; }));
          tests.push("<li>" + a.arm + " vs " + b.arm + ": statistic " + r.statistic.toFixed(2) + ", p = " + fmtP(r.p) + " " +
            (r.p < 0.05 ? '<span class="lt-pill ok">differs</span>' : '<span class="lt-pill idle">no clear difference</span>') + "</li>");
        }
        var chi = chiSquare(curves.map(function (c) { var adv = c.rows.filter(function (p) { return p.adverse; }).length; return [c.n - adv, adv]; }));
        html += '<p class="lt-sub">Survival (log-rank test)</p><ul class="tr-tests">' + tests.join("") + "</ul>";
        html += '<p class="lt-sub">Adverse events (chi-square test)</p><p class="tr-chi">' + (chi === null ? "No adverse events in these patients, so there is nothing to test."
          : "Statistic " + chi.statistic.toFixed(2) + " with " + chi.dof + " degree" + (chi.dof > 1 ? "s" : "") + " of freedom, p = " + fmtP(chi.p) + " " +
            (chi.p < 0.05 ? '<span class="lt-pill warn">rates differ</span>' : '<span class="lt-pill idle">no clear difference</span>')) + "</p>";
      } else {
        html += '<p class="lt-note">Pick at least two arms with ' + data.min_arm + " or more patients to compare them.</p>";
      }
      if (small.length) html += '<p class="lt-note">Left out, under ' + data.min_arm + " patients: " + small.join(", ") + ".</p>";
      html += '<p class="lt-note">' + rows.length + " of " + data.patients.length + " simulated patients match the filters. Small groups give wide uncertainty: a p-value here is a check on these patients, not a finding about the drug.</p>";
      $("tr-out").innerHTML = html;
    }
    fetch("/lab/data/trials.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      $("tr-age").innerHTML = Object.keys(d.age_bands).map(function (k) { return "<option>" + k + "</option>"; }).join("");
      ["tr-gender", "tr-age", "tr-arm-tr-control", "tr-arm-tr-low", "tr-arm-tr-high"].forEach(function (id) { $(id).addEventListener("change", update); });
      update();
    }).catch(function () { $("tr-out").innerHTML = '<p class="lt-note">The trial data could not be loaded.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
