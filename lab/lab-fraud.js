// The Lab's fraud-rule tester (templates/_lab_stats.html, #st-fraud): the FinRisk project's 345,524 simulated card transactions,
// with its three rules (etl/fraud_rules.py) retuned by the visitor and every alert recomputed here. tools/check_lab_fraud.js holds
// these rules to Python's at the project's settings and four others.
(function (root) {
  "use strict";

  // transactions.bin: four little-endian columns one after another (customer uint16, seconds uint32, cents uint32, flags uint8),
  // sorted by customer, then time.
  function parse(buffer, rows) {
    var dv = new DataView(buffer), customer = new Uint16Array(rows), seconds = new Uint32Array(rows), amount = new Float64Array(rows), flags = new Uint8Array(rows);
    var o2 = 2 * rows, o3 = 6 * rows, o4 = 10 * rows;
    for (var i = 0; i < rows; i++) {
      customer[i] = dv.getUint16(2 * i, true);
      seconds[i] = dv.getUint32(o2 + 4 * i, true);
      amount[i] = dv.getUint32(o3 + 4 * i, true) / 100; // whole cents, so this is the same number Python read
      flags[i] = dv.getUint8(o4 + i);
    }
    return { rows: rows, customer: customer, seconds: seconds, amount: amount, flags: flags };
  }

  // The three rules on every transaction. velocity: count or more of a customer's transactions within any window (in minutes),
  // flagging every transaction in such a window; spike: amount over multiple x the customer's median; foreign: the
  // "International / Online" location.
  function runRules(tx, count, minutes, multiple, useForeign) {
    var n = tx.rows, velocity = new Uint8Array(n), spike = new Uint8Array(n), win = minutes * 60;
    for (var a = 0; a < n;) {
      var b = a;
      while (b < n && tx.customer[b] === tx.customer[a]) b++;
      var start = a;
      for (var end = a; end < b; end++) {
        while (tx.seconds[end] - tx.seconds[start] > win) start++;
        if (end - start + 1 >= count) for (var k = start; k <= end; k++) velocity[k] = 1;
      }
      var amounts = Array.prototype.slice.call(tx.amount, a, b).sort(function (x, y) { return x - y; }), m = amounts.length;
      var median = m % 2 ? amounts[(m - 1) / 2] : (amounts[m / 2 - 1] + amounts[m / 2]) / 2, limit = multiple * median;
      for (var j = a; j < b; j++) if (tx.amount[j] > limit) spike[j] = 1;
      a = b;
    }
    var out = { velocity: [0, 0], amount_spike: [0, 0], foreign_location: [0, 0], any_rule: [0, 0] };
    for (var i = 0; i < n; i++) {
      var fraud = (tx.flags[i] >> 1) & 1, foreign = useForeign && (tx.flags[i] & 1);
      if (velocity[i]) { out.velocity[0]++; out.velocity[1] += fraud; }
      if (spike[i]) { out.amount_spike[0]++; out.amount_spike[1] += fraud; }
      if (foreign) { out.foreign_location[0]++; out.foreign_location[1] += fraud; }
      if (velocity[i] || spike[i] || foreign) { out.any_rule[0]++; out.any_rule[1] += fraud; }
    }
    return out;
  }

  // Your own transactions, as CSV text: customer, time, amount, then optionally foreign (1/0, yes/no, or a location: anything
  // but blank, 0, no, false or domestic counts as foreign) and fraud (1/0, for scoring the rules). Time is an ISO date-time or
  // a number of seconds. Returns the same columns parse() gives, sorted by customer then time, and the lines it skipped.
  var TRUE_WORDS = /^(1|y|yes|true)$/i, DOMESTIC = /^(|0|n|no|false|domestic)$/i;
  function parseTransactions(text) {
    var rows = [], bad = [], first = true, hasFraud = false;
    text.split(/\r?\n/).forEach(function (line, i) {
      var raw = line.trim();
      if (!raw || raw[0] === "#") return;
      var f = raw.split(/\s*[,;\t]\s*/);
      if (first) { first = false; if (f.length >= 3 && isNaN(Number(f[2]))) return; } // a header row
      var t = /^-?\d+(\.\d+)?$/.test(f[1] || "") ? Number(f[1]) : Date.parse(f[1]) / 1000, amount = Number(f[2]);
      if (f.length < 3 || !f[0] || !isFinite(t) || !isFinite(amount) || amount < 0) { bad.push(i + 1); return; }
      var fraud = f.length > 4 && TRUE_WORDS.test(f[4]);
      if (f.length > 4) hasFraud = true;
      rows.push({ c: f[0], t: t, a: amount, flags: (f.length > 3 && !DOMESTIC.test(f[3]) ? 1 : 0) + (fraud ? 2 : 0) });
    });
    rows.sort(function (x, y) { return x.c < y.c ? -1 : x.c > y.c ? 1 : x.t - y.t; });
    var n = rows.length, ids = {}, next = 0, tx = { rows: n, customer: new Uint32Array(n), seconds: new Float64Array(n), amount: new Float64Array(n), flags: new Uint8Array(n) };
    rows.forEach(function (r, i) {
      if (!(r.c in ids)) ids[r.c] = next++;
      tx.customer[i] = ids[r.c]; tx.seconds[i] = r.t; tx.amount[i] = r.a; tx.flags[i] = r.flags;
    });
    return { tx: tx, customers: next, hasFraud: hasFraud, bad: bad };
  }

  var api = { parse: parse, runRules: runRules, parseTransactions: parseTransactions };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabFraud = api;
  if (!document.getElementById("st-fraud")) return;

  var $ = function (id) { return document.getElementById(id); };
  function pct(v) { return (100 * v).toFixed(1) + "%"; }
  function num(v) { return v.toLocaleString("en-US"); }
  var LABELS = { velocity: "Velocity", amount_spike: "Amount spike", foreign_location: "Foreign location", any_rule: "Any rule" };

  function init() {
    var meta = null, sim = null, own = null, mode = "sim", timer = 0;
    function read() {
      var c = Number($("fr-count").value), w = Number($("fr-window").value), m = Number($("fr-multiple").value);
      $("fr-count-out").textContent = c; $("fr-window-out").textContent = w + " min"; $("fr-multiple-out").textContent = m + " x";
      return [c, w, m, $("fr-foreign").checked];
    }
    function show() {
      var s = read(), cur = mode === "sim" ? sim : own;
      if (!cur) return;
      if (!cur.tx.rows) { $("fr-out").innerHTML = '<p class="lt-note">No rows could be read. Use one row per charge: customer, time, amount.</p>'; return; }
      var t0 = performance.now(), r = runRules(cur.tx, s[0], s[1], s[2], s[3]), ms = performance.now() - t0, fraud = cur.fraud, scored = fraud !== null;
      var base = mode === "sim" && s[0] === 5 && s[1] === 10 && s[2] === 7 && s[3];
      var head = "<th>Rule</th><th class=\"num\">Alerts</th>" + (scored ? '<th class="num">Real fraud caught</th><th class="num">Precision</th><th class="num">Recall</th><th class="num">False alarms</th>' : "");
      var html = '<div class="lt-scroll"><table class="lt-table"><thead><tr>' + head + "</tr></thead><tbody>" +
        Object.keys(LABELS).map(function (k) {
          var a = r[k][0], tp = r[k][1];
          return "<tr" + (k === "any_rule" ? ' class="fr-total"' : "") + "><td>" + LABELS[k] + '</td><td class="num">' + num(a) + "</td>" + (scored ? '<td class="num">' + num(tp) +
            '</td><td class="num">' + (a ? pct(tp / a) : "-") + '</td><td class="num">' + (fraud ? pct(tp / fraud) : "-") + '</td><td class="num">' + num(a - tp) + "</td>" : "") + "</tr>";
        }).join("") + "</tbody></table></div>";
      if (mode === "sim") html += '<p class="lt-note">' + num(meta.rows) + " transactions from " + num(meta.customers) + " customers, " + num(fraud) + " of them planted fraud. Recomputed in " + Math.round(ms) + " ms." +
        (base ? " These are the project's own settings, matching its FINDINGS." : "") + "</p>";
      else {
        html += '<p class="lt-note">' + num(cur.tx.rows) + " charges from " + num(cur.customers) + " customer" + (cur.customers === 1 ? "" : "s") +
          (scored ? ", " + num(fraud) + " marked as fraud." : ", with no fraud column, so only the alerts are shown.") + " Recomputed in " + Math.round(ms) + " ms.</p>";
        if (cur.bad.length) html += '<p class="lt-note">' + cur.bad.length + " line" + (cur.bad.length > 1 ? "s" : "") + " could not be read and " + (cur.bad.length > 1 ? "were" : "was") + " skipped (line " +
          cur.bad.slice(0, 8).join(", ") + (cur.bad.length > 8 ? "..." : "") + "). Each needs a customer, a time and an amount of 0 or more.</p>";
        html += '<p class="lt-note">The spike rule compares each charge with that customer\'s own median, so a customer with only a few charges gives it little to go on. These are screening rules, not a fraud model: on the simulated data they catch most planted fraud at the cost of many false alarms.</p>';
      }
      $("fr-out").innerHTML = html;
    }
    function schedule() { read(); clearTimeout(timer); timer = setTimeout(show, 120); }
    function readOwn() {
      var got = parseTransactions($("fr-paste").value), fraud = 0;
      for (var i = 0; i < got.tx.rows; i++) fraud += (got.tx.flags[i] >> 1) & 1;
      own = { tx: got.tx, customers: got.customers, bad: got.bad, fraud: got.hasFraud ? fraud : null };
      show();
    }
    function setMode(m) {
      mode = m; $("fr-sim-pick").hidden = m !== "sim" || !!sim; $("fr-own-pick").hidden = m !== "own";
      $("fr-controls").hidden = m === "sim" ? !sim : false; $("fr-out").innerHTML = "";
      if (m === "own") readOwn(); else show();
    }
    ["fr-count", "fr-window", "fr-multiple", "fr-foreign"].forEach(function (id) { $(id).addEventListener("input", schedule); $(id).addEventListener("change", schedule); });
    var ownTimer = 0;
    $("fr-paste").addEventListener("input", function () { clearTimeout(ownTimer); ownTimer = setTimeout(readOwn, 250); });
    $("fr-file").addEventListener("change", function () {
      var file = this.files[0]; if (!file) return;
      if (file.size > 20 * 1024 * 1024) { $("fr-out").innerHTML = '<p class="lt-note">That file is over 20 MB. Upload a smaller export (a few hundred thousand rows at most).</p>'; return; }
      file.text().then(function (text) { $("fr-paste").value = text.length > 200000 ? "" : text; var got = parseTransactions(text), fraud = 0;
        for (var i = 0; i < got.tx.rows; i++) fraud += (got.tx.flags[i] >> 1) & 1;
        own = { tx: got.tx, customers: got.customers, bad: got.bad, fraud: got.hasFraud ? fraud : null };
        if (!$("fr-paste").value) $("fr-paste").placeholder = file.name + " is loaded (too large to show here).";
        show(); });
    });
    document.querySelectorAll('input[name="fr-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
    $("fr-load").addEventListener("click", function () {
      var btn = this; btn.disabled = true; $("fr-out").innerHTML = '<p class="lt-note">Downloading 345,524 transactions (about 3.8 MB)...</p>';
      fetch("/lab/data/fraud/rules.json").then(function (r) { return r.json(); }).then(function (m) {
        meta = m;
        return fetch("/lab/data/fraud/transactions.bin").then(function (r) { if (!r.ok) throw new Error(); return r.arrayBuffer(); });
      }).then(function (buf) {
        sim = { tx: parse(buf, meta.rows), fraud: meta.planted_fraud }; $("fr-sim-pick").hidden = true;
        if (mode === "sim") { $("fr-controls").hidden = false; show(); }
      }).catch(function () { btn.disabled = false; $("fr-out").innerHTML = '<p class="lt-note">The transactions could not be downloaded. Check your connection and try again.</p>'; });
    });
    read();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
