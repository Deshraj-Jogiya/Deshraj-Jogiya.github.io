// Paste-able page audit (run in the browser console or through a test driver): every visible text node, HTML or SVG, gets its
// colour composited over the stacked backgrounds behind it, and anything under 4.5:1 (3:1 for large or bold text) is listed.
// Returns { theme, width, overflow, low: [{where, text, ratio, fg, bg}] }.
(() => {
  const parse = (c) => { const m = String(c).match(/[\d.]+/g); return m ? m.map(Number) : null; };
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  const over = (top, base) => { const a = top.length > 3 ? top[3] : 1; return base.map((v, i) => top[i] * a + v * (1 - a)); };
  const ground = (el) => {
    const stack = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const bg = parse(cs.backgroundColor);
      if (bg && (bg.length < 4 || bg[3] > 0)) stack.push(bg);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && /gradient/.test(cs.backgroundImage)) {
        const first = parse(cs.backgroundImage.match(/rgba?\([^)]+\)/)?.[0]);
        if (first) stack.push(first);
      }
      if (bg && (bg.length < 4 || bg[3] === 1)) break;
    }
    let base = parse(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255];
    if (base.length > 3 && base[3] === 0) base = parse(getComputedStyle(document.body).backgroundColor) || [255, 255, 255];
    base = base.slice(0, 3);
    for (const c of stack.reverse()) base = over(c, base);
    return base;
  };
  const visible = (el) => {
    if (el.closest("[hidden], details:not([open]) > :not(summary)")) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity < 0.2) return false;
    }
    return true;
  };
  const low = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const text = n.textContent.trim();
    if (!text || text.length < 1) continue;
    const el = n.parentElement;
    if (!el || seen.has(el) || /^(SCRIPT|STYLE|NOSCRIPT|OPTION|TITLE)$/.test(el.tagName)) continue;
    seen.add(el);
    if (el.closest("#tour-overlay-card, #tour-backdrop") && getComputedStyle(document.getElementById("tour-overlay-card") || el).display === "none") continue;
    if (!visible(el)) continue;
    const cs = getComputedStyle(el);
    const isSvg = el instanceof SVGElement;
    let fg = parse(isSvg && cs.fill && cs.fill.startsWith("rgb") ? cs.fill : cs.color);
    if (!fg) continue;
    const bg = ground(isSvg ? el.ownerSVGElement || el : el);
    const op = +cs.opacity;
    let f = over(fg, bg);
    if (op < 1) f = f.map((v, i) => v * op + bg[i] * (1 - op));
    const ratio = (Math.max(lum(f), lum(bg)) + 0.05) / (Math.min(lum(f), lum(bg)) + 0.05);
    const size = parseFloat(cs.fontSize);
    const large = size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700);
    if (ratio < (large ? 3 : 4.5)) {
      const host = el.closest("[id]");
      low.push({ where: host ? host.id : el.tagName, cls: (el.getAttribute("class") || "").slice(0, 40), text: text.slice(0, 40),
                 ratio: +ratio.toFixed(2), fg: f.map(Math.round).join(","), bg: bg.map(Math.round).join(",") });
    }
  }
  return { theme: document.body.classList.contains("light-theme") ? "light" : "dark", width: innerWidth,
           overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, low };
})();
