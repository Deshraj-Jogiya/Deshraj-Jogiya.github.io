// Whole-site visual audit, run from any page of the local preview (javascript console or a test driver):
//   await (await import("/tools/audit_site.js?" + Date.now())).run()   // or .run(["/lab/"], [375]) for a subset
// Loads every page in a same-origin iframe at 375 / 768 / 1280 / 1920 px in both themes, runs every Lab demo once,
// then reports contrast failures (tools/audit_contrast.js), sideways overflow and script errors per page, width and theme.
const PAGES = ["/", "/projects/career-pilot/", "/projects/job-market-lakehouse/", "/projects/dbt-warehouse/", "/projects/finrisk/", "/lab/"];
const WIDTHS = [375, 768, 1280, 1920];
const LAB_BUTTONS = ["lm-random", "lm-run", "fit-run", "gx-run", "scd-add", "scd-run", "dr-new", "tt-append", "tt-update", "ew-play",
  "dag-run", "run-sql-btn", "run-obs-btn", "run-ab-btn"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function load(path, width, theme) {
  localStorage.setItem("theme", theme);
  const f = document.createElement("iframe");
  f.style.cssText = `position:fixed;left:0;top:0;width:${width}px;height:900px;opacity:0.01;pointer-events:none;z-index:-1;border:0`;
  const errors = [];
  document.body.appendChild(f);
  await new Promise((res) => { f.onload = res; f.src = path; });
  const w = f.contentWindow;
  w.addEventListener("error", (e) => errors.push(String(e.message)));
  w.addEventListener("unhandledrejection", (e) => errors.push("rejection: " + String(e.reason && e.reason.message || e.reason)));
  await sleep(1500);
  return { f, w, errors };
}

async function runLab(w) {
  const d = w.document;
  for (const id of LAB_BUTTONS) { const b = d.getElementById(id); if (b) b.click(); await sleep(400); }
  for (const [name, value, button] of [["em-mode", "own", "em-run"], ["rf-mode", "own", "rf-sample"], ["tr-mode", "own", null]]) {
    const r = d.querySelector(`input[name="${name}"][value="${value}"]`);
    if (r) r.click();
    await sleep(300);
    if (button) { const b = d.getElementById(button); if (b) b.click(); }
  }
  await sleep(5000);
}

export async function run(pages = PAGES, widths = WIDTHS) {
  const src = await fetch("/tools/audit_contrast.js?" + Date.now()).then((r) => r.text());
  const keepTheme = localStorage.getItem("theme");
  const report = [];
  for (const path of pages) for (const theme of ["dark", "light"]) for (const width of widths) {
    const { f, w, errors } = await load(path, width, theme);
    if (path === "/lab/") await runLab(w);
    const res = w.eval(src);
    report.push({ path, theme, width, overflow: res.overflow, errors, low: res.low });
    f.remove();
  }
  if (keepTheme === null) localStorage.removeItem("theme"); else localStorage.setItem("theme", keepTheme);
  return report;
}
