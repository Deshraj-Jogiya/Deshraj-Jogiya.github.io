// The Lab's Benford audit demo (templates/lab_demos/st-benford.html): the Tax Anomaly project's synthetic ledger, or amounts
// the visitor pastes, tested against Benford's Law; and the project's risk score (Benford deviation plus Isolation Forest) with
// weights and threshold the visitor can move. Benford parts are recomputed here; Isolation Forest scores and tax-rate rule flags
// are read from the project's export. tools/check_lab_benford.js holds these functions to Python's results.
(function (root) {
  "use strict";
  var BENFORD = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return Math.log10(1 + 1 / d); });

  // First significant digit, the way models/audit_detection.py reads it: the number's digits with the point and leading zeros
  // removed. 0 when there is none.
  function firstDigit(x) {
    var s = String(Math.abs(x)).replace(".", "").replace(/^0+/, "");
    var d = s ? Number(s[0]) : 0;
    return d >= 1 && d <= 9 ? d : 0;
  }
  // Upper tail of chi-square with 8 degrees of freedom (exact for an even count: e^-y (1 + y + y^2/2 + y^3/6), y = x/2).
  function chi2Sf8(x) { var y = x / 2; return Math.exp(-y) * (1 + y + y * y / 2 + y * y * y / 6); }

  // Goodness of fit to Benford's Law: chi-square against the expected counts (SciPy chisquare) and the mean absolute deviation
  // of the shares, read against Nigrini's first-digit ranges.
  function benfordFit(digits, madRanges) {
    var counts = [0, 0, 0, 0, 0, 0, 0, 0, 0], n = 0;
    digits.forEach(function (d) { if (d >= 1 && d <= 9) { counts[d - 1]++; n++; } });
    var stat = 0, mad = 0;
    counts.forEach(function (c, i) { var e = BENFORD[i] * n; stat += (c - e) * (c - e) / e; mad += Math.abs(c / n - BENFORD[i]); });
    mad /= 9;
    var conformity = madRanges.filter(function (r) { return r[0] === null || mad <= r[0]; })[0][1];
    return { n: n, counts: counts, chi_square: stat, p: chi2Sf8(stat), mad: mad, conformity: conformity };
  }

  // Per-entry Benford score (calculate_benford_scores): how much more often the entry's first digit appears than Benford
  // expects, relative to that expectation, scaled so the most over-represented digit scores 1.
  function benfordScores(amounts) {
    var digits = amounts.map(firstDigit), counts = [0, 0, 0, 0, 0, 0, 0, 0, 0], valid = 0;
    digits.forEach(function (d) { if (d) { counts[d - 1]++; valid++; } });
    var dev = counts.map(function (c, i) { return Math.max(0, c / valid - BENFORD[i]) / BENFORD[i]; });
    var top = Math.max.apply(null, dev) || 1;
    return digits.map(function (d) { return d ? dev[d - 1] / top : 0; });
  }
  function riskScores(entries, benford, wBenford) {
    return entries.map(function (e, i) { return (wBenford * benford[i] + (1 - wBenford) * e.iforest) * 100; });
  }
  // Entries an auditor opens to reach 90% of the injected anomalies, rule hits first and then by risk (review_effort).
  function reviewEffort(entries, risk, share) {
    var need = Math.ceil(share * entries.filter(function (e) { return e.injected; }).length);
    var order = entries.map(function (e, i) { return i; }).sort(function (a, b) {
      return entries[b].rule - entries[a].rule || risk[b] - risk[a] || entries[a].id - entries[b].id;
    });
    var found = 0;
    for (var k = 0; k < order.length; k++) { found += entries[order[k]].injected; if (found >= need) return { need: need, opened: k + 1 }; }
    return { need: need, opened: order.length };
  }

  var api = { BENFORD: BENFORD, firstDigit: firstDigit, chi2Sf8: chi2Sf8, benfordFit: benfordFit, benfordScores: benfordScores,
              riskScores: riskScores, reviewEffort: reviewEffort };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabBenford = api;
  if (!document.getElementById("st-benford")) return;

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtP(p) { return p < 0.0001 ? p.toExponential(1) : p.toFixed(4); }
  function pct(v) { return (100 * v).toFixed(1) + "%"; }
  var PASTE = "Paste your own amounts";

  function init() {
    var data = null, benford = null;
    function chart(fit) {
      var W = 560, H = 240, L = 40, R = 10, T = 12, B = 30, svg = $("bf-chart");
      var shares = fit.counts.map(function (c) { return fit.n ? c / fit.n : 0; });
      var top = Math.max(0.35, Math.max.apply(null, shares) * 1.1), y = function (v) { return T + (H - T - B) * (1 - v / top); };
      var bw = (W - L - R) / 9, out = "";
      [0, 0.1, 0.2, 0.3].filter(function (v) { return v <= top; }).forEach(function (v) {
        out += '<line class="tr-grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + Math.round(v * 100) + "%</text>";
      });
      shares.forEach(function (s, i) {
        var x = L + i * bw;
        out += '<rect class="bf-bar" x="' + (x + bw * 0.18) + '" y="' + y(s) + '" width="' + (bw * 0.64) + '" height="' + (y(0) - y(s)) + '"><title>digit ' + (i + 1) + ": " + pct(s) + " of amounts, Benford expects " + pct(BENFORD[i]) + "</title></rect>";
        out += '<text x="' + (x + bw / 2) + '" y="' + (H - 14) + '" text-anchor="middle">' + (i + 1) + "</text>";
      });
      out += '<path class="bf-law" d="' + BENFORD.map(function (b, i) { return (i ? "L" : "M") + (L + i * bw + bw / 2) + "," + y(b); }).join("") + '"/>';
      BENFORD.forEach(function (b, i) { out += '<circle class="bf-dot" cx="' + (L + i * bw + bw / 2) + '" cy="' + y(b) + '" r="3.5"/>'; });
      out += '<line class="ax" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(0) + '" y2="' + y(0) + '"/><text x="' + ((L + W - R) / 2) + '" y="' + (H + 8) + '" text-anchor="middle">first digit</text>';
      svg.innerHTML = out;
    }
    function showFit() {
      var key = $("bf-data").value, digits;
      $("bf-paste-box").hidden = key !== PASTE;
      if (key === PASTE) {
        digits = ($("bf-paste").value.match(/-?\d[\d,]*\.?\d*/g) || []).map(function (s) { return firstDigit(Number(s.replace(/,/g, ""))); }).filter(Boolean);
        if (digits.length < 10) { $("bf-fit").innerHTML = '<p class="lt-note">Paste at least 10 amounts (one per line, or separated by spaces).</p>'; $("bf-chart").innerHTML = ""; return; }
      } else {
        digits = data.entries.filter(function (e) { return key === "All entries" || (key === "Injected anomalies only" ? e.injected : e.department === key); })
          .map(function (e) { return firstDigit(e.amount); });
      }
      var fit = benfordFit(digits, data.mad_ranges);
      chart(fit);
      var verdict = fit.p < 0.05 ? '<span class="lt-pill warn">departs from Benford</span>' : '<span class="lt-pill ok">consistent with Benford</span>';
      var html = '<p class="lm-verdict">' + fit.n + " amounts. Chi-square " + fit.chi_square.toFixed(2) + " (8 degrees of freedom), p = " + fmtP(fit.p) + " " + verdict + "</p>" +
        '<p class="tr-chi">Mean absolute deviation ' + fit.mad.toFixed(4) + ": Nigrini's range calls this <b>" + fit.conformity + "</b>.</p>";
      if (fit.n < 110) html += '<p class="lt-note">With only ' + fit.n + " amounts, neither test is reliable: the chi-square test wants at least 5 expected amounts per digit, which for digit 9 takes about 110 amounts, and Nigrini's ranges were set for about 1,000.</p>";
      else if (fit.n < 1000) html += '<p class="lt-note">With ' + fit.n + " amounts, chance alone moves the shares by a point or two, so the mean absolute deviation often lands outside Nigrini's ranges, which were set for about 1,000 amounts or more. The chi-square p-value is the better guide at this size.</p>";
      $("bf-fit").innerHTML = html;
    }
    function showRisk() {
      var w = Number($("bf-w").value) / 100, t = Number($("bf-t").value);
      $("bf-w-out").textContent = Math.round(w * 100) + "% (Isolation Forest " + Math.round(100 - w * 100) + "%)";
      $("bf-t-out").textContent = t;
      var risk = riskScores(data.entries, benford, w), total = data.entries.filter(function (e) { return e.injected; }).length;
      var layer = function (flag) {
        var f = 0, tp = 0;
        data.entries.forEach(function (e, i) { if (flag(e, i)) { f++; tp += e.injected; } });
        return '<td class="num">' + f + '</td><td class="num">' + tp + '</td><td class="num">' + (f ? pct(tp / f) : "-") + '</td><td class="num">' + pct(tp / total) + "</td>";
      };
      var effort = reviewEffort(data.entries, risk, 0.9);
      var top = data.entries.map(function (e, i) { return [e, risk[i]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
      $("bf-risk").innerHTML = '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Layer</th><th class="num">Flagged</th><th class="num">Real anomalies</th><th class="num">Precision</th><th class="num">Recall</th></tr></thead><tbody>' +
        "<tr><td>Risk score at " + t + " or more</td>" + layer(function (e, i) { return risk[i] >= t; }) + "</tr>" +
        "<tr><td>Tax-rate rule</td>" + layer(function (e) { return e.rule; }) + "</tr>" +
        "<tr><td>Either</td>" + layer(function (e, i) { return e.rule || risk[i] >= t; }) + "</tr></tbody></table></div>" +
        '<p class="tr-chi">Opening entries rule hits first, then by risk score, an auditor reaches ' + effort.need + " of the " + total + " injected anomalies after <b>" + effort.opened + "</b> of " + data.entries.length + " entries.</p>" +
        '<p class="lt-sub">Highest risk scores</p><div class="lt-scroll"><table class="lt-table"><thead><tr><th>Entry</th><th>Department</th><th class="num">Amount</th><th class="num">Risk</th><th>Injected?</th></tr></thead><tbody>' +
        top.map(function (p) { return "<tr><td>#" + p[0].id + "</td><td>" + h(p[0].department) + '</td><td class="num">' + p[0].amount.toLocaleString("en-US", { minimumFractionDigits: 2 }) +
          '</td><td class="num">' + p[1].toFixed(1) + "</td><td>" + (p[0].injected ? '<span class="lt-pill bad">yes</span>' : '<span class="lt-pill idle">no</span>') + "</td></tr>"; }).join("") + "</tbody></table></div>";
    }
    fetch("/lab/data/benford.json").then(function (r) { return r.json(); }).then(function (d) {
      data = d; benford = benfordScores(d.entries.map(function (e) { return e.amount; }));
      $("bf-data").innerHTML = Object.keys(d.fits).concat([PASTE]).map(function (k) { return "<option>" + h(k) + "</option>"; }).join("");
      $("bf-data").addEventListener("change", showFit);
      $("bf-paste").addEventListener("input", showFit);
      ["bf-w", "bf-t"].forEach(function (id) { $(id).addEventListener("input", showRisk); });
      showFit(); showRisk();
    }).catch(function () { $("bf-fit").innerHTML = '<p class="lt-note">The ledger could not be loaded.</p>'; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
