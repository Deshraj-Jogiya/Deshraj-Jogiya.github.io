// The Lab's post checker (templates/_lab_stats.html, #st-posts): CurioSync's writing checks (app/services/post_rules.py,
// writing_problems) rewritten for the browser, run on a LinkedIn draft the visitor pastes. The checks that need the project's facts
// (invented numbers or tools, "we" on solo work) are left out. tools/check_lab_posts.js holds this port to the Python on a fixture of
// real and test drafts: the same problems, in the same order.
(function (root) {
  "use strict";
  var MIN_CHARS = 800, MAX_CHARS = 1700, MIN_WORDS = 150, MAX_FIRST_LINE = 140, MAX_HASHTAGS = 2;
  var MAX_WORD_USES = 4, MAX_NUMBER_USES = 2, FRAGMENT_CHARS = 70, CLOSING_QUESTION_WORDS = 10;
  var BANNED_WORDS = ["delve", "delving", "leverage", "leveraged", "leveraging", "game-changer", "game changer", "crucial", "seamless", "seamlessly",
    "robust", "rigorous", "significant", "significantly", "cutting-edge", "pivotal", "paramount", "vital", "critical", "tapestry",
    "testament", "realm", "intricate", "showcasing", "spearheaded", "synergy", "unlock", "unleash", "elevate", "empower",
    "revolutionize", "transformative", "landscape", "navigate", "journey", "embark", "deep dive", "dive into", "in today's",
    "ever-evolving", "fast-paced", "at the end of the day", "humbled", "thrilled", "excited to share", "proud to announce",
    "game changing", "next level", "harness", "pioneered", "pioneering", "ensures"];
  var STRUCTURE_PATTERNS = [
    [/\bnot (?:just|only|merely) [^.!?\n]{1,60}\bbut\b/m, "'not just X but Y' construction"],
    [/\bit'?s not [^.!?\n]{1,40}[,;] it'?s\b/m, "'it's not X, it's Y' construction"],
    [/\bhere'?s the thing\b/m, "'here's the thing'"],
    [/\bthe (?:best|good) part\?/m, "rhetorical 'the best part?'"],
    [/\blet that sink in\b/m, "'let that sink in'"],
    [/\b(?:thoughts|agree)\?\s*$/m, "one-word engagement question"]];
  var ENGAGEMENT_BAIT = /\b(?:like|share|repost)\s+(?:this\s+(?:post|if)|if|for)\b|\bfollow\s+(?:me|for)\b|\bcomment\s+(?:below|yes|'|")|\btag someone\b|\bdrop a\b/i;
  var EMOJI = /[\u{1F000}-\u{1FAFF}☀-➿️]/u, STYLED = /[\u{1D400}-\u{1D7FF}]/u;
  var NUMBER = /(?<![\w.])\$?\d/;
  var DETACHED = /^(to (test|confirm|check|verify|validate|measure|evaluate)\b(?!\s+(this|that|it)\b)|this (involved|included|meant running)\b)/i;
  var GENERIC_QUESTION = /\b(what do you think|thoughts\?|agree\?|any thoughts|how about you|what about you|let me know)/i;
  var VAGUE_CLOSE = /\b(?:this|the|my) (?:approach|work|solution|system|project|change|decision|design|setup|pipeline|platform|method|tool)\b[^.]{0,40}\b(?:ensures?|enables?|allows?|helps?|lets|makes?|paves?|drives?|empowers?|guarantees?)\b/i;
  var METRIC = /\d+(?:\.\d+)?\s?%|\b0\.\d+|\b\d+(?:\.\d+)?x\b/;
  var COMMON = new Set(("that this with from have were when what which their there they them then than into about only each every also been " +
    "being more most over just like your will would could should because while where after before other these those some " +
    "such does doing done made make makes using used uses very much many first last both same here once twice").split(" "));

  // Python counts and slices by code point; JavaScript strings count UTF-16 units, so emoji would be counted twice.
  // Python's \w is any Unicode letter, digit or underscore; JavaScript's is ASCII only, so word tests use this class.
  var HASHTAG = /(?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+/gu, WORDCHAR = /[\p{L}\p{N}_]/u;
  function len(s) { return Array.from(s).length; }
  function cut(s, n) { return Array.from(s).slice(0, n).join(""); }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
  function sentences(s) { return s.split(/(?<=[.!?])\s+/).filter(Boolean); }
  function stem(w) { return w.endsWith("s") && !w.endsWith("ss") && w.length > 4 ? w.slice(0, -1) : w; }
  function words(s) { return s.trim().split(/\s+/).filter(Boolean); }

  function repetitionProblems(text) {
    var body = text.replace(HASHTAG, "");
    body = body.replace(/\b(Engineer|Scientist|Analyst)s?( (?:and|or) (?:[A-Z]\w* ){1,3})\1s?\b/g, "$1$2title");
    var problems = [], counts = new Map();
    (body.toLowerCase().match(/[a-z][a-z'-]+/g) || []).forEach(function (w) {
      if (w.length >= 4 && !COMMON.has(w)) counts.set(stem(w), (counts.get(stem(w)) || 0) + 1);
    });
    Array.from(counts.entries()).sort(function (a, b) { return b[1] - a[1]; }).forEach(function (kv) {
      if (kv[1] > MAX_WORD_USES) problems.push("repetition: '" + kv[0] + "' is used " + kv[1] + " times; use it at most " + MAX_WORD_USES + " times, then name the specific thing or say 'it'");
    });
    body.split(/(?<=[.!?])\s+/).forEach(function (sentence) {
      var seen = new Map();
      (sentence.toLowerCase().match(/[a-z][a-z'-]+/g) || []).forEach(function (w) {
        if (w.length >= 4 && !COMMON.has(w)) seen.set(stem(w), (seen.get(stem(w)) || 0) + 1);
      });
      var doubled = Array.from(seen.entries()).filter(function (kv) { return kv[1] > 1; });
      if (doubled.length) problems.push("repetition: \"" + cut(sentence.trim(), 50) + "...\" uses '" + doubled[0][0] + "' twice in one sentence");
    });
    var numbers = new Map();
    (body.match(/\d[\d,.]*\d|\d/g) || []).forEach(function (n) { numbers.set(n, (numbers.get(n) || 0) + 1); });
    numbers.forEach(function (k, n) { if (k > MAX_NUMBER_USES) problems.push("repetition: the number " + n + " appears " + k + " times; state each number once, twice at most"); });
    return problems;
  }

  function flowProblems(text) {
    var paras = text.trim().split("\n\n").map(function (p) { return p.trim(); }).filter(function (p) { return p && !p.startsWith("#"); });
    var problems = [], asks = paras.length > 0 && paras[paras.length - 1].replace(/\s+$/, "").endsWith("?");
    var result = asks && paras.length > 2 ? paras[paras.length - 2] : (paras.length ? paras[paras.length - 1] : "");
    var body = asks ? paras.slice(1, -2) : paras.slice(1, -1);
    if (paras.length > 1 && !asks) {
      problems.push("closing: end with one specific question for people who do this work, tied to the post's own decision " +
                    "(\"If you monitor a model whose labels arrive late, do you retrain on a schedule or on the alert?\")");
    } else if (asks && (words(paras[paras.length - 1]).length < CLOSING_QUESTION_WORDS || GENERIC_QUESTION.test(paras[paras.length - 1]))) {
      problems.push("closing: the question is generic; ask about the specific choice this post made, as someone who has to make it");
    }
    if (paras.length > 1 && VAGUE_CLOSE.test(result) && !NUMBER.test(result)) {
      problems.push("closing: the result paragraph is a general claim (\"this approach ensures/enables...\"); state the concrete " +
                    "result: what someone can now do, or the number the work reached");
    }
    if (paras.length) {
      var opening = sentences(paras[0]);
      if (opening.length === 1 && METRIC.test(opening[0])) {
        problems.push("opening: the first paragraph is a bare result; say first what the project is and what problem it solves, then the result");
      }
    }
    body.forEach(function (p) {
      if (DETACHED.test(p)) problems.push("reading flow: a paragraph opens with \"" + words(p).slice(0, 4).join(" ") + "...\"; link it to the paragraph before (say why the test was needed, or what it showed)");
      if (sentences(p).length === 1 && len(p) < FRAGMENT_CHARS) problems.push("reading flow: \"" + cut(p, 60) + "\" is a one-sentence fragment; merge it into the paragraph it belongs to");
    });
    return problems;
  }

  function writingProblems(draft, source) {
    var problems = [], text = draft.trim(), sourceLower = (source || "").toLowerCase();
    var lines = text.split(new RegExp("\r\n|[\n\r\v\f\x1c-\x1e\x85\u2028\u2029]")).filter(function (l) { return l.trim(); });
    if (!lines.length) return ["empty draft"];
    if (len(text) < MIN_CHARS || len(text) > MAX_CHARS) problems.push("length " + len(text) + " characters, must be " + MIN_CHARS + "-" + MAX_CHARS);
    if (len(lines[0]) > MAX_FIRST_LINE) problems.push("first line is " + len(lines[0]) + " characters, must be at most " + MAX_FIRST_LINE + " so it shows before 'see more'");
    var lower = text.toLowerCase();
    BANNED_WORDS.forEach(function (w) {
      var re = new RegExp("(?<![\\p{L}\\p{N}_-])" + esc(w) + "(?![\\p{L}\\p{N}_-])", "u");
      if (re.test(lower) && !re.test(sourceLower)) problems.push("filler word '" + w + "'");
    });
    STRUCTURE_PATTERNS.forEach(function (p) { if (p[0].test(lower)) problems.push("AI-tell: " + p[1]); });
    if (ENGAGEMENT_BAIT.test(text)) problems.push("asks for likes, shares, follows or comments (engagement bait)");
    problems = problems.concat(flowProblems(text), repetitionProblems(text));
    if (EMOJI.test(text)) problems.push("contains emoji");
    if (STYLED.test(text)) problems.push("contains unicode bold/italic letters");
    if ((text.match(HASHTAG) || []).length > MAX_HASHTAGS) problems.push("more than " + MAX_HASHTAGS + " hashtags");
    if (text.split("—").length - 1 > 1) problems.push("more than one em dash");
    var paras = text.split(/\n\s*\n/).map(function (p) { return p.trim(); }).filter(function (p) { return p && !p.startsWith("#"); });
    var openers = paras.map(function (p) { return (p.toLowerCase().match(/[a-z']+/g) || []).slice(0, 2); });
    var iStarts = openers.filter(function (o) { return o[0] === "i"; }).length;
    if (iStarts > 2) problems.push(iStarts + " paragraphs start with 'I'; open at most 2 that way");
    for (var i = 0; i + 1 < openers.length; i++) {
      var a = openers[i], b = openers[i + 1];
      if (a.length === 2 && a[0] === b[0] && a[1] === b[1] && b.length === 2) { problems.push("two paragraphs in a row open with '" + a.join(" ") + "'"); break; }
    }
    var count = words(text.replace(HASHTAG, "")).filter(function (w) { return WORDCHAR.test(w); }).length;
    if (count < MIN_WORDS) problems.push(count + " words, must be at least " + MIN_WORDS + ": add about " + (MIN_WORDS - count + 15) + " words using only details the " +
      "facts already give (how the test was set up, each result and what it means, what the decision changed); never add a reason or benefit the facts do not state");
    return problems;
  }

  var api = { writingProblems: writingProblems };
  if (typeof module === "object" && module.exports) { module.exports = api; return; }
  root.LabPosts = api;
  if (!document.getElementById("st-posts")) return;

  function init() {
    var $ = function (id) { return document.getElementById(id); }, box = $("ps-draft"), out = $("ps-out"), samples = [], timer = 0;
    function h(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
    function check() {
      var text = box.value, p = writingProblems(text, "");
      $("ps-count").textContent = len(text.trim()) + " characters, " + words(text.replace(HASHTAG, "")).filter(function (w) { return WORDCHAR.test(w); }).length + " words";
      out.innerHTML = !text.trim() ? '<p class="lt-note">Paste a draft, or pick a sample.</p>' : p.length
        ? '<p class="lm-verdict"><span class="lt-pill warn">' + p.length + " to fix</span> CurioSync would send this back for a rewrite:</p><ul class=\"ps-list\">" + p.map(function (x) { return "<li>" + h(x) + "</li>"; }).join("") + "</ul>"
        : '<p class="lm-verdict"><span class="lt-pill ok">passes</span> No writing problems found. CurioSync would still check every number and tool against the project\'s facts before posting.</p>';
    }
    box.addEventListener("input", function () { $("ps-sample").value = ""; clearTimeout(timer); timer = setTimeout(check, 150); });
    $("ps-sample").addEventListener("change", function () { var s = samples[Number(this.value)]; if (s) { box.value = s.text; check(); } });
    fetch("/lab/data/posts.json").then(function (r) { return r.json(); }).then(function (d) {
      samples = d.drafts.filter(function (x) { return x.sample; });
      $("ps-sample").innerHTML = '<option value="">Choose a sample draft</option>' + samples.map(function (s, i) { return '<option value="' + i + '">' + h(s.sample) + "</option>"; }).join("");
      if (samples.length) { box.value = samples[0].text; $("ps-sample").value = "0"; }
      check();
    }).catch(check);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else setTimeout(init, 0);
})(typeof window !== "undefined" ? window : this);
