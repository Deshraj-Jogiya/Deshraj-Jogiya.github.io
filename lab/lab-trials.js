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

  // Your own data: one row per subject, "group, time, event" (event 1 = it happened, 0 = censored: still at risk when follow-up
  // ended). A header row and lines starting with # are skipped. Returns the groups in first-seen order and the line numbers
  // that could not be read.
  function parseOwn(text) {
    var groups = {}, order = [], bad = [], first = true;
    text.split(/\r?\n/).forEach(function (line, i) {
      var raw = line.trim();
      if (!raw || raw[0] === "#") return;
      var f = raw.split(/\s*[,;\t]\s*/);
      if (first) { first = false; if (f.length >= 3 && isNaN(parseFloat(f[1]))) return; }
      var t = Number(f[1]), e = f.length > 2 ? Number(f[2]) : NaN;
      if (f.length < 3 || !f[0] || f[1] === "" || !isFinite(t) || t < 0 || (e !== 0 && e !== 1)) { bad.push(i + 1); return; }
      if (!groups[f[0]]) { groups[f[0]] = { days: [], deaths: [] }; order.push(f[0]); }
      groups[f[0]].days.push(t); groups[f[0]].deaths.push(e);
    });
    return { groups: groups, order: order, bad: bad };
  }

  var api = { parseOwn: parseOwn, kaplanMeier: kaplanMeier, survivalAt: survivalAt, medianSurvival: medianSurvival, logRank: logRank, chiSquare: chiSquare, chi2Sf: chi2Sf };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabTrials = api;
  if (!document.getElementById("st-trials")) return;

  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  var CLS = { "Control": "tr-control", "Low-dosage": "tr-low", "High-dosage": "tr-high" };
  function fmtP(p) { return p < 0.0001 ? p.toExponential(1) : p.toFixed(4); }
  function pct(v) { return (100 * v).toFixed(1) + "%"; }

  function ticks(tmax) { // 4 or 5 round steps from 0 that stay inside the axis
    if (tmax === 365) return [0, 90, 180, 270, 365];
    var raw = tmax / 4, mag = Math.pow(10, Math.floor(Math.log10(raw))), step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (v) { return v >= raw; })[0];
    var out = []; for (var t = 0; t <= tmax + 1e-9; t += step) out.push(+t.toFixed(6)); return out;
  }

  function init() {
    var data = null;
    function filtered() {
      var g = $("tr-gender").value, band = data.age_bands[$("tr-age").value];
      return data.patients.filter(function (p) { return (g === "All" || p.gender === g) && p.age >= band[0] && p.age <= band[1]; });
    }
    function chart(curves, tmax, unit) {
      tmax = tmax || 365; unit = unit || "days since the trial began";
      var W = 560, H = 300, L = 44, R = 12, T = 12, B = 34, svg = $("tr-chart");
      var x = function (d) { return L + (W - L - R) * d / tmax; }, y = function (s) { return T + (H - T - B) * (1 - s); };
      var out = '<line class="ax" x1="' + L + '" y1="' + y(0) + '" x2="' + (W - R) + '" y2="' + y(0) + '"/>';
      [0, 0.25, 0.5, 0.75, 1].forEach(function (s) { out += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(s) + '" y2="' + y(s) + '"/><text x="' + (L - 6) + '" y="' + (y(s) + 4) + '" text-anchor="end">' + s.toFixed(2) + "</text>"; });
      ticks(tmax).forEach(function (d) { out += '<text x="' + x(d) + '" y="' + (H - 16) + '" text-anchor="middle">' + d + "</text>"; });
      out += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 2) + '" text-anchor="middle">' + unit + "</text>";
      out += '<line class="tr-half" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0.5) + '" y2="' + y(0.5) + '"/>';
      curves.forEach(function (c) {
        var pts = "M" + x(0) + "," + y(1), km = c.km;
        for (var i = 1; i < km.times.length; i++) pts += "H" + x(km.times[i]) + "V" + y(km.survival[i]);
        pts += "H" + x(tmax);
        out += '<path class="tr-line ' + (c.cls || CLS[c.arm]) + '" d="' + pts + '"/>';
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

    // Your own data: the same Kaplan-Meier and log-rank code on whatever the visitor pastes (up to 3 groups).
    var OWN_CLS = ["tr-high", "tr-control", "tr-low"];
    function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function ownUpdate() {
      var got = parseOwn($("tr-paste").value), unit = $("tr-unit").value.trim() || "time", names = got.order.slice(0, 3), html = "";
      var curves = names.map(function (g, i) {
        var d = got.groups[g];
        return { arm: g, cls: OWN_CLS[i], n: d.days.length, days: d.days, deaths: d.deaths, km: kaplanMeier(d.days, d.deaths) };
      });
      var tmax = Math.max.apply(null, [1].concat(curves.map(function (c) { return Math.max.apply(null, c.days); })));
      chart(curves, tmax, unit);
      if (!curves.length) { $("tr-out").innerHTML = '<p class="lt-note">No rows could be read. Use one row per subject: group, time, event (1 = it happened, 0 = censored).</p>'; return; }
      html += '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Group</th><th class="num">Subjects</th><th class="num">Events</th><th class="num">Censored</th><th class="num">Median time to event</th></tr></thead><tbody>' +
        curves.map(function (c) {
          var ev = c.deaths.reduce(function (a, b) { return a + b; }, 0), med = medianSurvival(c.km);
          return '<tr><td><span class="tr-key ' + c.cls + '"></span>' + esc(c.arm) + '</td><td class="num">' + c.n + '</td><td class="num">' + ev + '</td><td class="num">' + (c.n - ev) +
            '</td><td class="num">' + (med === null ? "not reached" : med + " " + esc(unit)) + "</td></tr>";
        }).join("") + "</tbody></table></div>";
      if (curves.length >= 2) {
        var tests = [];
        for (var i = 0; i < curves.length; i++) for (var j = i + 1; j < curves.length; j++) {
          var r = logRank(curves[i].days, curves[i].deaths, curves[j].days, curves[j].deaths);
          tests.push("<li>" + esc(curves[i].arm) + " vs " + esc(curves[j].arm) + ": statistic " + r.statistic.toFixed(2) + ", p = " + fmtP(r.p) + " " +
            (r.p < 0.05 ? '<span class="lt-pill ok">differs</span>' : '<span class="lt-pill idle">no clear difference</span>') + "</li>");
        }
        html += '<p class="lt-sub">Survival (log-rank test)</p><ul class="tr-tests">' + tests.join("") + "</ul>";
      } else html += '<p class="lt-note">Add a second group to compare curves.</p>';
      var notes = [];
      if (got.order.length > 3) notes.push("Only the first 3 groups are drawn; left out: " + got.order.slice(3).map(esc).join(", ") + ".");
      if (got.bad.length) notes.push(got.bad.length + " line" + (got.bad.length > 1 ? "s" : "") + " could not be read and " + (got.bad.length > 1 ? "were" : "was") + " skipped (line " + got.bad.slice(0, 8).join(", ") + (got.bad.length > 8 ? "..." : "") + "). Each needs a group, a time of 0 or more, and an event of 0 or 1.");
      if (curves.some(function (c) { return c.n < 10; })) notes.push("A group under 10 subjects gives a very rough curve and a weak test.");
      notes.push("Your data stays in this page; nothing is uploaded. The log-rank test assumes censoring is unrelated to the outcome, as in any trial analysis.");
      html += notes.map(function (n) { return '<p class="lt-note">' + n + "</p>"; }).join("");
      $("tr-out").innerHTML = html;
    }
    function setMode(m) {
      $("tr-trial-pick").hidden = m !== "trial"; $("tr-own-pick").hidden = m !== "own";
      if (m === "own") ownUpdate(); else if (data) update();
    }
    var ownTimer = 0;
    ["tr-paste", "tr-unit"].forEach(function (id) { $(id).addEventListener("input", function () { clearTimeout(ownTimer); ownTimer = setTimeout(ownUpdate, 250); }); });
    document.querySelectorAll('input[name="tr-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });

    fetch("/lab/data/trials.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      $("tr-age").innerHTML = Object.keys(d.age_bands).map(function (k) { return "<option>" + k + "</option>"; }).join("");
      ["tr-gender", "tr-age", "tr-arm-tr-control", "tr-arm-tr-low", "tr-arm-tr-high"].forEach(function (id) { $(id).addEventListener("change", update); });
      if (!$("tr-trial-pick").hidden) update();
    }).catch(function () { $("tr-out").innerHTML = '<p class="lt-note">The trial data could not be loaded.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
