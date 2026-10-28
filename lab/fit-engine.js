// Rule-based job fit, ported line for line from Career Pilot's app/services/fit_service.py.
// No model and no network: it finds the technical requirements a posting names, looks each one up in a profile
// (experience, projects, skills, certifications) and records where it was found. 60% skill overlap, 20% role type,
// 20% years asked for, then a cap of 40 when the posting's role type is not one the profile targets or has held.
// tools/check_lab_fit.js runs this file against cases scored by the Python original, so the two cannot drift apart.
(function (root) {
  "use strict";

  var ROLE_MISMATCH_CAP = 40;

  var ROLE_FAMILIES = [
    ["ml_ai", "Machine learning / AI engineering", [
      "machine learning", "ml engineer", "mlops", "ml ops", "ai engineer", "ai/ml", "ml/ai", "deep learning",
      "llm", "applied scientist", "computer vision", "nlp engineer", "genai", "generative ai"]],
    ["data_science", "Data science", ["data scientist", "data science", "research scientist", "quantitative analyst"]],
    ["data_engineering", "Data engineering", [
      "data engineer", "analytics engineer", "etl", "elt", "data platform", "data pipeline", "big data",
      "data architect", "data warehouse", "data warehousing", "data integration", "data infrastructure",
      "data ops", "dataops", "database engineer", "data quality"]],
    ["data_analysis", "Data / business analysis", [
      "data analyst", "business analyst", "bi analyst", "business intelligence", "analytics analyst",
      "reporting analyst", "insights analyst", "data analytics", "power bi", "tableau developer", "bi developer",
      "analytics specialist", "reporting specialist"]],
    ["software_engineering", "Software engineering", [
      "software engineer", "software developer", "sde", "swe", "backend", "back-end", "back end", "frontend",
      "front-end", "front end", "full stack", "full-stack", "fullstack", "web developer", "mobile developer",
      "ios", "android", "devops", "site reliability", "sre", "cloud engineer", "platform engineer",
      "application developer", "programmer"]]
  ];
  var FAMILY_LABELS = {};
  ROLE_FAMILIES.forEach(function (f) { FAMILY_LABELS[f[0]] = f[1]; });

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\\/-]/g, "\\$&"); }
  function phraseIn(phrase, text) {
    return new RegExp("(?<![a-z0-9])" + esc(phrase) + "(?![a-z0-9])").test(text);
  }

  // Python's round(): halves go to the even neighbour
  function pyRound(x) {
    var f = Math.floor(x), d = x - f;
    if (d > 0.5) return f + 1;
    if (d < 0.5) return f;
    return f % 2 === 0 ? f : f + 1;
  }

  function roleFamilies(title) {
    var text = (title || "").toLowerCase(), out = new Set();
    ROLE_FAMILIES.forEach(function (f) { if (f[2].some(function (p) { return phraseIn(p, text); })) out.add(f[0]); });
    return out;
  }
  function roleFamily(title) {
    var text = (title || "").toLowerCase();
    for (var i = 0; i < ROLE_FAMILIES.length; i++) {
      if (ROLE_FAMILIES[i][2].some(function (p) { return phraseIn(p, text); })) return ROLE_FAMILIES[i][0];
    }
    return "unclassified";
  }
  function profileRoleFamilies(profile, targetTitles) {
    var titles = [profile.title || ""].concat(targetTitles || []);
    (profile.experience || []).forEach(function (e) { titles.push(e.role || e.title || ""); });
    var fam = new Set();
    titles.forEach(function (t) { roleFamilies(t).forEach(function (k) { fam.add(k); }); });
    return fam;
  }

  var ALIASES = {
    "PostgreSQL": ["postgres", "postgresql"], "Kubernetes": ["kubernetes", "k8s"], "GCP": ["gcp", "google cloud"],
    "AWS": ["aws", "amazon web services"], "Azure": ["azure"], "JavaScript": ["javascript", "js"],
    "TypeScript": ["typescript"], "Node.js": ["node.js", "nodejs"], "Power BI": ["power bi", "powerbi"],
    "scikit-learn": ["scikit-learn", "sklearn"], "CI/CD": ["ci/cd", "ci / cd", "continuous integration"],
    "Machine Learning": ["machine learning"], "A/B testing": ["a/b testing", "a/b tests", "experimentation"],
    "Statistics": ["statistics", "statistical"], "Excel": ["excel", "spreadsheets"], "REST APIs": ["rest api", "rest apis", "restful"],
    "Data modeling": ["data modeling", "data modelling", "dimensional model"], "ETL": ["etl", "elt"],
    "Spark": ["spark", "pyspark"], "Airflow": ["airflow"], "dbt": ["dbt"], "C++": ["c++"], "C#": ["c#"],
    "Go": ["golang"], "Data visualization": ["data visualization", "data visualisation", "dashboards", "dashboard"]
  };

  var VOCABULARY = [
    "Python", "SQL", "Java", "Scala", "R", "C++", "C#", "Go", "Rust", "JavaScript", "TypeScript", "Node.js", "React",
    "Angular", "Vue", "Django", "Flask", "FastAPI", "Spring", "Ruby", "PHP", "Swift", "Kotlin", "Bash",
    "Airflow", "Prefect", "Dagster", "Luigi", "dbt", "Spark", "Hadoop", "Hive", "Kafka", "Flink", "Beam", "Kinesis",
    "Snowflake", "Redshift", "BigQuery", "Databricks", "Synapse", "Delta Lake", "Iceberg", "PostgreSQL", "MySQL",
    "SQL Server", "Oracle", "MongoDB", "Cassandra", "DynamoDB", "Redis", "Elasticsearch",
    "AWS", "GCP", "Azure", "S3", "Glue", "Lambda", "EMR", "EC2", "Docker", "Kubernetes", "Terraform", "CloudFormation",
    "Ansible", "Jenkins", "GitHub Actions", "CI/CD", "Git", "Linux",
    "Tableau", "Power BI", "Looker", "Excel", "SSIS", "SSRS", "Data visualization", "Statistics", "A/B testing",
    "pandas", "NumPy", "scikit-learn", "TensorFlow", "PyTorch", "Keras", "XGBoost", "MLflow", "Hugging Face",
    "LangChain", "Machine Learning", "NLP", "Computer Vision", "LLM", "RAG",
    "REST APIs", "GraphQL", "Microservices", "Data modeling", "ETL", "Great Expectations", "ArcGIS"
  ];

  var EQUIVALENT_GROUPS = [
    ["Airflow", "Prefect", "Dagster", "Luigi"], ["Tableau", "Power BI", "Looker"],
    ["Snowflake", "Redshift", "BigQuery", "Synapse", "Databricks"], ["Jenkins", "GitHub Actions", "CI/CD"],
    ["PostgreSQL", "MySQL", "SQL Server", "Oracle"], ["Kafka", "Kinesis"], ["Flink", "Spark"],
    ["TensorFlow", "PyTorch", "Keras"], ["Terraform", "CloudFormation"], ["AWS", "GCP", "Azure"]
  ];

  var PREFERRED_HEADING = /(nice[- ]to[- ]have|preferred|bonus|pluses|a plus|good to have|desired|optional)/i;
  var SHORT_TERMS = new Set(["R", "Go", "S3", "EC2", "EMR", "NLP", "LLM", "RAG", "Git"]);

  function patterns(term) {
    return [term.toLowerCase()].concat((ALIASES[term] || []).map(function (a) { return a.toLowerCase(); }));
  }
  function shortRe(term) { return new RegExp("(?<![A-Za-z0-9])" + esc(term) + "(?![A-Za-z0-9])"); }
  function mentions(term, text, raw) {
    if (SHORT_TERMS.has(term)) return shortRe(term).test(raw);
    return patterns(term).some(function (p) { return phraseIn(p, text); });
  }

  function splitRequiredPreferred(jd) {
    var lines = jd.split(/\r\n|\r|\n/);
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].length < 80 && PREFERRED_HEADING.test(lines[i])) {
        return [lines.slice(0, i).join("\n"), lines.slice(i).join("\n")];
      }
    }
    return [jd, ""];
  }

  function flatSkills(profile) {
    var s = profile.skills || {};
    if (Array.isArray(s)) return s.slice();
    var out = [];
    Object.keys(s).forEach(function (k) { (s[k] || []).forEach(function (x) { out.push(x); }); });
    return out;
  }

  function profileVocabulary(profile) {
    var atoms = [];
    flatSkills(profile).forEach(function (item) {
      String(item).split(/[(),;/]/).forEach(function (part) {
        part = part.trim();
        if (part.length > 1 && part.length <= 30) atoms.push(part);
      });
    });
    return atoms;
  }

  function evidenceSources(profile) {
    var sources = [];
    (profile.experience || []).forEach(function (e) {
      var where = ((e.role || e.title || "Role") + " at " + (e.company || "")).trim();
      sources.push([where, [e.role || ""].concat(e.bullets || []).join(" ")]);
    });
    (profile.projects || []).forEach(function (p) {
      sources.push(["Project: " + (p.name || ""), (p.bullets || []).concat(p.technologies || []).join(" ")]);
    });
    sources.push(["Skills list", flatSkills(profile).map(String).join(" ")]);
    var certs = (profile.certifications || []).map(function (c) { return typeof c === "string" ? c : (c.name || ""); });
    sources.push(["Certifications", certs.join(" ")]);
    return sources;
  }

  function findEvidence(term, sources) {
    for (var i = 0; i < sources.length; i++) {
      if (mentions(term, sources[i][1].toLowerCase(), sources[i][1])) return sources[i][0];
    }
    return null;
  }

  function firstPos(term, line) {
    var m;
    if (SHORT_TERMS.has(term)) {
      m = shortRe(term).exec(line);
      return m ? [m.index, m.index + m[0].length] : null;
    }
    var low = line.toLowerCase(), best = null;
    patterns(term).forEach(function (p) {
      var mm = new RegExp("(?<![a-z0-9])" + esc(p) + "(?![a-z0-9])").exec(low);
      if (mm) {
        var span = [mm.index, mm.index + mm[0].length];
        if (!best || span[0] < best[0] || (span[0] === best[0] && span[1] < best[1])) best = span;
      }
    });
    return best;
  }

  var OR_JOIN = /^[\s,/]*(?:,?\s*(?:or|and\/or)\s*)?[\s,/]*$/i;
  var LIST_JOIN = /^[\s,/]*(?:,?\s*(?:or|and\/or|and)\s*)?[\s,/]*$/i;
  var LIST_INTRO = /(one of|any of|such as|e\.g\.|for example|like|similar to|equivalent)\s*[:(]?\s*$/i;

  function cmpFound(a, b) {
    if (a[0][0] !== b[0][0]) return a[0][0] - b[0][0];
    if (a[0][1] !== b[0][1]) return a[0][1] - b[0][1];
    return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
  }

  function alternativeGroups(terms, jd) {
    var groups = [];
    jd.split(/\r\n|\r|\n/).forEach(function (line) {
      var found = [];
      terms.forEach(function (t) { var pos = firstPos(t, line); if (pos) found.push([pos, t]); });
      found.sort(cmpFound);
      if (found.length < 2) return;
      var chain = [found[0]];
      var intro = LIST_INTRO.test(line.slice(0, found[0][0][0]));
      var hasOr = false;
      function close() {
        if (chain.length > 1 && (hasOr || intro)) groups.push(chain.map(function (c) { return c[1]; }));
      }
      for (var i = 1; i < found.length; i++) {
        var prev = found[i - 1], cur = found[i];
        var between = line.slice(prev[0][1], cur[0][0]);
        var joiner = intro ? LIST_JOIN : OR_JOIN;
        if (joiner.test(between)) {
          chain.push(cur);
          hasOr = hasOr || /\bor\b/i.test(between);
        } else {
          close();
          chain = [cur]; hasOr = false;
          intro = LIST_INTRO.test(between);
        }
      }
      close();
    });
    return groups;
  }

  function skillOverlap(profile, jd) {
    jd = jd || "";
    var parts = splitRequiredPreferred(jd), requiredText = parts[0], preferredText = parts[1];
    var vocab = [], seenV = new Set();
    VOCABULARY.concat(profileVocabulary(profile)).forEach(function (t) { if (!seenV.has(t)) { seenV.add(t); vocab.push(t); } });
    var sources = evidenceSources(profile);

    var requirements = [];
    vocab.forEach(function (term) {
      var inReq = mentions(term, requiredText.toLowerCase(), requiredText);
      var inPref = !inReq && mentions(term, preferredText.toLowerCase(), preferredText);
      if (inReq || inPref) requirements.push([term, inReq ? 1.0 : 0.5]);
    });
    var names = requirements.map(function (r) { return r[0]; });
    requirements = requirements.filter(function (r) {
      var t = r[0];
      return !names.some(function (o) {
        return o !== t && o.toLowerCase().split(/\s+/).indexOf(t.toLowerCase()) !== -1;
      });
    });

    function assess(term) {
      var where = findEvidence(term, sources);
      if (where) return [1.0, "matched", { term: term, evidence: where }];
      var group = EQUIVALENT_GROUPS.find(function (g) { return g.indexOf(term) !== -1; }) || [];
      var others = group.filter(function (o) { return o !== term; }).sort();
      for (var i = 0; i < others.length; i++) {
        var w = findEvidence(others[i], sources);
        if (w) return [0.5, "transferable", { term: term, via: others[i], evidence: w }];
      }
      return [0.0, "missing", { term: term }];
    }

    var weights = {};
    requirements.forEach(function (r) { weights[r[0]] = r[1]; });
    var units = [], seen = new Set();
    alternativeGroups(requirements.map(function (r) { return r[0]; }), jd).forEach(function (group) {
      group = group.filter(function (t) { return !seen.has(t); });
      if (group.length > 1) { units.push(group); group.forEach(function (t) { seen.add(t); }); }
    });
    requirements.forEach(function (r) { if (!seen.has(r[0])) units.push([r[0]]); });

    var matched = [], transferable = [], missing = [], earned = 0, total = 0;
    units.forEach(function (unit) {
      var weight = Math.max.apply(null, unit.map(function (t) { return weights[t]; }));
      total += weight;
      var best = null;
      unit.forEach(function (t) { var a = assess(t); if (!best || a[0] > best[0]) best = a; });
      var kind = best[1], entry = best[2];
      entry.required = weight === 1.0;
      if (unit.length > 1) {
        entry.alternatives = unit.filter(function (t) { return t !== entry.term; });
        if (kind === "missing") { entry.term = unit.join(" or "); delete entry.alternatives; }
      }
      earned += weight * best[0];
      ({ matched: matched, transferable: transferable, missing: missing })[kind].push(entry);
    });

    return {
      requirements_found: units.length,
      score: total ? pyRound(100 * earned / total) : null,
      matched: matched, transferable: transferable, missing: missing
    };
  }

  function roleCheck(profile, jobTitle, targetTitles) {
    var posting = roleFamilies(jobTitle), families = profileRoleFamilies(profile, targetTitles);
    var status;
    if (!posting.size || !families.size) status = "unknown";
    else if (Array.from(posting).some(function (k) { return families.has(k); })) status = "match";
    else status = "mismatch";
    var labels = ROLE_FAMILIES.filter(function (f) { return posting.has(f[0]); }).map(function (f) { return f[1]; });
    var fam = Array.from(families).sort();
    return {
      posting_family: roleFamily(jobTitle),
      posting_family_label: labels.join(" / ") || "Unclassified title",
      profile_families: fam,
      profile_family_labels: fam.map(function (f) { return FAMILY_LABELS[f]; }),
      status: status
    };
  }

  function mismatchReason(role) {
    return "Role type differs: the posting is " + role.posting_family_label + ", the profile targets " +
      role.profile_family_labels.join(", ") + ". Fit is capped at " + ROLE_MISMATCH_CAP + ".";
  }

  // --- years: the union of employment ranges, overlapping roles counted once (resume_rules.total_experience_months)
  var MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
  function parseSingle(text) {
    text = text.trim().replace(/\.$/, "");
    var m = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(text);
    if (m) { var mo = MONTHS[m[1].slice(0, 3).toLowerCase()]; return mo ? [+m[2], mo] : null; }
    m = /^(\d{4})$/.exec(text);
    return m ? [+m[1], 1] : null;
  }
  function parseRange(s, now) {
    if (!s) return null;
    var parts = s.trim().split(/\s*[-–—]\s*/);
    if (parts.length !== 2) return null;
    var start = parseSingle(parts[0]), endRaw = parts[1].trim();
    var end = endRaw.toLowerCase() === "present" ? [now.getFullYear(), now.getMonth() + 1] : parseSingle(endRaw);
    return start && end ? [start, end] : null;
  }
  function totalExperienceMonths(experience, now) {
    now = now || new Date();
    var iv = [];
    (experience || []).forEach(function (e) {
      var p = parseRange(e.date || "", now);
      if (p) iv.push([p[0][0] * 12 + p[0][1] - 1, p[1][0] * 12 + p[1][1] - 1 + 1]);
    });
    if (!iv.length) return 0;
    iv.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var merged = [iv[0].slice()];
    for (var i = 1; i < iv.length; i++) {
      var last = merged[merged.length - 1];
      if (iv[i][0] <= last[1]) last[1] = Math.max(last[1], iv[i][1]); else merged.push(iv[i].slice());
    }
    return merged.reduce(function (s, m) { return s + m[1] - m[0]; }, 0);
  }
  // round(months / 12, 1) exactly as Python does it: tenths = months * 5 / 6, halves to even
  function yearsOneDecimal(months) {
    var n = months * 5, q = Math.floor(n / 6), r = n % 6;
    var tenths = r * 2 > 6 ? q + 1 : r * 2 < 6 ? q : (q % 2 === 0 ? q : q + 1);
    return tenths / 10;
  }

  var YEARS_RE = /(\d{1,2})\s*\+?\s*(?:-|to|–)?\s*(?:\d{1,2}\s*)?\+?\s*years?/gi;

  function yearsCheck(profile, jd, now) {
    var req = splitRequiredPreferred(jd || "")[0], asked = [], m;
    YEARS_RE.lastIndex = 0;
    while ((m = YEARS_RE.exec(req)) !== null) { var v = +m[1]; if (v > 0 && v <= 15) asked.push(v); }
    var required = asked.length ? Math.max.apply(null, asked) : null;
    var have = yearsOneDecimal(totalExperienceMonths(profile.experience, now));
    var points = required === null ? 100 : (have >= required ? 100 : pyRound(100 * have / required));
    return { required_years: required, profile_years: have, points: points };
  }

  function rulesFit(profile, jobTitle, jd, targetTitles, now) {
    var skills = skillOverlap(profile, jd);
    var role = roleCheck(profile, jobTitle, targetTitles);
    var years = yearsCheck(profile, jd, now);
    var rolePoints = { match: 100, unknown: 50, mismatch: 0 }[role.status];
    var skillScore = skills.score !== null ? skills.score : 0;
    var yearsPoints = skills.requirements_found ? years.points : 0;
    var raw = pyRound(0.6 * skillScore + 0.2 * rolePoints + 0.2 * yearsPoints);
    var score = raw, cap = null;
    if (role.status === "mismatch" && raw > ROLE_MISMATCH_CAP) { score = ROLE_MISMATCH_CAP; cap = mismatchReason(role); }
    return { score: score, uncapped_score: raw, cap_reason: cap, role: role, skills: skills, years: years,
             parts: { skills: skillScore, role: rolePoints, years: yearsPoints } };
  }

  // The site's projects.json in the shape fit_service reads (Career Pilot's profile JSON). Team projects are left
  // out, as they are in Career Pilot's own profile.
  function profileFromSite(site) {
    function text(b) { return String(typeof b === "string" ? b : (b.html || b.text || "")).replace(/<[^>]+>/g, "").replace(/&amp;/g, "&"); }
    var skills = {};
    (site.skills || []).forEach(function (g) { skills[g.category] = (g.items || []).slice(); });
    return {
      title: site.title || "",
      experience: (site.experience || []).map(function (e) {
        return { role: e.role, company: (e.company || "").split("|")[0].trim(), date: e.dates || "", bullets: (e.bullets || []).map(text) };
      }),
      projects: (site.projects || []).filter(function (p) { return !p.team; }).map(function (p) {
        return { name: p.name, bullets: [p.desc || ""].concat((p.bullets || []).map(text)), technologies: (p.tags || []).slice() };
      }),
      skills: skills,
      certifications: (site.certifications || []).map(function (c) { return c.name; })
    };
  }

  var api = { rulesFit: rulesFit, profileFromSite: profileFromSite, totalExperienceMonths: totalExperienceMonths,
              ROLE_MISMATCH_CAP: ROLE_MISMATCH_CAP, FAMILY_LABELS: FAMILY_LABELS };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.LabFit = api;
})(typeof self !== "undefined" ? self : this);
