// The Lab's member Q&A demo (templates/_lab_stats.html, #st-qa): the NLP-based-Q-A-system project's answer_question (main.py)
// rewritten for the browser. The question is embedded by the same all-MiniLM-L6-v2 model (Transformers.js, its 8-bit ONNX copy),
// the member's messages are ranked by cosine similarity against the embeddings Python wrote (export_lab_data.py), and the answer
// is read with the same regex rules. spaCy's NER step does not run in a browser, so the member is found by main.py's own
// first-name fallback. tools/check_lab_qa.js holds this to Python's answers on the project's 26 labelled questions.
(function (root) {
  "use strict";
  var TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.6";
  var MODEL = "Xenova/all-MiniLM-L6-v2", REVISION = "751bff37182d3f1213fa05d7196b954e230abad9"; // pinned: the files CI checks

  var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  var PHONE_RE = /\b(?:\+?\d[\d\-\s()]{7,}\d)\b/g;
  var NUMBER_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };
  var WORDS = Object.keys(NUMBER_WORDS).join("|"), MONTHS = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
  // Dates ("November 20", "December 3rd"), times ("8pm") and phone-like digit runs are not counts
  var NOT_A_COUNT_RE = new RegExp("\\b" + MONTHS + "\\s+\\d{1,2}(?:st|nd|rd|th)?\\b|\\b\\d{1,2}\\s*(?:am|pm)\\b|\\d[\\d\\-]{6,}\\d", "gi");
  var COUNT_RE = new RegExp("\\b(\\d+|" + WORDS + ")\\b", "gi");
  var PARTY_RE = new RegExp("\\b(?:for|of)\\s+(\\d+|" + WORDS + ")\\b", "i");

  function findSubject(question, members) { // main.py find_subject's first-name fallback
    var tokens = question.replace(/[^a-zA-Z\s]/g, " ").toLowerCase().split(/\s+/).filter(Boolean);
    for (var i = 0; i < members.length; i++) if (tokens.indexOf(members[i].split(/\s+/)[0].toLowerCase()) >= 0) return members[i];
    return null;
  }
  function toInt(t) { return /^\d+$/.test(t) ? parseInt(t, 10) : NUMBER_WORDS[t.toLowerCase()]; }
  function extractContact(text) {
    var emails = text.match(EMAIL_RE) || [], phones = (text.match(PHONE_RE) || []).map(function (p) { return p.trim(); });
    return emails.concat(phones);
  }
  function extractCounts(text) {
    var out = [], m, s = text.replace(NOT_A_COUNT_RE, " ");
    COUNT_RE.lastIndex = 0;
    while ((m = COUNT_RE.exec(s))) out.push(toInt(m[1]));
    return out;
  }
  function inferCompanions(message) {
    var party = PARTY_RE.exec(message.replace(NOT_A_COUNT_RE, " ")), counts = extractCounts(message);
    var total = party ? toInt(party[1]) : (counts.length ? counts[0] : 1);
    return total > 1 ? "Yes, going with " + (total - 1) + " person(s)." : "No, going alone.";
  }
  function cleanText(text) { text = text.trim(); return Array.from(text).length > 250 ? Array.from(text).slice(0, 247).join("") + "..." : text; }

  // Cosine similarity of one query vector against rows of a matrix (dims values per row), for the given row indices.
  function rank(query, matrix, dims, rows) {
    var qn = 0; for (var d = 0; d < dims; d++) qn += query[d] * query[d]; qn = Math.sqrt(qn);
    return rows.map(function (r) {
      var dot = 0, n = 0, o = r * dims;
      for (var k = 0; k < dims; k++) { var v = matrix[o + k]; dot += query[k] * v; n += v * v; }
      return [r, dot / (qn * Math.sqrt(n))];
    }).sort(function (a, b) { return b[1] - a[1]; });
  }

  // main.py answer_question, given the member and the ranked messages.
  function answerFor(question, subject, ranked, messages) {
    var q = question.trim();
    if (!q) return "Please ask a valid question.";
    if (subject === null) return "No user found in your question.";
    if (!ranked.length) return "No relevant information found for this user.";
    var msg = messages[ranked[0][0]][1], ql = q.toLowerCase();
    var has = function (keys) { return keys.some(function (k) { return ql.indexOf(k) >= 0; }); };
    if (has(["contact", "phone", "email", "number"])) {
      var c = extractContact(msg);
      return c.length ? subject + "'s contact: " + c[0] : "No contact info found for " + subject + ".";
    }
    if (has(["how many", "tickets", "reservations"])) { var nums = extractCounts(msg); if (nums.length) return subject + " has " + nums[0] + " item(s)."; }
    if (has(["someone", "with"])) return subject + ": " + inferCompanions(msg);
    return subject + ": " + cleanText(msg);
  }

  // float16 (little-endian) -> float32
  function halfToFloat(buffer) {
    var u = new Uint16Array(buffer), out = new Float32Array(u.length);
    for (var i = 0; i < u.length; i++) {
      var h = u[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 0x1f, f = h & 0x3ff;
      out[i] = e === 0 ? s * Math.pow(2, -14) * (f / 1024) : e === 31 ? (f ? NaN : s * Infinity) : s * Math.pow(2, e - 15) * (1 + f / 1024);
    }
    return out;
  }

  // localDir (the Node check only): read the model files from a folder instead of the Hugging Face hub.
  function embedder(transformers, localDir) {
    transformers.env.allowLocalModels = !!localDir;
    if (localDir) { transformers.env.allowRemoteModels = false; transformers.env.localModelPath = localDir; }
    if (transformers.env.backends && transformers.env.backends.onnx && transformers.env.backends.onnx.wasm) transformers.env.backends.onnx.wasm.numThreads = 1;
    return transformers.pipeline("feature-extraction", MODEL, { dtype: "q8", revision: REVISION }).then(function (extract) {
      return function (texts) {
        return extract(texts, { pooling: "mean", normalize: true }).then(function (t) {
          var dims = t.dims[t.dims.length - 1], data = t.data;
          return texts.map(function (_, i) { return data.slice(i * dims, (i + 1) * dims); });
        });
      };
    });
  }

  var api = { findSubject: findSubject, extractContact: extractContact, extractCounts: extractCounts, inferCompanions: inferCompanions,
              rank: rank, answerFor: answerFor, halfToFloat: halfToFloat, embedder: embedder, MODEL: MODEL };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabQA = api;
  if (!document.getElementById("st-qa")) return;

  var $ = function (id) { return document.getElementById(id); };
  function h(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function init() {
    var data = null, matrix = null, checks = null, embedPromise = null, mode = "members", busy = false;
    function loadData() {
      if (data) return Promise.resolve();
      return Promise.all([fetch("/lab/data/qa/messages.json").then(function (r) { return r.json(); }),
                          fetch("/lab/data/qa/embeddings.bin").then(function (r) { if (!r.ok) throw new Error("The messages could not be downloaded"); return r.arrayBuffer(); }),
                          fetch("/lab/data/qa/answers.json").then(function (r) { return r.json(); })]).then(function (got) {
        data = got[0]; matrix = halfToFloat(got[1]); checks = got[2].questions;
      });
    }
    function loadModel() {
      if (!embedPromise) embedPromise = import(TF_URL).then(embedder).catch(function (e) { embedPromise = null; throw new Error("The language model could not be downloaded (" + (e.message || e) + ")"); });
      return embedPromise;
    }
    function bars(list, texts, label) {
      return '<ol class="qa-list">' + list.map(function (p, i) {
        return '<li class="' + (i === 0 ? "qa-top" : "") + '"><span class="qa-sim">' + p[1].toFixed(3) + '</span><span class="qa-text">' + (label ? '<b>' + h(label(p[0])) + ":</b> " : "") + h(texts(p[0])) + "</span></li>";
      }).join("") + "</ol>";
    }
    function ask() {
      if (busy) return;
      var q = $("qa-question").value.trim();
      if (!q) { $("qa-out").innerHTML = '<p class="lt-note">Type a question first.</p>'; return; }
      if (mode === "own") {
        var lines = $("qa-own").value.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).slice(0, 300);
        if (!lines.length) { $("qa-out").innerHTML = '<p class="lt-note">Paste some lines of text to search first.</p>'; return; }
      }
      busy = true; $("qa-ask").disabled = true;
      $("qa-out").innerHTML = '<p class="lt-note">' + (embedPromise ? "Searching..." : "Downloading the language model and its runtime (about 27 MB, first time only)...") + "</p>";
      var t0 = 0;
      Promise.all([loadModel(), loadData()]).then(function (got) {
        var embed = got[0]; t0 = performance.now();
        return mode === "own" ? embed([q].concat(lines)).then(function (v) { return { own: true, v: v }; }) : embed([q]).then(function (v) { return { own: false, v: v }; });
      }).then(function (res) {
        var ms = Math.round(performance.now() - t0), html = "";
        if (res.own) {
          var vecs = res.v.slice(1), flat = new Float32Array(vecs.length * vecs[0].length);
          vecs.forEach(function (v, i) { flat.set(v, i * v.length); });
          var ranked = rank(res.v[0], flat, res.v[0].length, vecs.map(function (_, i) { return i; }));
          html += '<p class="lm-verdict">Closest in meaning to your question, out of ' + vecs.length + " line" + (vecs.length > 1 ? "s" : "") + ":</p>" + bars(ranked.slice(0, 5), function (i) { return lines[i]; });
          html += '<p class="lt-note">Similarity runs from -1 to 1; above about 0.5 usually means the same topic. Embedded in your browser in ' + ms + " ms; nothing was uploaded. This is the search step only: the answer rules below the member search are written for concierge requests.</p>";
        } else {
          var subject = findSubject(q, data.members), rows = [];
          if (subject !== null) data.messages.forEach(function (m, i) { if (m[0] === subject) rows.push(i); });
          var r = subject === null ? [] : rank(res.v[0], matrix, data.dims, rows), answer = answerFor(q, subject, r, data.messages);
          html += '<p class="lm-verdict">' + h(answer) + "</p>";
          html += '<p class="lt-note">' + (subject === null ? "No member's first name is in the question, so the project refuses to guess. Try one of: " + data.members.map(function (n) { return n.split(" ")[0]; }).join(", ") + "."
            : "Member: <b>" + h(subject) + "</b>, found by first name. Their " + rows.length + " messages, ranked by meaning (cosine similarity of the embeddings):") + "</p>";
          if (r.length) html += bars(r.slice(0, 5), function (i) { return data.messages[i][1]; });
          var known = checks.filter(function (c) { return c.question === q; })[0];
          if (known && r.length) {
            var same = known.top[0][0] === r[0][0] && known.answer === answer;
            html += '<p class="lt-note">' + (same ? '<span class="lt-pill ok">matches Python</span> ' : '<span class="lt-pill warn">differs from Python</span> ') +
              "Python's top message scored " + known.top[0][1].toFixed(3) + " and its answer was “" + h(known.answer) + "”. " +
              (known.labelled === r[0][0] ? "That is the message this labelled question asks about." : "The labelled answer is a different message, one of the project's known misses.") + "</p>";
          }
          html += '<p class="lt-note">Question embedded in ' + ms + " ms in your browser.</p>";
        }
        $("qa-out").innerHTML = html;
      }).catch(function (e) {
        $("qa-out").innerHTML = '<p class="lt-note">' + h(e.message || "The search could not run") + ". Check your connection and try again.</p>";
      }).then(function () { busy = false; $("qa-ask").disabled = false; });
    }
    function setMode(m) {
      mode = m; $("qa-members-pick").hidden = m !== "members"; $("qa-own-pick").hidden = m !== "own"; $("qa-out").innerHTML = "";
      $("qa-question").value = m === "own" ? $("qa-question").dataset.own : ($("qa-sample").value || "");
    }
    fetch("/lab/data/qa/answers.json").then(function (r) { return r.json(); }).then(function (d) {
      $("qa-sample").innerHTML = '<option value="">Choose a labelled question</option>' + d.questions.map(function (c) { return "<option>" + h(c.question) + "</option>"; }).join("");
      $("qa-sample").value = d.questions[0].question; if (mode === "members") $("qa-question").value = d.questions[0].question;
    }).catch(function () {});
    $("qa-sample").addEventListener("change", function () { if (this.value) $("qa-question").value = this.value; $("qa-out").innerHTML = ""; });
    $("qa-ask").addEventListener("click", ask);
    $("qa-question").addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); ask(); } });
    document.querySelectorAll('input[name="qa-mode"]').forEach(function (r) { r.addEventListener("change", function () { setMode(this.value); }); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
