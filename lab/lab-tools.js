// The Lab's seven tabbed demos (templates/_lab_tools.html). Everything runs in the page: no requests except the
// site's own projects.json and the fit samples, no storage, no tracking. Each tool's numbers come from what the
// visitor does here.
(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(x, d) { return Number(x).toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function pill(kind, text) { return '<span class="lt-pill ' + kind + '">' + h(text) + "</span>"; }
  function rng(seed) { // mulberry32
    return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  function normal(r) { var u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function svgEl(w, hgt, body, label) {
    return '<svg class="lt-svg" viewBox="0 0 ' + w + " " + hgt + '" role="img" aria-label="' + h(label) + '">' + body + "</svg>";
  }

  if (!document.getElementById("more-demos")) return;

  // ------------------------------------------------------------------ 1. job fit
  function initFit() {
    var sel = $("fit-sample"), profile = null, samples = [];
    Promise.all([fetch("/projects.json").then(function (r) { return r.json(); }),
                 fetch("/lab/fit_samples.json").then(function (r) { return r.json(); })])
      .then(function (res) {
        profile = window.LabFit.profileFromSite(res[0]); samples = res[1];
        sel.innerHTML = samples.map(function (s, i) { return '<option value="' + i + '">Sample: ' + h(s.name) + "</option>"; }).join("") +
          '<option value="own">My own job description</option>';
        load(0);
      })
      .catch(function () { $("fit-out").innerHTML = '<p class="lt-callout bad">The profile could not be loaded. Reload the page to try again.</p>'; });
    function load(i) { $("fit-title").value = samples[i].title; $("fit-posting").value = samples[i].posting; $("fit-out").innerHTML = ""; }
    sel.addEventListener("change", function () {
      if (sel.value === "own") { $("fit-title").value = ""; $("fit-posting").value = ""; $("fit-out").innerHTML = ""; $("fit-title").focus(); }
      else load(+sel.value);
    });
    ["fit-title", "fit-posting"].forEach(function (id) { $(id).addEventListener("input", function () { if (sel.value !== "own") sel.value = "own"; }); });
    $("fit-run").addEventListener("click", function () {
      if (!profile) return;
      var title = $("fit-title").value.trim(), jd = $("fit-posting").value;
      if (!jd.trim()) { $("fit-out").innerHTML = '<p class="lt-callout">Paste a job description first.</p>'; return; }
      render(window.LabFit.rulesFit(profile, title, jd, []));
    });
    function render(f) {
      var s = f.skills, y = f.years, o = [];
      var verdict = f.cap_reason ? "Capped: the role type is not one this profile targets."
        : s.requirements_found === 0 ? "No technical requirements this check recognises, so the skill part scores 0."
        : f.score >= 75 ? "Strong fit on the requirements this check can measure."
        : f.score >= 50 ? "Partial fit: some requirements are not backed by the profile." : "Weak fit on the measurable requirements.";
      o.push('<div class="lt-score"><span class="lt-score-num">' + f.score + '<small>/100</small></span><span class="lt-score-text">' + h(verdict) + "</span></div>");
      if (f.cap_reason) o.push('<p class="lt-callout bad">' + h(f.cap_reason) + " Before the cap it was " + f.uncapped_score + ".</p>");
      var parts = [["Skill overlap (60%)", f.parts.skills, 0.6], ["Role type (20%)", f.parts.role, 0.2], ["Years asked for (20%)", f.parts.years, 0.2]];
      o.push('<div class="lt-bars">' + parts.map(function (p) {
        return '<div class="lt-bar"><span>' + p[0] + '</span><span class="lt-bar-track"><span class="lt-bar-fill" style="width:' + p[1] + '%"></span></span><span class="lt-bar-val">' + p[1] + "</span></div>";
      }).join("") + "</div>");
      var role = f.role;
      o.push('<p class="lt-note">Role type: the posting reads as <b>' + h(role.posting_family_label) + "</b>; the profile targets or has held " +
        h(role.profile_family_labels.join(", ")) + ". " + ({ match: "That's a match.", mismatch: "No overlap.", unknown: "The title isn't one the rules classify, so this part counts half." })[role.status] + "</p>");
      o.push('<p class="lt-note">Years: ' + (y.required_years ? "the posting asks for " + y.required_years + "+; " : "the posting names no minimum; ") +
        "the profile shows " + y.profile_years.toFixed(1) + " (overlapping roles counted once)." +
        (s.requirements_found ? "" : " Years only count beside measurable requirements, so they add nothing here.") + "</p>");
      var rows = [];
      s.matched.forEach(function (m) { rows.push([m.term, m.required, pill("ok", "found"), m.evidence + (m.alternatives ? " (posting also accepts " + m.alternatives.join(", ") + ")" : "")]); });
      s.transferable.forEach(function (m) { rows.push([m.term, m.required, pill("warn", "comparable tool"), m.via + ", in " + m.evidence + ". Half credit."]); });
      s.missing.forEach(function (m) { rows.push([m.term, m.required, pill("bad", "not found"), "Not in the profile's experience, projects, skills or certificates."]); });
      if (rows.length) {
        o.push('<h4 class="lt-sub">' + s.requirements_found + " requirements found (" + s.matched.length + " met, " + s.transferable.length + " comparable, " + s.missing.length + " missing)</h4>");
        o.push('<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Requirement</th><th>Asked as</th><th>Result</th><th>Where in the profile</th></tr></thead><tbody>' +
          rows.map(function (r) { return "<tr><td>" + h(r[0]) + "</td><td>" + (r[1] ? "required" : "preferred (half weight)") + "</td><td>" + r[2] + "</td><td>" + h(r[3]) + "</td></tr>"; }).join("") +
          "</tbody></table></div>");
      }
      o.push('<p class="lt-note">It recognises about 100 technical terms plus every skill this profile lists. It doesn\'t score soft skills, domain knowledge or seniority.</p>');
      $("fit-out").innerHTML = o.join("");
    }
  }

  // ------------------------------------------------------------------ 2. data contract
  function initContract() {
    var INDUSTRIES = ["Technology", "Finance", "Healthcare", "Retail", "Energy"], LEVELS = ["Entry", "Mid", "Senior"];
    var COMPANIES = ["Northwind", "Contoso", "Fabrikam", "Tailspin", "Litware", "Adatum", "Proseware", "Wingtip"];
    function batch(seed, start, day) {
      var r = rng(seed), rows = [];
      for (var i = 0; i < 40; i++) {
        var lvl = LEVELS[Math.floor(r() * 3)], base = { Entry: 78000, Mid: 112000, Senior: 151000 }[lvl];
        rows.push({ posting_id: String(start + i), company: COMPANIES[Math.floor(r() * COMPANIES.length)],
          industry: INDUSTRIES[Math.floor(r() * INDUSTRIES.length)], seniority: lvl,
          salary_usd: String(Math.round((base + normal(r) * 14000) / 500) * 500), posted_date: "2026-10-" + String(day).padStart(2, "0"),
          remote: r() < 0.4 ? "true" : "false" });
      }
      return rows;
    }
    var COLS = ["posting_id", "company", "industry", "seniority", "salary_usd", "posted_date", "remote"];
    var data = { reference: batch(11, 1001, 5), tuesday: batch(12, 1041, 6), wednesday: batch(13, 1081, 7), thursday: batch(14, 1121, 8) };
    var tu = data.tuesday; tu[3].salary_usd = ""; tu[17].salary_usd = ""; tu[29].salary_usd = ""; tu[8].salary_usd = "N/A"; tu[22].posted_date = "2026-10-32"; tu[35].company = "";
    var we = data.wednesday; we[12].posting_id = we[11].posting_id; we[30].posting_id = we[2].posting_id; we[5].industry = "Fintech"; we[19].salary_usd = "1250000"; we[26].seniority = "Principal";
    var own = null;
    function toCsv(rows) { return [COLS.join(",")].concat(rows.map(function (r) { return COLS.map(function (c) { return r[c]; }).join(","); })).join("\n"); }
    Object.keys(data).forEach(function (k) { data[k] = parseCsv(toCsv(data[k])); });

    function parseCsv(text) {
      var rows = [], row = [], f = "", q = false;
      for (var i = 0; i < text.length; i++) {
        var c = text[i];
        if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
        else if (c === '"') q = true;
        else if (c === ",") { row.push(f); f = ""; }
        else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
        else f += c;
      }
      if (f !== "" || row.length) { row.push(f); rows.push(row); }
      rows = rows.filter(function (r) { return r.length > 1 || r[0] !== ""; });
      var head = (rows.shift() || []).map(function (s) { return s.trim(); });
      return { columns: head, rows: rows.map(function (r) { var o = {}; head.forEach(function (c, j) { o[c] = r[j] === undefined ? "" : r[j]; }); return o; }) };
    }
    function isNull(v) { return v === undefined || String(v).trim() === ""; }
    function typeOf(v) {
      v = String(v).trim();
      if (/^-?\d+$/.test(v)) return "int";
      if (/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(v)) return "float";
      if (/^(true|false)$/i.test(v)) return "bool";
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
      if (m) { var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); if (d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return "date"; return "baddate"; }
      return "str";
    }
    function colType(vals) {
      var t = new Set(vals.map(typeOf));
      if (t.size === 1) { var only = Array.from(t)[0]; return only === "baddate" ? "str" : only; }
      if (t.size === 2 && t.has("int") && t.has("float")) return "float";
      return "str";
    }
    var TYPE_WORD = { int: "a whole number", float: "a number", bool: "true or false", date: "a real date (YYYY-MM-DD)" };
    var TYPE_NAME = { int: "INTEGER", float: "FLOAT", bool: "BOOLEAN", date: "DATE", str: "STRING" };
    function okType(want, v) { var t = typeOf(v); return want === "str" || t === want || (want === "float" && t === "int"); }

    function infer(ds) {
      var ex = [{ id: "cols", say: "Same columns as the good file", name: "expect_table_columns_to_match_set", args: ds.columns.join(", "), cols: ds.columns.slice(),
        test: function (b) { var miss = this.cols.filter(function (c) { return b.columns.indexOf(c) === -1; }), extra = b.columns.filter(function (c) { return this.cols.indexOf(c) === -1; }, this);
          return { bad: miss.length + extra.length, msg: (miss.length ? "missing: " + miss.join(", ") : "") + (extra.length ? (miss.length ? "; " : "") + "unexpected: " + extra.join(", ") : "") }; } },
        { id: "rows", say: "The file isn't empty", name: "expect_table_row_count_to_be_between", args: "min_value=1", test: function (b) { return { bad: b.rows.length ? 0 : 1, msg: b.rows.length + " rows" }; } }];
      var n = ds.rows.length;
      ds.columns.forEach(function (c) {
        var vals = ds.rows.map(function (r) { return r[c]; }), present = vals.filter(function (v) { return !isNull(v); });
        if (!present.length) return;
        var t = colType(present);
        function rowsWhere(b, pred) { var out = []; b.rows.forEach(function (r, i) { if (b.columns.indexOf(c) !== -1 && pred(r[c])) out.push([i + 2, r[c]]); }); return out; }
        if (present.length === n) ex.push({ id: c + ":nn", col: c, say: c + " is never empty", name: "expect_column_values_to_not_be_null", args: 'column="' + c + '"',
          test: function (b) { return { rows: rowsWhere(b, isNull) }; } });
        if (t !== "str") ex.push({ id: c + ":type", col: c, say: c + " is always " + TYPE_WORD[t], name: "expect_column_values_to_be_of_type", args: 'column="' + c + '", type_="' + TYPE_NAME[t] + '"',
          test: function (b) { return { rows: rowsWhere(b, function (v) { return !isNull(v) && !okType(t, v); }) }; } });
        var distinct = new Set(present);
        if (distinct.size === n && (/(^|_)id$/i.test(c) || t === "int" && /id/i.test(c))) ex.push({ id: c + ":uniq", col: c, say: "No two rows share the same " + c, name: "expect_column_values_to_be_unique", args: 'column="' + c + '"',
          test: function (b) { var seen = {}, dup = []; b.rows.forEach(function (r, i) { var v = r[c]; if (isNull(v)) return; if (seen[v]) dup.push([i + 2, v + " (also row " + seen[v] + ")"]); else seen[v] = i + 2; }); return { rows: dup }; } });
        if (t === "int" || t === "float") {
          var nums = present.map(Number), lo = Math.min.apply(null, nums), hi = Math.max.apply(null, nums), pad = (hi - lo) * 0.1;
          var mn = Math.max(lo >= 0 ? 0 : -Infinity, Math.floor(lo - pad)), mx = Math.ceil(hi + pad);
          if (!/(^|_)id$/i.test(c)) ex.push({ id: c + ":range", col: c, say: c + " stays between " + fmt(mn) + " and " + fmt(mx), name: "expect_column_values_to_be_between", args: 'column="' + c + '", min_value=' + mn + ", max_value=" + mx,
            test: function (b) { return { rows: rowsWhere(b, function (v) { return !isNull(v) && okType("float", v) && (Number(v) < mn || Number(v) > mx); }) }; } });
        }
        if (t === "str" && distinct.size <= 8 && n >= 10 && distinct.size < n / 3) {
          var set = Array.from(distinct).sort();
          ex.push({ id: c + ":set", col: c, say: c + " is one of: " + set.join(", "), name: "expect_column_values_to_be_in_set", args: 'column="' + c + '", value_set=[' + set.map(function (s) { return '"' + s + '"'; }).join(", ") + "]",
            test: function (b) { return { rows: rowsWhere(b, function (v) { return !isNull(v) && set.indexOf(v) === -1; }) }; } });
        }
        if (t === "date") {
          ex.push({ id: c + ":future", col: c, say: c + " is not in the future", name: "expect_column_values_to_be_between", args: 'column="' + c + '", max_value=today',
            test: function (b) { var today = new Date().toISOString().slice(0, 10); return { rows: rowsWhere(b, function (v) { return typeOf(v) === "date" && v > today; }) }; } });
        }
      });
      return ex;
    }

    var refSel = $("gx-ref"), batchSel = $("gx-batch"), out = $("gx-out");
    function current(sel) { return sel.value === "own" ? own : data[sel.value]; }
    $("gx-file").addEventListener("change", function (e) {
      var file = e.target.files[0]; if (!file) return;
      if (file.size > 5 * 1024 * 1024) { out.innerHTML = '<p class="lt-callout bad">That file is over 5 MB. Try a smaller extract.</p>'; return; }
      var rd = new FileReader();
      rd.onload = function () {
        var ds = parseCsv(String(rd.result));
        if (!ds.columns.length || !ds.rows.length) { out.innerHTML = '<p class="lt-callout bad">No rows found. The file needs a header row and comma-separated values.</p>'; return; }
        own = ds; own.name = file.name;
        [refSel, batchSel].forEach(function (s) {
          var o = s.querySelector('option[value="own"]') || s.appendChild(document.createElement("option"));
          o.value = "own"; o.textContent = "Your file: " + file.name;
        });
        batchSel.value = "own";
        out.innerHTML = '<p class="lt-callout ok">Read ' + fmt(ds.rows.length) + " rows and " + ds.columns.length + " columns from " + h(file.name) +
          '. To check your file against its own learned contract, pick it in both lists. To check it against Monday\'s, leave the first list as it is.</p>';
      };
      rd.readAsText(file);
    });
    $("gx-show").addEventListener("click", function () {
      var b = current(batchSel), cols = b.columns, rows = b.rows.slice(0, 60);
      out.innerHTML = '<p class="lt-note">' + (b.rows.length > 60 ? "First 60 of " + fmt(b.rows.length) + " rows." : b.rows.length + " rows.") + ' Row numbers count the header as row 1, as a spreadsheet does.</p><div class="lt-scroll"><table class="lt-table"><thead><tr><th class="num">row</th>' +
        cols.map(function (c) { return "<th>" + h(c) + "</th>"; }).join("") + "</tr></thead><tbody>" +
        rows.map(function (r, i) { return '<tr><td class="num">' + (i + 2) + "</td>" + cols.map(function (c) { return "<td>" + (isNull(r[c]) ? '<span class="lt-pill idle">null</span>' : h(r[c])) + "</td>"; }).join("") + "</tr>"; }).join("") +
        "</tbody></table></div>";
    });
    $("gx-run").addEventListener("click", function () {
      var ref = current(refSel), b = current(batchSel), suite = infer(ref), passed = 0, badRows = new Set();
      var res = suite.map(function (e) {
        var r = e.test(b), bad = r.rows ? r.rows.length : r.bad;
        if (!bad) passed++;
        (r.rows || []).forEach(function (x) { badRows.add(x[0]); });
        return { e: e, bad: bad, rows: r.rows, msg: r.msg };
      });
      var pct = Math.round(100 * passed / suite.length);
      var o = ['<dl class="lt-kpis"><div class="lt-kpi"><dt>Rules learned</dt><dd>' + suite.length + '</dd></div><div class="lt-kpi"><dt>Rules passed</dt><dd>' + passed + " <small>(" + pct + '%)</small></dd></div><div class="lt-kpi"><dt>Rows checked</dt><dd>' + fmt(b.rows.length) +
        '</dd></div><div class="lt-kpi"><dt>Rows with a problem</dt><dd>' + fmt(badRows.size) + "</dd></div></dl>"];
      o.push(passed === suite.length ? '<p class="lt-callout ok"><b>Safe to use:</b> all ' + suite.length + ' rules passed. In the lakehouse, this is where the pipeline lets the file through.</p>'
        : '<p class="lt-callout bad"><b>Don\'t use this file yet:</b> ' + (suite.length - passed) + " of " + suite.length + " rules broke, on " + badRows.size + " row" + (badRows.size === 1 ? "" : "s") + ". In the lakehouse, this stops the pipeline before bad data reaches a report.</p>");
      o.push('<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Rule</th><th>Result</th><th>Problem rows (first 5)</th></tr></thead><tbody>' + res.map(function (r) {
        var detail = r.rows ? r.rows.slice(0, 5).map(function (x) { return "row " + x[0] + ": " + (isNull(x[1]) ? "null" : h(x[1])); }).join("<br>") + (r.rows.length > 5 ? "<br>... " + (r.rows.length - 5) + " more" : "") : h(r.msg || "");
        return "<tr" + (r.bad ? ' class="lt-fail"' : "") + '><td>' + h(r.e.say) + '<span class="lt-code-name">' + h(r.e.name) + "(" + h(r.e.args) + ")</span></td><td>" + (r.bad ? pill("bad", "broke on " + r.bad + (r.e.id === "cols" || r.e.id === "rows" ? "" : " row" + (r.bad === 1 ? "" : "s"))) : pill("ok", "passed")) + "</td><td>" + (r.bad ? detail : "") + "</td></tr>";
      }).join("") + "</tbody></table></div>");
      o.push('<p class="lt-note">How the rules are learned from the good file: a column with no nulls in the reference must stay non-null; its type must hold; an id column with all distinct values must stay unique; a number must stay inside the reference range padded by 10%; a text column with 8 or fewer values must stay inside that set; dates cannot be in the future.</p>');
      out.innerHTML = o.join("");
    });
  }

  // ------------------------------------------------------------------ 3. SCD Type 2
  function initScd() {
    var TIERS = ["Bronze", "Silver", "Gold"], CHECK = ["name", "city", "tier"];
    var src, snap, run, nextId;
    var bump = { value: true };
    function reset() {
      src = [{ customer_id: 1, name: "Ana Ruiz", city: "Tempe", tier: "Silver", updated_at: "2026-10-28 14:10" },
             { customer_id: 2, name: "Ben Okafor", city: "Mesa", tier: "Bronze", updated_at: "2026-10-29 09:42" },
             { customer_id: 3, name: "Chen Wei", city: "Phoenix", tier: "Gold", updated_at: "2026-10-30 17:05" }];
      snap = []; run = 0; nextId = 4;
      $("scd-log").innerHTML = '<p class="lt-note">Nothing saved yet. Press Save a snapshot.</p>';
      drawSource(); drawSnap(-1);
    }
    function runTs(k) { return "2026-11-" + String(k).padStart(2, "0") + " 06:00"; }
    function nowTs() { return "2026-11-" + String(run + 1).padStart(2, "0") + " 0" + (1 + (run % 4)) + ":" + String(10 + (src.length * 7) % 50); }
    function hash(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0).toString(16).padStart(8, "0"); }
    function strategy() { return document.querySelector('input[name="scd-strategy"]:checked').value; }
    function drawSource() {
      var t = $("scd-source");
      t.innerHTML = "<thead><tr><th>customer_id</th><th>name</th><th>city</th><th>tier</th><th>updated_at</th><th></th></tr></thead><tbody>" +
        src.map(function (r, i) {
          return '<tr><td class="num">' + r.customer_id + "</td>" +
            '<td><input data-i="' + i + '" data-k="name" value="' + h(r.name) + '" aria-label="Name, customer ' + r.customer_id + '"></td>' +
            '<td><input data-i="' + i + '" data-k="city" value="' + h(r.city) + '" aria-label="City, customer ' + r.customer_id + '"></td>' +
            '<td><select data-i="' + i + '" data-k="tier" aria-label="Tier, customer ' + r.customer_id + '">' + TIERS.map(function (x) { return "<option" + (x === r.tier ? " selected" : "") + ">" + x + "</option>"; }).join("") + "</select></td>" +
            '<td class="mono" id="scd-ts-' + i + '">' + h(r.updated_at) + "</td>" +
            '<td><button type="button" class="lt-x" data-del="' + i + '" aria-label="Delete customer ' + r.customer_id + '">Delete</button></td></tr>';
        }).join("") + '</tbody><tfoot><tr><td colspan="6"><label class="lt-check"><input type="checkbox" id="scd-bump"' + (bump.value ? " checked" : "") +
        "> The app updates updated_at when a row changes</label></td></tr></tfoot>";
    }
    $("scd-source").addEventListener("change", function (e) {
      var el = e.target;
      if (el.id === "scd-bump") { bump.value = el.checked; return; }
      var i = el.getAttribute("data-i"); if (i === null) return;
      var r = src[+i], k = el.getAttribute("data-k");
      if (r[k] === el.value) return;
      r[k] = el.value;
      if (bump.value) { r.updated_at = nowTs(); $("scd-ts-" + i).textContent = r.updated_at; }
    });
    $("scd-source").addEventListener("click", function (e) {
      var i = e.target.getAttribute && e.target.getAttribute("data-del"); if (i === null || i === undefined) return;
      src.splice(+i, 1); drawSource();
    });
    $("scd-add").addEventListener("click", function () {
      var names = ["Dara Singh", "Eli Novak", "Fatima Khan", "Gus Ortega", "Hana Sato"];
      src.push({ customer_id: nextId, name: names[(nextId - 4) % names.length], city: ["Chandler", "Gilbert", "Scottsdale"][nextId % 3], tier: "Bronze", updated_at: nowTs() });
      nextId++; drawSource();
    });
    $("scd-reset").addEventListener("click", reset);
    $("scd-run").addEventListener("click", function () {
      run++;
      var ts = runTs(run), strat = strategy(), changed = 0, added = 0, closed = 0, missed = [], kept = [];
      src.forEach(function (s) {
        var cur = snap.find(function (r) { return r.customer_id === s.customer_id && r.valid_to === null; });
        var from = strat === "timestamp" ? s.updated_at : ts;
        if (!cur) { snap.push(rec(s, from)); added++; return; }
        var differs = CHECK.some(function (k) { return cur[k] !== s[k]; });
        var hit = strat === "timestamp" ? s.updated_at > cur.updated_at : differs;
        if (hit) { cur.valid_to = from; cur.closed_run = run; snap.push(rec(s, from)); changed++; }
        else if (differs) missed.push(s.customer_id);
      });
      snap.forEach(function (r) {
        if (r.valid_to !== null || src.some(function (s) { return s.customer_id === r.customer_id; })) return;
        if ($("scd-hard").checked) { r.valid_to = ts; r.closed_run = run; closed++; } else kept.push(r.customer_id);
      });
      function rec(s, from) {
        return { scd_id: hash(s.customer_id + "|" + from), customer_id: s.customer_id, name: s.name, city: s.city, tier: s.tier,
                 updated_at: s.updated_at, valid_from: from, valid_to: null, dbt_updated_at: strat === "timestamp" ? s.updated_at : ts, run: run };
      }
      var log = ["<b>Snapshot " + run + "</b> saved at " + ts + ": " + added + " new customer" + (added === 1 ? "" : "s") + ", " + changed + " changed (old row ended, new current row added), " + closed + " ended because the customer was deleted." + (run === 1 ? " Now change a city or tier above and save again." : "")];
      if (missed.length) log.push('<span class="lt-callout">Missed: customer ' + missed.join(", ") + " changed but updated_at did not move, so the timestamp strategy saw nothing to record. The check strategy compares the columns themselves and would catch it, at the cost of comparing every column on every run.</span>");
      if (kept.length) log.push('<span class="lt-callout">Customer ' + kept.join(", ") + " is gone from the source but its snapshot row is still marked current. Tick the hard-deletes option to close it.</span>");
      $("scd-log").innerHTML = '<p class="lt-note">' + log.join("<br>") + "</p>";
      drawSnap(run);
    });
    function drawSnap(latest) {
      var t = $("scd-snap");
      if (!snap.length) { t.innerHTML = '<tbody><tr><td class="lt-note">No snapshot yet.</td></tr></tbody>'; return; }
      var rows = snap.slice().sort(function (a, b) { return a.customer_id - b.customer_id || (a.valid_from < b.valid_from ? -1 : 1); });
      t.innerHTML = "<thead><tr><th>dbt_scd_id</th><th>customer_id</th><th>name</th><th>city</th><th>tier</th><th>dbt_valid_from</th><th>dbt_valid_to</th><th>current</th></tr></thead><tbody>" +
        rows.map(function (r) {
          var cls = r.valid_to === null ? (r.run === latest ? "lt-new" : "") : (r.closed_run === latest ? "lt-closed-now" : "lt-closed");
          return '<tr class="' + cls + '"><td class="mono">' + r.scd_id + '</td><td class="num">' + r.customer_id + "</td><td>" + h(r.name) + "</td><td>" + h(r.city) + "</td><td>" + h(r.tier) +
            '</td><td class="mono">' + r.valid_from + '</td><td class="mono">' + (r.valid_to || "null") + "</td><td>" + (r.valid_to === null ? pill("ok", "yes") : pill("idle", "no")) + "</td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="8" class="lt-note">Green: opened this run. Amber: closed this run. Current rows are <span class="lt-code">where dbt_valid_to is null</span>; the history answers "what tier was this customer on a given day?"</td></tr></tfoot>';
    }
    reset();
  }

  // ------------------------------------------------------------------ 4. drift + fairness
  function initDrift() {
    var MU = { income: 62, debt: 0.32, age: 8.5 }, SD = { income: 16, debt: 0.09, age: 3.5 };
    var NAMES = { income: "Income ($k)", debt: "Debt-to-income", age: "Credit history (yrs)" };
    var W = { income: 0.055, debt: -8.5, age: 0.14 }, B0 = 0.35; // the model's fixed weights, on centred features
    var FEATS = ["income", "debt", "age"];
    function sigmoid(z) { return 1 / (1 + Math.exp(-z)); }
    function gen(n, seed, o) {
      var r = rng(seed), out = [];
      for (var i = 0; i < n; i++) {
        var g = r() < o.mix ? "B" : "A";
        var x = { income: (g === "A" ? 66 : 54) + 16 * normal(r), debt: 0.32 + 0.09 * normal(r), age: 8.5 + 3.5 * normal(r) };
        if (o.feature) { var f = o.feature; x[f] = MU[f] + o.spread * (x[f] - MU[f]) + o.shift * SD[f]; }
        x.income = Math.max(12, x.income); x.debt = Math.min(0.95, Math.max(0.02, x.debt)); x.age = Math.min(30, Math.max(0.25, x.age));
        var pTrue = sigmoid(0.45 + 0.06 * (x.income - 60) - 9 * (x.debt - 0.32) + 0.15 * (x.age - 8.5));
        x.label = r() < pTrue ? 1 : 0; x.group = g;
        x.score = sigmoid(B0 + FEATS.reduce(function (s, f) { return s + W[f] * (x[f] - MU[f]); }, 0));
        out.push(x);
      }
      return out;
    }
    function quantile(sorted, q) { var pos = q * (sorted.length - 1), lo = Math.floor(pos), hi = Math.ceil(pos); return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo); }
    function edgesOf(base) {
      var s = base.slice().sort(function (a, b) { return a - b; }), e = [];
      for (var i = 0; i <= 10; i++) e.push(quantile(s, i / 10));
      e = e.filter(function (v, i) { return i === 0 || v !== e[i - 1]; });
      e[0] = -Infinity; e[e.length - 1] = Infinity; return e;
    }
    function hist(vals, e) {
      var c = new Array(e.length - 1).fill(0);
      vals.forEach(function (v) { var lo = 0, hi = e.length - 2; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (e[m] <= v) lo = m; else hi = m - 1; } c[lo]++; });
      return c;
    }
    // population_stability_index from audit_engine.py: baseline-decile bins, epsilon 1e-4
    function psi(base, cur) {
      var e = edgesOf(base); if (e.length < 3) return { value: 0, bins: [] };
      var bc = hist(base, e), cc = hist(cur, e), v = 0, bins = [];
      for (var i = 0; i < bc.length; i++) {
        var bp = bc[i] / base.length + 1e-4, cp = cc[i] / cur.length + 1e-4;
        v += (cp - bp) * Math.log(cp / bp); bins.push([bc[i] / base.length, cc[i] / cur.length]);
      }
      return { value: v, bins: bins, edges: e };
    }
    function ks(a, b) {
      a = a.slice().sort(function (x, y) { return x - y; }); b = b.slice().sort(function (x, y) { return x - y; });
      var i = 0, j = 0, d = 0;
      while (i < a.length && j < b.length) {
        var v = Math.min(a[i], b[j]);
        while (i < a.length && a[i] <= v) i++;
        while (j < b.length && b[j] <= v) j++;
        d = Math.max(d, Math.abs(i / a.length - j / b.length));
      }
      var en = Math.sqrt(a.length * b.length / (a.length + b.length)), lam = (en + 0.12 + 0.11 / en) * d, p = 0;
      for (var k = 1; k <= 100; k++) { var t = 2 * Math.pow(-1, k - 1) * Math.exp(-2 * k * k * lam * lam); p += t; if (Math.abs(t) < 1e-10) break; }
      return { d: d, p: Math.min(1, Math.max(0, p)) };
    }
    var base = gen(2000, 7, { mix: 0.4 }), seed = 101, cur;
    function opts() { return { feature: $("dr-feature").value, shift: +$("dr-shift").value, spread: +$("dr-spread").value, mix: +$("dr-mix").value / 100 }; }
    function rates(rows, thr) {
      function grp(g) {
        var rs = rows.filter(function (r) { return r.group === g; }), pos = rs.filter(function (r) { return r.label === 1; });
        return { n: rs.length, approve: rs.filter(function (r) { return r.score >= thr; }).length / Math.max(1, rs.length),
                 tpr: pos.length ? pos.filter(function (r) { return r.score >= thr; }).length / pos.length : NaN };
      }
      return { all: rows.filter(function (r) { return r.score >= thr; }).length / rows.length, A: grp("A"), B: grp("B") };
    }
    var READ = { income: "income", debt: "debt-to-income ratio", age: "length of credit history" };
    function update() {
      var o = opts();
      var unit = { income: "k$", debt: " pts", age: " yrs" }[o.feature];
      var moved = o.shift * SD[o.feature] * (o.feature === "debt" ? 100 : 1);
      $("dr-shift-v").textContent = o.shift === 0 ? "no change" : (moved > 0 ? "+" : "") + moved.toFixed(o.feature === "income" ? 0 : 1) + unit;
      $("dr-spread-v").textContent = o.spread === 1 ? "no change" : o.spread.toFixed(1) + "x";
      $("dr-mix-v").textContent = Math.round(o.mix * 100) + "%";
      cur = gen(2000, seed, o);
      var stats = FEATS.map(function (f) {
        var b = base.map(function (r) { return r[f]; }), c = cur.map(function (r) { return r[f]; });
        return { f: f, psi: psi(b, c), ks: ks(b, c) };
      });
      var out = [], flagged = stats.filter(function (s) { return s.psi.value > 0.25 || s.ks.p < 0.01; });
      out.push(flagged.length
        ? '<p class="lt-callout bad"><b>Alert:</b> the new applicants\' ' + flagged.map(function (s) { return READ[s.f]; }).join(" and ") + (flagged.length === 1 ? " no longer matches" : " no longer match") + " the training data. A model trained on last year may now be wrong for them; this is when a team reviews or retrains it.</p>"
        : '<p class="lt-callout ok"><b>No alert:</b> the new applicants look like the ones the model was trained on. Small differences are just random variation.</p>');
      out.push('<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Feature</th><th>Status</th><th class="num">PSI</th><th class="num">KS test p</th></tr></thead><tbody>' +
        stats.map(function (s) {
          var pv = s.psi.value, st = pv > 0.25 ? pill("bad", "changed a lot") : s.ks.p < 0.01 ? pill("bad", "changed") : pv >= 0.1 ? pill("warn", "changing") : pill("ok", "steady");
          return "<tr" + (pv > 0.25 || s.ks.p < 0.01 ? ' class="lt-fail"' : "") + "><td>" + NAMES[s.f] + "</td><td>" + st + '</td><td class="num">' + pv.toFixed(3) + '</td><td class="num">' + (s.ks.p < 0.0001 ? "&lt;0.0001" : s.ks.p.toFixed(4)) + "</td></tr>";
        }).join("") + '</tbody></table></div><p class="lt-note">PSI compares how many applicants fall in each tenth of last year\'s range; over 0.25 is a big shift. The KS test asks whether the gap could be chance; a p-value under 0.01 means it isn\'t.</p>');
      var sel = stats.find(function (s) { return s.f === o.feature; }), bins = sel.psi.bins;
      var W1 = 560, H1 = 190, pl = 34, pb = 26, bw = (W1 - pl - 8) / bins.length, top = Math.max.apply(null, bins.map(function (b) { return Math.max(b[0], b[1]); })) * 1.15 || 0.2;
      var bars = "", lab = "";
      bins.forEach(function (b, i) {
        var x = pl + i * bw, hb = (H1 - pb - 10) * b[0] / top, hc = (H1 - pb - 10) * b[1] / top;
        bars += '<rect class="base" x="' + (x + 2) + '" y="' + (H1 - pb - hb) + '" width="' + (bw / 2 - 3) + '" height="' + hb + '"><title>Tenth ' + (i + 1) + ": last year " + (b[0] * 100).toFixed(1) + "%</title></rect>";
        bars += '<rect class="cur" x="' + (x + bw / 2) + '" y="' + (H1 - pb - hc) + '" width="' + (bw / 2 - 3) + '" height="' + hc + '"><title>Tenth ' + (i + 1) + ": new applicants " + (b[1] * 100).toFixed(1) + "%</title></rect>";
        if (i === 0 || i === bins.length - 1) lab += '<text x="' + (x + bw / 2) + '" y="' + (H1 - 8) + '" text-anchor="middle">' + (i === 0 ? "lowest" : "highest") + "</text>";
      });
      var grid = [0, top / 2].map(function (v) { var y = H1 - pb - (H1 - pb - 10) * v / top; return '<line class="ax" x1="' + pl + '" x2="' + (W1 - 8) + '" y1="' + y + '" y2="' + y + '"/><text x="' + (pl - 4) + '" y="' + (y + 4) + '" text-anchor="end">' + Math.round(v * 100) + "%</text>"; }).join("");
      var histSvg = svgEl(W1, H1, grid + bars + lab, NAMES[o.feature] + ": share of applicants in each tenth of last year's range");
      function meanAbs(rows, f) { return rows.reduce(function (s, r) { return s + Math.abs(W[f] * (r[f] - MU[f])); }, 0) / rows.length; }
      var contrib = FEATS.map(function (f) { return [f, meanAbs(base, f), meanAbs(cur, f)]; }), cmax = Math.max.apply(null, contrib.map(function (c) { return Math.max(c[1], c[2]); })) * 1.1;
      var W2 = 560, rowH = 46, cbody = "";
      contrib.forEach(function (c, i) {
        var y = 8 + i * rowH, wb = (W2 - 170) * c[1] / cmax, wc = (W2 - 170) * c[2] / cmax;
        cbody += '<text x="0" y="' + (y + 14) + '">' + NAMES[c[0]] + "</text>" +
          '<rect class="base" x="150" y="' + y + '" width="' + wb + '" height="14"><title>' + NAMES[c[0]] + " last year: " + c[1].toFixed(3) + "</title></rect>" +
          '<rect class="cur" x="150" y="' + (y + 17) + '" width="' + wc + '" height="14"><title>' + NAMES[c[0]] + " new applicants: " + c[2].toFixed(3) + "</title></rect>" +
          '<text x="' + (154 + Math.max(wb, wc)) + '" y="' + (y + 28) + '">' + c[2].toFixed(2) + "</text>";
      });
      var contribSvg = svgEl(W2, 8 + 3 * rowH, cbody, "How much each feature moves the model's decision, last year and new applicants");
      out.push('<ul class="lt-legend"><li><i style="background:var(--lt-base)"></i>Last year (training data)</li><li><i style="background:var(--accent)"></i>New applicants</li></ul>');
      out.push('<div class="lt-grid2"><figure class="lt-fig">' + histSvg + "<figcaption>" + NAMES[o.feature] + ": share of applicants in each tenth of last year's range, lowest to highest. Equal bars mean no change.</figcaption></figure>" +
        '<figure class="lt-fig">' + contribSvg + "<figcaption>How much each feature pushes the model's decision, on average. The model is linear, so these are exact SHAP values.</figcaption></figure></div>");
      $("dr-out").innerHTML = out.join("");
      fair();
    }
    function fair() {
      var thr = +$("dr-thr").value; $("dr-thr-v").textContent = thr.toFixed(2);
      var rc = rates(cur, thr), di = rc.B.approve / Math.max(1e-9, rc.A.approve), eod = rc.A.tpr - rc.B.tpr;
      function bar(label, v, cls) {
        return '<div class="lt-bar"><span>' + label + '</span><span class="lt-bar-track"><span class="lt-bar-fill' + (cls ? " " + cls : "") + '" style="width:' + (v * 100).toFixed(1) + '%"></span></span><span class="lt-bar-val">' + (v * 100).toFixed(0) + "%</span></div>";
      }
      var f = ['<div class="lt-grid2"><div><h5 class="lt-mini">Approved, of everyone who applied</h5><div class="lt-bars">' + bar("Group A", rc.A.approve) + bar("Group B", rc.B.approve, "alt") + "</div></div>" +
        '<div><h5 class="lt-mini">Approved, of people who would repay</h5><div class="lt-bars">' + bar("Group A", rc.A.tpr) + bar("Group B", rc.B.tpr, "alt") + "</div></div></div>"];
      var alerts = [];
      if (di < 0.8 || di > 1.25) alerts.push("<b>Four-fifths rule broken:</b> group B is approved at " + (di * 100).toFixed(0) + "% of group A's rate (it should be at least 80%).");
      if (Math.abs(eod) > 0.1) alerts.push("<b>Unequal opportunity:</b> among applicants who would repay, group " + (eod > 0 ? "A" : "B") + " is approved " + Math.abs(eod * 100).toFixed(0) + " points more often (the limit is 10).");
      f.push(alerts.length ? '<p class="lt-callout bad">' + alerts.join("<br>") + "</p>"
        : '<p class="lt-callout ok"><b>Within limits:</b> group B is approved at ' + (di * 100).toFixed(0) + "% of group A's rate, and the gap among people who would repay is " + Math.abs(eod * 100).toFixed(0) + " points.</p>");
      f.push('<p class="lt-note">Group is never an input to the model. But group B\'s incomes are lower on average, so the model still treats the groups differently through income. A higher cut-off approves fewer people and usually widens the gap.</p>');
      $("dr-fair").innerHTML = f.join("");
    }
    ["dr-feature", "dr-shift", "dr-spread", "dr-mix"].forEach(function (id) { $(id).addEventListener("input", update); });
    $("dr-thr").addEventListener("input", fair);
    $("dr-new").addEventListener("click", function () { seed++; update(); });
    update();
  }

  // ------------------------------------------------------------------ 5. table format time travel
  function initTravel() {
    var COS = ["Northwind", "Contoso", "Fabrikam", "Tailspin"];
    var r, files, snaps, view, nextRow, nextFile, removed;
    function reset() { r = rng(42); files = {}; snaps = []; view = null; nextRow = 1; nextFile = 1; removed = 0; draw("Append rows to make the table's first snapshot."); }
    function mode() { return document.querySelector('input[name="tt-mode"]:checked').value; }
    function head() { return snaps.length ? snaps[snaps.length - 1] : null; }
    function newFile(kind, rows, sid) {
      var id = "f" + nextFile++, name = kind === "data" ? "data/" + String(nextFile - 1).padStart(5, "0") + "-" + sid + ".parquet" : "data/" + String(nextFile - 1).padStart(5, "0") + "-" + sid + "-deletes.parquet";
      files[id] = { id: id, kind: kind, name: name, rows: rows, added: sid, gone: false };
      return id;
    }
    function deletedSet(s) { var d = {}; s.deletes.forEach(function (fid) { files[fid].rows.forEach(function (p) { d[p.file + "#" + p.pos] = true; }); }); return d; }
    function liveRows(s) {
      if (!s) return [];
      var d = deletedSet(s), out = [];
      s.data.forEach(function (fid) { files[fid].rows.forEach(function (row, pos) { if (!d[fid + "#" + pos]) out.push({ row: row, file: fid, pos: pos }); }); });
      return out;
    }
    function commit(op, data, deletes, summary) {
      var p = head(), seq = snaps.length + 1;
      var s = { seq: seq, id: String(5000 + seq * 7919 + Math.floor(r() * 997)) + String(Math.floor(r() * 1e9)).padStart(9, "0"),
                parent: p ? p.id : null, op: op, data: data, deletes: deletes, summary: summary, expired: false, ts: "2026-11-02 10:" + String(seq * 3).padStart(2, "0") };
      s.summary["total-records"] = liveRows(s).length;
      snaps.push(s); view = s; return s;
    }
    function sid() { return "s" + (snaps.length + 1); }
    $("tt-append").addEventListener("click", function () {
      var rows = [];
      for (var i = 0; i < 3; i++) rows.push({ posting_id: nextRow++, company: COS[Math.floor(r() * COS.length)], salary: Math.round((90000 + r() * 70000) / 1000) * 1000 });
      var p = head(), f = newFile("data", rows, sid());
      commit("append", (p ? p.data : []).concat([f]), p ? p.deletes.slice() : [], { "added-data-files": 1, "added-records": 3 });
      draw("Appended 3 rows as one new Parquet file. Nothing existing was rewritten.");
    });
    function rowLevel(pred, change, verb) {
      var p = head(); if (!p) return draw("The table is empty. Append rows first.");
      var live = liveRows(p), hit = live.filter(function (x) { return pred(x.row); });
      if (!hit.length) return draw("No rows matched.");
      var s = sid(), data = p.data.slice(), deletes = p.deletes.slice(), sum = {}, msg;
      if (mode() === "cow") {
        var touched = Array.from(new Set(hit.map(function (x) { return x.file; }))), d = deletedSet(p), added = 0;
        touched.forEach(function (fid) {
          var keep = [];
          files[fid].rows.forEach(function (row, pos) {
            if (d[fid + "#" + pos]) return;
            if (pred(row)) { if (change) keep.push(change(row)); } else keep.push(row);
          });
          data.splice(data.indexOf(fid), 1);
          if (keep.length) { data.push(newFile("data", keep, s)); added++; }
        });
        deletes = deletes.filter(function (df) { return files[df].rows.some(function (q) { return data.indexOf(q.file) !== -1; }); });
        sum = { "added-data-files": added, "deleted-data-files": touched.length, "changed-records": hit.length };
        msg = "Copy-on-write: rewrote " + touched.length + " data file" + (touched.length > 1 ? "s" : "") + " that held the " + hit.length + " affected row" + (hit.length > 1 ? "s" : "") + ". Reads stay simple; the write cost grows with file size.";
        commit("overwrite", data, deletes, sum);
      } else {
        deletes.push(newFile("delete", hit.map(function (x) { return { file: x.file, pos: x.pos, posting_id: x.row.posting_id }; }), s));
        sum = { "added-delete-files": 1, "added-position-deletes": hit.length };
        if (change) { data.push(newFile("data", hit.map(function (x) { return change(x.row); }), s)); sum["added-data-files"] = 1; }
        msg = "Merge-on-read: wrote a position-delete file for " + hit.length + " row" + (hit.length > 1 ? "s" : "") + (change ? " plus a small file with the new versions" : "") + ". The write is cheap; every read now merges the deletes until you compact.";
        commit(change ? "overwrite" : "delete", data, deletes, sum);
      }
      draw(verb + " " + msg);
    }
    $("tt-update").addEventListener("click", function () {
      var p = head(), live = liveRows(p), count = {};
      live.forEach(function (x) { count[x.row.company] = (count[x.row.company] || 0) + 1; });
      var co = Object.keys(count).sort(function (a, b) { return count[b] - count[a] || (a < b ? -1 : 1); })[0];
      rowLevel(function (row) { return row.company === co; }, function (row) { return { posting_id: row.posting_id, company: row.company, salary: Math.round(row.salary * 1.1) }; }, "Raised " + co + "'s salaries 10%.");
    });
    $("tt-delete").addEventListener("click", function () {
      var live = liveRows(head()); if (!live.length) return draw("The table is empty. Append rows first.");
      var low = live.reduce(function (a, b) { return b.row.salary < a.row.salary ? b : a; }).row.posting_id;
      rowLevel(function (row) { return row.posting_id === low; }, null, "Deleted posting " + low + ".");
    });
    $("tt-compact").addEventListener("click", function () {
      var p = head(); if (!p) return draw("The table is empty. Append rows first.");
      if (p.data.length < 2 && !p.deletes.length) return draw("Already one file and no deletes. Nothing to compact.");
      var live = liveRows(p), f = newFile("data", live.map(function (x) { return x.row; }), sid());
      commit("replace", [f], [], { "added-data-files": 1, "deleted-data-files": p.data.length, "removed-delete-files": p.deletes.length });
      draw("Compaction (rewrite_data_files) merged " + p.data.length + " data files and " + p.deletes.length + " delete files into one. Same rows, fewer files to open. Old snapshots still point at the old files.");
    });
    $("tt-expire").addEventListener("click", function () {
      var p = head(); if (!p || snaps.length < 2) return draw("Only one snapshot. Nothing to expire.");
      var keep = new Set(p.data.concat(p.deletes)), n = 0, k = 0;
      snaps.forEach(function (s) { if (s !== p && !s.expired) { s.expired = true; k++; } });
      Object.keys(files).forEach(function (fid) { if (!keep.has(fid) && !files[fid].gone) { files[fid].gone = true; n++; } });
      removed += n; view = p;
      draw("expire_snapshots removed " + k + " snapshot" + (k > 1 ? "s" : "") + " and deleted " + n + " file" + (n === 1 ? "" : "s") + " nothing current needs. You can no longer time-travel to those snapshots.");
    });
    $("tt-reset").addEventListener("click", reset);
    $("tt-out").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button[data-snap]"); if (!b) return;
      view = snaps[+b.getAttribute("data-snap")]; draw(null);
    });
    var lastMsg = "";
    function draw(msg) {
      if (msg !== null && msg !== undefined) lastMsg = msg;
      var o = [];
      if (lastMsg) o.push('<p class="lt-callout ok">' + h(lastMsg) + "</p>");
      if (!snaps.length) { $("tt-out").innerHTML = o.join(""); return; }
      var cur = head();
      o.push('<h4 class="lt-sub">Snapshots (pick one to query as of)</h4><div class="lt-snaps">' + snaps.map(function (s, i) {
        return '<button type="button" data-snap="' + i + '" aria-pressed="' + (s === view) + '"' + (s.expired ? " disabled" : "") + ">#" + s.seq + " " + s.op + "<small>" + s.id.slice(0, 6) + "&hellip; " + s.summary["total-records"] + " rows" + (s === cur ? ", current" : "") + "</small></button>";
      }).join("") + "</div>");
      var v = view, rows = liveRows(v);
      var stored = Object.keys(files).filter(function (k) { return !files[k].gone; }).length;
      o.push('<dl class="lt-kpis"><div class="lt-kpi"><dt>Rows as of #' + v.seq + "</dt><dd>" + rows.length + '</dd></div><div class="lt-kpi"><dt>Data files read</dt><dd>' + v.data.length +
        '</dd></div><div class="lt-kpi"><dt>Delete files merged</dt><dd>' + v.deletes.length + '</dd></div><div class="lt-kpi"><dt>Files in storage</dt><dd>' + stored + (removed ? " <small>(" + removed + " removed)</small>" : "") + "</dd></div></dl>");
      o.push('<p class="lt-note">Spark SQL on Iceberg: <span class="lt-code">SELECT * FROM lake.postings VERSION AS OF ' + v.id + '</span><br>The same on Delta Lake: <span class="lt-code">SELECT * FROM postings VERSION AS OF ' + (v.seq - 1) + "</span></p>");
      o.push('<div class="lt-grid2"><div class="lt-scroll"><table class="lt-table"><thead><tr><th class="num">posting_id</th><th>company</th><th class="num">salary</th><th>file</th></tr></thead><tbody>' +
        rows.sort(function (a, b) { return a.row.posting_id - b.row.posting_id; }).map(function (x) { return '<tr><td class="num">' + x.row.posting_id + "</td><td>" + x.row.company + '</td><td class="num">$' + fmt(x.row.salary) + '</td><td class="mono">' + files[x.file].name.slice(5, 10) + "</td></tr>"; }).join("") +
        "</tbody></table></div>");
      var t = "<b>metadata/v" + (v.seq + 1) + ".metadata.json</b>  " + (v === cur ? "current-snapshot-id" : "snapshot") + " = " + v.id + "\n";
      t += "&#9492;&#9472; snap-" + v.id.slice(0, 6) + "&hellip;.avro  (manifest list)  operation=" + v.op + "\n";
      var groups = {};
      v.data.concat(v.deletes).forEach(function (fid) { var f = files[fid], k = f.added + (f.kind === "delete" ? " deletes" : " data"); (groups[k] = groups[k] || []).push(f); });
      var keys = Object.keys(groups).sort(function (a, b) { return parseInt(a.slice(1)) - parseInt(b.slice(1)) || (a < b ? -1 : 1); });
      keys.forEach(function (k, gi) {
        var lastG = gi === keys.length - 1, fs = groups[k];
        t += "   " + (lastG ? "&#9492;" : "&#9500;") + "&#9472; manifest " + k.replace(" ", "-") + ".avro\n";
        fs.forEach(function (f, fi) {
          var lastF = fi === fs.length - 1, cls = f.gone ? "gone" : f.kind === "delete" ? "del" : "";
          t += "   " + (lastG ? " " : "&#9474;") + "   " + (lastF ? "&#9492;" : "&#9500;") + '&#9472; <span class="' + cls + '">' + f.name + "  " + f.rows.length + (f.kind === "delete" ? " position delete" + (f.rows.length > 1 ? "s" : "") : " row" + (f.rows.length > 1 ? "s" : "")) + "</span>\n";
        });
      });
      t += "\nsummary: " + Object.keys(v.summary).map(function (k) { return k + "=" + v.summary[k]; }).join(", ");
      o.push('<pre class="lt-tree" aria-label="Table metadata tree for the chosen snapshot">' + t + "</pre></div>");
      $("tt-out").innerHTML = o.join("");
    }
    reset();
  }

  // ------------------------------------------------------------------ 6. event-time windows
  function initWindows() {
    var events, held = {}, seed = 3, timer = null;
    function make() {
      var r = rng(seed), t = 0; events = [];
      for (var i = 0; i < 16; i++) {
        t += 1 + Math.floor(r() * 4);
        var delay = Math.floor(r() * 3);
        if (i === 4 || i === 9 || i === 13) delay = 10 + Math.floor(r() * 8);
        events.push({ id: "r" + (i + 1), et: t, delay: delay, temp: 60 + Math.floor(r() * 25) });
      }
      held = {};
    }
    function cfg() { return { type: $("ew-type").value, D: +$("ew-delay").value, L: +$("ew-late").value, T: +$("ew-time").value }; }
    function arrival(e) { return e.et + e.delay + (held[e.id] ? 8 : 0); }
    function simulate(c) {
      var order = events.slice().sort(function (a, b) { return arrival(a) - arrival(b) || a.et - b.et; });
      var maxEt = -Infinity, wins = {}, sessions = [], log = [];
      function wm() { return maxEt - c.D; }
      order.forEach(function (e, rank) {
        var a = arrival(e);
        if (a > c.T) { log.push({ e: e, rank: rank, a: a, status: "wait" }); return; }
        var w0 = wm(), res = [];
        if (c.type === "session") {
          var s = e.et, en = e.et + 6, merge = sessions.filter(function (x) { return x.start <= en && x.end >= s; });
          merge.forEach(function (x) { s = Math.min(s, x.start); en = Math.max(en, x.end); });
          if (w0 >= en + c.L) res.push({ w: s + "-" + en, ok: false, end: en });
          else {
            var evs = [e]; merge.forEach(function (x) { evs = evs.concat(x.events); sessions.splice(sessions.indexOf(x), 1); });
            var late = merge.some(function (x) { return w0 >= x.end; }) || w0 >= en;
            sessions.push({ start: s, end: en, events: evs, late: (merge.reduce(function (n, x) { return n + x.late; }, 0)) + (late ? 1 : 0) });
            res.push({ w: s + "-" + en, ok: true, late: late, end: en });
          }
        } else {
          var starts = c.type === "tumbling" ? [Math.floor(e.et / 10) * 10] : [Math.floor(e.et / 5) * 5 - 5, Math.floor(e.et / 5) * 5];
          starts.forEach(function (st) {
            var key = st + "-" + (st + 10), w = wins[key] || (wins[key] = { start: st, end: st + 10, events: [], late: 0 });
            if (w0 >= w.end + c.L) res.push({ w: key, ok: false, end: w.end });
            else { var lt = w0 >= w.end; w.events.push(e); if (lt) w.late++; res.push({ w: key, ok: true, late: lt, end: w.end }); }
          });
        }
        maxEt = Math.max(maxEt, e.et);
        var okN = res.filter(function (x) { return x.ok; }).length, lateN = res.filter(function (x) { return x.ok && x.late; }).length;
        var status = okN === 0 ? "drop" : lateN ? "late" : "ok", why;
        if (status === "drop") why = "Dropped: watermark was " + w0 + " s, past window end " + res[0].end + " s plus " + c.L + " s lateness.";
        else if (okN < res.length) why = "Counted in one window, dropped from the other (closed for good).";
        else if (status === "late") why = "Late, still counted: the window had already fired at watermark " + w0 + " s, so it fires again with an update.";
        else why = "On time: its window hadn't closed yet.";
        log.push({ e: e, rank: rank, a: a, status: status, why: why, wm: w0 });
      });
      var list = c.type === "session" ? sessions : Object.keys(wins).map(function (k) { return wins[k]; });
      list.sort(function (a, b) { return a.start - b.start; });
      return { log: log, windows: list, wm: wm(), order: order };
    }
    function draw() {
      var c = cfg();
      $("ew-delay-v").textContent = c.D + " s"; $("ew-late-v").textContent = c.L + " s"; $("ew-time-v").textContent = c.T + " s";
      var sim = simulate(c), maxX = Math.max(70, Math.max.apply(null, events.map(function (e) { return e.et; })) + 12);
      var W = 640, pl = 10, x = function (t) { return pl + (W - 2 * pl) * t / maxX; }, laneTop = 10, laneH = c.type === "sliding" ? 44 : 26, evTop = laneTop + laneH + 18, rowH = 12;
      var H = evTop + events.length * rowH + 30, body = "";
      sim.windows.forEach(function (w, i) {
        var y = laneTop + (c.type === "sliding" ? (Math.round(w.start / 5) % 2) * 22 : 0), cls = sim.wm >= w.end + c.L ? "closed" : sim.wm >= w.end ? "fired" : "";
        var x0 = x(Math.max(0, w.start)), x1 = x(w.end);
        body += '<rect class="win ' + cls + '" x="' + x0 + '" y="' + y + '" width="' + (x1 - x0) + '" height="20" rx="3"><title>Window ' + w.start + "-" + w.end + " s: " + w.events.length + " readings, " + (cls || "open") + "</title></rect>" +
          '<text x="' + ((x0 + x1) / 2) + '" y="' + (y + 14) + '" text-anchor="middle">' + w.events.length + "</text>";
      });
      for (var t = 0; t <= maxX; t += 10) body += '<line class="ax" x1="' + x(t) + '" x2="' + x(t) + '" y1="' + (evTop - 6) + '" y2="' + (H - 18) + '"/><text x="' + x(t) + '" y="' + (H - 4) + '" text-anchor="middle">' + t + "s</text>";
      sim.log.forEach(function (l) {
        var cx = x(l.e.et), cy = evTop + l.rank * rowH, cls = l.status === "wait" ? "wait" : l.status === "drop" ? "drop" : l.status === "late" ? "late" : "ok";
        body += '<circle class="ev ' + cls + '" data-ev="' + l.e.id + '" tabindex="0" role="button" aria-label="Reading ' + l.e.id + ", event time " + l.e.et + " s, arrives " + l.a + " s" + (held[l.e.id] ? ", held back" : "") + '" cx="' + cx + '" cy="' + cy + '" r="5"><title>' + l.e.id + ": event " + l.e.et + " s, arrives " + l.a + " s</title></circle>";
        if (held[l.e.id]) body += '<text x="' + (cx + 9) + '" y="' + (cy + 4) + '">+8s</text>';
      });
      if (isFinite(sim.wm) && sim.wm > 0) body += '<line class="wm" x1="' + x(sim.wm) + '" x2="' + x(sim.wm) + '" y1="' + (laneTop - 4) + '" y2="' + (H - 18) + '"/><text x="' + (x(sim.wm) + 4) + '" y="' + (evTop - 8) + '">watermark ' + sim.wm + "s</text>";
      var o = [svgEl(W, H, body, "Windows across the top; readings below placed by event time, one row per arrival order")];
      o.push('<ul class="lt-legend"><li><i style="background:var(--accent)"></i>counted on time</li><li><i style="background:var(--lt-warn)"></i>late, still counted</li><li><i style="border:2px solid var(--lt-bad)"></i>dropped</li><li><i style="border:1px dashed var(--lt-idle)"></i>not arrived yet</li><li>Rows go down in arrival order; left to right is event time.</li></ul>');
      var arrived = sim.log.filter(function (l) { return l.status !== "wait"; });
      var cnt = { ok: 0, late: 0, drop: 0 }; arrived.forEach(function (l) { cnt[l.status]++; });
      o.push('<dl class="lt-kpis"><div class="lt-kpi"><dt>Arrived</dt><dd>' + arrived.length + " <small>of " + events.length + '</small></dd></div><div class="lt-kpi"><dt>On time</dt><dd>' + cnt.ok + '</dd></div><div class="lt-kpi"><dt>Late, counted</dt><dd>' + cnt.late + '</dd></div><div class="lt-kpi"><dt>Dropped</dt><dd>' + cnt.drop + "</dd></div></dl>");
      o.push('<div class="lt-grid2"><div class="lt-scroll"><table class="lt-table"><thead><tr><th>Window</th><th class="num">Readings</th><th class="num">Avg temp</th><th>State</th></tr></thead><tbody>' +
        (sim.windows.length ? sim.windows.map(function (w) {
          var st = sim.wm >= w.end + c.L ? pill("idle", "closed") : sim.wm >= w.end ? pill("ok", "fired" + (w.late ? ", +" + w.late + " late" : "")) : pill("warn", "open");
          var avg = w.events.reduce(function (s, e) { return s + e.temp; }, 0) / w.events.length;
          return "<tr><td class=\"mono\">" + Math.max(0, w.start) + "&ndash;" + w.end + ' s</td><td class="num">' + w.events.length + '</td><td class="num">' + avg.toFixed(1) + "&deg;F</td><td>" + st + "</td></tr>";
        }).join("") : '<tr><td colspan="4" class="lt-note">Nothing has arrived yet.</td></tr>') + "</tbody></table></div>" +
        '<div class="lt-scroll"><table class="lt-table"><thead><tr><th>Reading</th><th class="num">Event</th><th class="num">Arrived</th><th>What happened</th></tr></thead><tbody>' +
        arrived.slice(-8).reverse().map(function (l) { return '<tr><td class="mono">' + l.e.id + '</td><td class="num">' + l.e.et + 's</td><td class="num">' + l.a + "s</td><td>" + h(l.why) + "</td></tr>"; }).join("") +
        '</tbody><tfoot><tr><td colspan="4" class="lt-note">The last 8 arrivals, newest first.</td></tr></tfoot></table></div></div>');
      o.push('<p class="lt-note">The watermark is the newest event time seen minus the delay: it says "nothing older is expected". A window fires when the watermark passes its end, and is kept for the allowed lateness after that. A longer delay means fewer drops but later results.</p>');
      $("ew-out").innerHTML = o.join("");
    }
    function maxArrival() { return Math.max.apply(null, events.map(arrival)) + 2; }
    function setMax() { var m = maxArrival(), s = $("ew-time"); s.max = m; if (+s.value > m || s.dataset.end === "1") s.value = m; }
    ["ew-type", "ew-delay", "ew-late"].forEach(function (id) { $(id).addEventListener("input", draw); });
    $("ew-time").addEventListener("input", function () { $("ew-time").dataset.end = +$("ew-time").value >= +$("ew-time").max ? "1" : "0"; draw(); });
    function toggle(id) { held[id] = !held[id]; setMax(); draw(); var el = document.querySelector('#ew-out [data-ev="' + id + '"]'); if (el) el.focus(); }
    $("ew-out").addEventListener("click", function (e) { var id = e.target.getAttribute && e.target.getAttribute("data-ev"); if (id) toggle(id); });
    $("ew-out").addEventListener("keydown", function (e) { var id = e.target.getAttribute && e.target.getAttribute("data-ev"); if (id && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); toggle(id); } });
    $("ew-play").addEventListener("click", function () {
      if (timer) { clearInterval(timer); timer = null; $("ew-play").textContent = "Replay the stream"; return; }
      var s = $("ew-time"); s.value = 0; s.dataset.end = "0"; $("ew-play").textContent = "Stop";
      var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) { s.value = s.max; s.dataset.end = "1"; draw(); $("ew-play").textContent = "Replay the stream"; return; }
      timer = setInterval(function () {
        s.value = +s.value + 1; draw();
        if (+s.value >= +s.max) { clearInterval(timer); timer = null; s.dataset.end = "1"; $("ew-play").textContent = "Replay the stream"; }
      }, 140);
    });
    $("ew-new").addEventListener("click", function () { seed++; make(); $("ew-time").dataset.end = "1"; setMax(); draw(); });
    make(); $("ew-time").dataset.end = "1"; setMax(); draw();
  }

  // ------------------------------------------------------------------ 7. DAG replay
  function initDag() {
    var TASKS = [{ id: "generate_raw_data", base: 4 }, { id: "pyspark_transform", base: 12 }, { id: "great_expectations_validate", base: 3 }];
    var DATES = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"];
    var faults = [{ task: "pyspark_transform", date: "2026-10-02", times: 1 }, { task: "great_expectations_validate", date: "2026-10-04", times: 99 }];
    var st, clock, chosen = null, note = "";
    $("dag-f-task").innerHTML = TASKS.map(function (t) { return "<option>" + t.id + "</option>"; }).join("");
    $("dag-f-date").innerHTML = DATES.map(function (d) { return "<option>" + d + "</option>"; }).join("");
    function drawFaults() {
      $("dag-faults").innerHTML = faults.map(function (f, i) {
        return "<li>" + h(f.task) + " on " + f.date.slice(5) + ", " + (f.times >= 99 ? "every attempt" : f.times + " attempt" + (f.times > 1 ? "s" : "")) + ' <button type="button" data-fault="' + i + '" aria-label="Remove this failure">&times;</button></li>';
      }).join("") || '<li class="lt-note">No failures injected: every task succeeds.</li>';
    }
    $("dag-f-add").addEventListener("click", function () {
      var f = { task: $("dag-f-task").value, date: $("dag-f-date").value, times: +$("dag-f-times").value };
      faults = faults.filter(function (x) { return !(x.task === f.task && x.date === f.date); }); faults.push(f); drawFaults();
    });
    $("dag-faults").addEventListener("click", function (e) { var i = e.target.getAttribute && e.target.getAttribute("data-fault"); if (i !== null && i !== undefined) { faults.splice(+i, 1); drawFaults(); } });
    function hhmm(m) { var d = Math.floor(m / 1440), hh = Math.floor(m % 1440 / 60), mm = Math.round(m % 60); return (d ? "+" + d + "d " : "") + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0"); }
    function dur(task, date, n) { var r = rng(date.length * 31 + +date.slice(-2) * 7 + task.base * 13 + n); return Math.max(1, Math.round(task.base * (0.8 + r() * 0.5))); }
    function reset() { st = {}; DATES.forEach(function (d) { st[d] = {}; TASKS.forEach(function (t) { st[d][t.id] = { state: "none", tries: [] }; }); }); clock = 9 * 60; chosen = null; note = ""; }
    function advance() {
      var retries = +$("dag-retries").value, delay = +$("dag-delay").value, dop = $("dag-dop").checked;
      note = "";
      for (var di = 0; di < DATES.length; di++) {
        var d = DATES[di], blocked = false;
        for (var ti = 0; ti < TASKS.length; ti++) {
          var t = TASKS[ti], cell = st[d][t.id];
          if (cell.state === "success" || cell.state === "failed" || cell.state === "upstream_failed") continue;
          var up = ti === 0 ? "success" : st[d][TASKS[ti - 1].id].state;
          if (up === "failed" || up === "upstream_failed") { cell.state = "upstream_failed"; continue; }
          if (up !== "success") { cell.state = "waiting"; continue; }
          if (dop && di > 0 && st[DATES[di - 1]][t.id].state !== "success") {
            cell.state = "waiting"; blocked = true;
            note = "The backfill stops at " + d + ": " + t.id + " has depends_on_past, and its run for " + DATES[di - 1] + " did not succeed. Airflow reports this as a deadlock. Clear the failed task to unblock it.";
            break;
          }
          var f = faults.find(function (x) { return x.task === t.id && x.date === d; }), budget = retries + 1, used = 0;
          while (true) {
            var n = cell.tries.length + 1, fail = f && n <= f.times, len = fail ? Math.max(1, Math.round(dur(t, d, n) * 0.4)) : dur(t, d, n);
            cell.tries.push({ n: n, start: clock, end: clock + len, ok: !fail }); clock += len; used++;
            if (!fail) { cell.state = "success"; break; }
            if (used >= budget) { cell.state = "failed"; break; }
            cell.tries[cell.tries.length - 1].retry = true; clock += delay;
          }
        }
        if (blocked) break;
        clock += 1;
      }
      draw();
    }
    function runState(d) {
      var s = TASKS.map(function (t) { return st[d][t.id].state; });
      if (s.every(function (x) { return x === "success"; })) return "success";
      if (s.some(function (x) { return x === "failed" || x === "upstream_failed"; })) return "failed";
      if (s.some(function (x) { return x === "waiting"; })) return "running";
      return "none";
    }
    function span(d) {
      var tries = []; TASKS.forEach(function (t) { tries = tries.concat(st[d][t.id].tries); });
      if (!tries.length) return null;
      return [Math.min.apply(null, tries.map(function (x) { return x.start; })), Math.max.apply(null, tries.map(function (x) { return x.end; }))];
    }
    function draw() {
      var sla = +$("dag-sla").value, o = [];
      o.push('<div class="lt-dag-flow"><span class="t">generate_raw_data</span>&rarr;<span class="t">pyspark_transform</span>&rarr;<span class="t">great_expectations_validate</span></div>');
      if (note) o.push('<p class="lt-callout bad">' + h(note) + "</p>");
      var g = '<div class="lt-scroll"><table class="lt-dag-grid"><thead><tr><th></th>' + DATES.map(function (d) {
        var rs = runState(d), sp = span(d), late = sp && sp[1] - sp[0] > sla;
        return '<th title="Run ' + d + ": " + rs + '">' + d.slice(5) + "<br>" + (rs === "none" ? pill("idle", "not run") : pill(rs === "success" ? "ok" : rs === "failed" ? "bad" : "warn", rs)) + (late ? "<br>" + pill("warn", "slow") : "") + "</th>";
      }).join("") + "</tr></thead><tbody>";
      TASKS.forEach(function (t) {
        g += "<tr><th>" + t.id + "</th>" + DATES.map(function (d) {
          var c = st[d][t.id], label = c.tries.length > 1 ? c.tries.length : "", on = chosen && chosen.d === d && chosen.t === t.id;
          var stateName = c.state === "none" ? "no status" : c.state.replace("_", " ");
          return '<td><button type="button" class="lt-cell ' + c.state + '" data-d="' + d + '" data-t="' + t.id + '" aria-pressed="' + !!on + '" aria-label="' + t.id + " on " + d + ": " + stateName + (c.tries.length ? ", " + c.tries.length + " tr" + (c.tries.length > 1 ? "ies" : "y") : "") + '" title="' + stateName + '">' + label + "</button></td>";
        }).join("") + "</tr>";
      });
      g += "</tbody></table></div>";
      o.push(g);
      o.push('<ul class="lt-legend"><li><i style="background:var(--lt-ok)"></i>success</li><li><i style="background:var(--lt-bad)"></i>failed</li><li><i style="background:var(--lt-orange)"></i>upstream failed</li><li><i style="border:1px dashed var(--lt-idle)"></i>no status / waiting</li><li>A number in a cell is how many tries it took. Tap a cell for its log.</li></ul>');
      var ok = DATES.filter(function (d) { return runState(d) === "success"; }).length, fails = DATES.filter(function (d) { return runState(d) === "failed"; }).length;
      var tries = 0, retried = 0; DATES.forEach(function (d) { TASKS.forEach(function (t) { tries += st[d][t.id].tries.length; if (st[d][t.id].tries.length > 1) retried++; }); });
      var slow = DATES.filter(function (d) { var sp = span(d); return sp && sp[1] - sp[0] > sla; });
      o.push('<dl class="lt-kpis"><div class="lt-kpi"><dt>Runs succeeded</dt><dd>' + ok + " <small>of " + DATES.length + '</small></dd></div><div class="lt-kpi"><dt>Runs failed</dt><dd>' + fails + '</dd></div><div class="lt-kpi"><dt>Task tries</dt><dd>' + tries + " <small>(" + retried + ' retried)</small></dd></div><div class="lt-kpi"><dt>Runs over ' + sla + " min</dt><dd>" + slow.length + "</dd></div></dl>");
      if (slow.length) o.push('<p class="lt-note">Slow: ' + slow.map(function (d) { var sp = span(d); return d + " took " + (sp[1] - sp[0]) + " min"; }).join("; ") + ". Retries and their delays count toward a run's time.</p>");
      if (chosen) {
        var c = st[chosen.d][chosen.t];
        o.push('<h4 class="lt-sub">' + h(chosen.t) + " &middot; " + chosen.d + "</h4>");
        if (!c.tries.length) o.push('<p class="lt-note">' + (c.state === "upstream_failed" ? "Never started: a task upstream failed, so Airflow marked this one upstream_failed." : "No tries yet: it's waiting on an upstream task or on depends_on_past.") + "</p>");
        else o.push('<pre class="lt-tree">' + c.tries.map(function (x) {
          return "[" + hhmm(x.start) + "] try " + x.n + " started\n[" + hhmm(x.end) + "] " + (x.ok ? "Marked task as SUCCESS (" + (x.end - x.start) + " min)" : "Task exited with return code 1. " + (x.retry ? "Marked task as UP_FOR_RETRY" : "Marked task as FAILED"));
        }).join("\n") + "</pre>");
        if (c.state === "failed" || c.state === "upstream_failed") o.push('<div class="lt-actions"><button type="button" class="btn btn-accent" id="dag-clear">Fix it and re-run (this step and the ones after it)</button></div>');
      }
      $("dag-out").innerHTML = o.join("");
    }
    $("dag-out").addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("button.lt-cell");
      if (b) { chosen = { d: b.getAttribute("data-d"), t: b.getAttribute("data-t") }; draw(); return; }
      if (e.target.id === "dag-clear" && chosen) {
        faults = faults.filter(function (x) { return !(x.task === chosen.t && x.date === chosen.d); }); drawFaults();
        var start = TASKS.findIndex(function (t) { return t.id === chosen.t; });
        if (st[chosen.d][chosen.t].state === "upstream_failed") { // clear from the failed task upstream instead
          for (var k = start; k >= 0; k--) if (st[chosen.d][TASKS[k].id].state === "failed") { start = k; break; }
          faults = faults.filter(function (x) { return !(x.task === TASKS[start].id && x.date === chosen.d); }); drawFaults();
        }
        TASKS.slice(start).forEach(function (t) { st[chosen.d][t.id].state = "none"; });
        DATES.forEach(function (d) { TASKS.forEach(function (t) { if (st[d][t.id].state === "waiting") st[d][t.id].state = "none"; }); });
        clock += 20; advance();
      }
    });
    $("dag-run").addEventListener("click", function () { reset(); advance(); });
    drawFaults(); reset();
    $("dag-out").innerHTML = '<p class="lt-note">Two failures are set up: the transform fails once on Oct 2 (a retry fixes it), and the check fails every time on Oct 4. Press Run the 5 days.</p>';
  }

  // ------------------------------------------------------------------ registry and start
  var INIT = { "lt-fit": initFit, "lt-contract": initContract, "lt-scd": initScd, "lt-drift": initDrift,
               "lt-travel": initTravel, "lt-windows": initWindows, "lt-dag": initDag };
  function start() {
    Object.keys(INIT).forEach(function (id) {
      try { INIT[id](); } catch (e) { if (window.console) console.error(id, e); }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else setTimeout(start, 0);
})();
