// The portfolio assistant's answer path when no LLM responds. Nothing is generated: every answer is a fact from the
// profile, quoted with its source, or a polite decline. Chosen by measurement (keyword + bge-small embeddings fused,
// top 10 reranked by a cross-encoder, explicit decline categories): 94% right first answer and 90% overall on
// held-out questions. Answers come from keyword search at once and switch to the full models (57 MB, downloaded
// the first time the chat opens, cached after) as soon as they are ready.
// jsdelivr's +esm build rewrites the package's bare imports (onnxruntime-web) so a browser can resolve them
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0/+esm";

let index = null, docVecs = null, bm25 = null, models = null, modelsLoading = null, modelsFailed = false;

const tokenize = s => (s.toLowerCase().match(/[a-z0-9#+.]+/g) || []);

// Okapi BM25 with the same constants and negative-idf floor as the rank_bm25 library the evaluation used
function buildBm25(texts, k1 = 1.5, b = 0.75, epsilon = 0.25) {
    const docs = texts.map(tokenize), N = docs.length;
    const avgdl = docs.reduce((a, d) => a + d.length, 0) / N;
    const df = new Map();
    docs.forEach(d => new Set(d).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
    const idf = new Map(); let sum = 0;
    df.forEach((n, t) => { const v = Math.log((N - n + 0.5) / (n + 0.5)); idf.set(t, v); sum += v; });
    const floor = epsilon * sum / idf.size;
    idf.forEach((v, t) => { if (v < 0) idf.set(t, floor); });
    const tf = docs.map(d => { const m = new Map(); d.forEach(t => m.set(t, (m.get(t) || 0) + 1)); return m; });
    return q => docs.map((d, i) => tokenize(q).reduce((s, t) => {
        const f = tf[i].get(t) || 0;
        return f ? s + (idf.get(t) || 0) * f * (k1 + 1) / (f + k1 * (1 - b + b * d.length / avgdl)) : s;
    }, 0));
}

async function loadIndex() {
    if (index) return index;
    index = await (await fetch("/assets/assistant_index.json")).json();
    const raw = atob(index.embeddings), bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    docVecs = new Float32Array(bytes.buffer);
    bm25 = buildBm25(index.docs.map(d => d.text));
    return index;
}

function loadModels() {
    if (modelsLoading || modelsFailed) return modelsLoading;
    modelsLoading = (async () => {
        const tf = await import(TRANSFORMERS);
        const embed = await tf.pipeline("feature-extraction", index.embed_model, { dtype: "q8" });
        const tokenizer = await tf.AutoTokenizer.from_pretrained(index.rerank_model);
        const reranker = await tf.AutoModelForSequenceClassification.from_pretrained(index.rerank_model, { dtype: "q8" });
        models = { embed, tokenizer, reranker };
        return models;
    })().catch(e => { console.warn("Assistant models unavailable, keyword answers only:", e); modelsFailed = true; return null; });
    return modelsLoading;
}

// Best score per item (a card is searched through its answer and each of its phrasings)
function byItem(scores) {
    const best = new Map();
    scores.forEach((s, i) => { const id = index.docs[i].item; if (!best.has(id) || s > best.get(id)) best.set(id, s); });
    return [...best.entries()].sort((a, b) => b[1] - a[1]);
}

const rrf = (lists, k = 60) => {
    const s = new Map();
    lists.forEach(l => l.forEach(([id], r) => s.set(id, (s.get(id) || 0) + 1 / (k + r + 1))));
    return [...s.entries()].sort((a, b) => b[1] - a[1]);
};

const itemById = id => index.items.find(x => x.id === id);

// The fact with its source, unless the text already names it (experience bullets carry their role for search)
const withSource = it => {
    const text = it.display || it.text;
    const named = it.source && text.includes(it.source.replace(/^Project: /, "").split(", ").pop());
    return it.kind === "passage" && it.source && !named ? `${text} (${it.source})` : text;
};

async function rank(question) {
    await loadIndex();
    const keyword = byItem(bm25(question));
    if (!models) {
        // Keyword-only while the models load: an answer needs at least one matching word
        return { ranked: keyword, confident: keyword[0][1] > 0, mode: "keyword" };
    }
    const q = (await models.embed(index.query_prefix + question, { pooling: "cls", normalize: true })).data;
    const d = index.dims, dense = [];
    for (let i = 0; i < index.docs.length; i++) {
        let s = 0; for (let j = 0; j < d; j++) s += docVecs[i * d + j] * q[j];
        dense.push(s);
    }
    const fused = rrf([byItem(dense), keyword]).slice(0, index.rerank_depth);
    const texts = fused.map(([id]) => { const it = itemById(id); return it.rerank_text || it.text; });
    const inputs = models.tokenizer(new Array(texts.length).fill(question),
        { text_pair: texts, padding: true, truncation: true, max_length: index.rerank_max_tokens });
    const logits = (await models.reranker(inputs)).logits.data;
    const ranked = fused.map(([id], i) => [id, logits[i]]).sort((a, b) => b[1] - a[1]);
    return { ranked, confident: ranked[0][1] >= index.decline_threshold, mode: "full" };
}

const NOT_FOUND = "That isn't covered on this site. The contact form at the bottom of the page reaches Deshraj directly.";

// One answer: the best fact with its source, a decline, or "not covered"
export async function answer(question) {
    loadModels();  // start the download in the background on first use
    const { ranked, confident, mode } = await rank(question);
    const top = itemById(ranked[0][0]);
    if (top.kind === "decline") return { text: top.text + " The contact form at the bottom of the page reaches him directly.", mode };
    if (!confident) return { text: NOT_FOUND, mode };
    const lines = [withSource(top)];
    // A second fact from a different source when it is nearly as relevant
    const next = ranked.slice(1, 3).map(([id, s]) => [itemById(id), s])
        .find(([it, s]) => it.kind === "passage" && it.source !== top.source && (mode === "full" ? s >= ranked[0][1] - 2 : s > 0));
    if (next) lines.push(withSource(next[0]));
    return { text: lines.join("\n\n"), mode };
}

// ---- fit check without an LLM: the CRM's skill rules, resolved against the profile at build time ----
const PREFERRED = /(nice[- ]to[- ]have|preferred|bonus|pluses|a plus|good to have|desired|optional)/i;
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function firstPos(spec, line) {
    if (spec.case_sensitive) {
        const m = new RegExp("(?<![A-Za-z0-9])" + escapeRe(spec.term) + "(?![A-Za-z0-9])").exec(line);
        return m ? [m.index, m.index + m[0].length] : null;
    }
    const low = line.toLowerCase(); let best = null;
    for (const p of spec.patterns) {
        const m = new RegExp("(?<![a-z0-9])" + escapeRe(p) + "(?![a-z0-9])").exec(low);
        if (m && (!best || m.index < best[0])) best = [m.index, m.index + m[0].length];
    }
    return best;
}

const OR_JOIN = /^[\s,/]*(?:,?\s*(?:or|and\/or)\s*)?[\s,/]*$/i;
const LIST_JOIN = /^[\s,/]*(?:,?\s*(?:or|and\/or|and)\s*)?[\s,/]*$/i;
const LIST_INTRO = /(one of|any of|such as|e\.g\.|for example|like|similar to|equivalent)\s*[:(]?\s*$/i;

export async function fitCheck(jobDescription) {
    await loadIndex();
    const specs = Object.entries(index.skills).map(([term, v]) => ({ term, ...v }));
    const lines = jobDescription.split(/\r?\n/);
    const cut = lines.findIndex(l => l.length < 80 && PREFERRED.test(l));
    const units = [], seen = new Set();
    lines.forEach((line, li) => {
        const preferred = cut >= 0 && li >= cut;
        const found = specs.map(s => [firstPos(s, line), s]).filter(([p]) => p).sort((a, b) => a[0][0] - b[0][0]);
        // Drop a term inside a longer one found on the same line ("SQL" inside "SQL Server")
        const kept = found.filter(([p, s]) => !found.some(([q, o]) => o !== s && q[0] <= p[0] && q[1] >= p[1] && q[1] - q[0] > p[1] - p[0]));
        let chain = [], hasOr = false, intro = false;
        const close = () => {
            const fresh = chain.filter(([, s]) => !seen.has(s.term));
            if (fresh.length > 1 && (hasOr || intro)) units.push({ terms: fresh.map(([, s]) => s), preferred });
            else fresh.forEach(([, s]) => units.push({ terms: [s], preferred }));
            fresh.forEach(([, s]) => seen.add(s.term));
        };
        kept.forEach(([p, s], i) => {
            if (i === 0) { chain = [[p, s]]; intro = LIST_INTRO.test(line.slice(0, p[0])); return; }
            const between = line.slice(chain[chain.length - 1][0][1], p[0]);
            if ((intro ? LIST_JOIN : OR_JOIN).test(between)) { chain.push([p, s]); hasOr = hasOr || /\bor\b/i.test(between); }
            else { close(); chain = [[p, s]]; hasOr = false; intro = LIST_INTRO.test(between); }
        });
        if (chain.length) close();
    });
    const result = { matched: [], comparable: [], missing: [] };
    units.forEach(u => {
        const hit = u.terms.find(s => s.evidence), via = u.terms.find(s => s.via);
        const label = u.terms.map(s => s.term).join(" or ") + (u.preferred ? " (preferred)" : "");
        if (hit) result.matched.push(`${hit.term}${u.preferred ? " (preferred)" : ""}: ${hit.evidence}`);
        else if (via) result.comparable.push(`${label}: comparable tool ${via.via} (${via.via_evidence})`);
        else result.missing.push(label);
    });
    return result;
}

export function formatFit(r) {
    const total = r.matched.length + r.comparable.length + r.missing.length;
    if (!total) return "No technical requirements this check recognises were found in that posting. The live assistant (or the contact form) can help with the rest.";
    const parts = [`Checked by keyword rules, without AI: ${r.matched.length} of ${total} technical requirements are shown in his work.`];
    if (r.matched.length) parts.push("Matches:\n" + r.matched.map(x => "• " + x).join("\n"));
    if (r.comparable.length) parts.push("Through a comparable tool:\n" + r.comparable.map(x => "• " + x).join("\n"));
    if (r.missing.length) parts.push("Not shown on this site:\n" + r.missing.map(x => "• " + x).join("\n"));
    return parts.join("\n\n");
}

export const warmUp = () => loadIndex().then(loadModels);
window.localAssistant = { answer, fitCheck, formatFit, warmUp };
