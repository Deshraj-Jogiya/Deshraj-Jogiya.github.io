# 🧠 Deshraj Jogiya — Data & AI/ML Engineering Portfolio

Welcome to my central portfolio repository! This project hosts my live, interactive portfolio website, demonstrating my expertise in building resilient data pipelines, scalable machine learning architectures, and production-grade automation systems.

👉 **Live Site:** **[https://deshraj-jogiya.github.io/](https://deshraj-jogiya.github.io/)**

---

## ⚡ Portfolio Architecture

Unlike static HTML sites, this portfolio is built using a **Python-based Static Site Generator** architecture. It separates data from representation and automates compilation via CI/CD.

```
                  ┌──────────────────────────────┐
                  │   projects.json (Data Store) │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
    ┌──────────────────┐   ┌───────────┐
    │  Jinja2 Template ├──►│  Python   │
    │  (templates/)    │   │  Compiler │
    └──────────────────┘   │  (build)  │
                           └─────┬─────┘
                                 │ (Compiles to static index.html)
                                 ▼
                  ┌──────────────────────────────┐
                  │    index.html (Production)   │
                  └──────────────┬───────────────┘
                                 │
                         (GitHub Push Event)
                                 ▼
                  ┌──────────────────────────────┐
                  │    GitHub Actions Workflow   │
                  │    (Auto-compiles & deploys) │
                  └──────────────────────────────┘
```

### 📂 Repository Structure
* [projects.json](projects.json) — Central database storing stats counters, projects metadata, tags, and technical skills.
* [templates/index.html](templates/index.html) — Parameterized HTML template containing dynamic Jinja2 loops.
* [build_site.py](build_site.py) — Compiler script that loads the JSON data, renders the template, and outputs `index.html`.
* [.github/workflows/deploy.yml](.github/workflows/deploy.yml) — GitHub Actions pipeline running Python compilation and publishing the static directory to GitHub Pages.
* [style.css](style.css) — Cyber-dark glassmorphism design system styles, including dark/light variable sets and media overrides.
* [app.js](app.js) — Interactive scripts (terminal animation, filter tabs, SQL Playground simulation, Observability Monitor logs, and GitHub timeline API fetches).

---

## 🌟 Interactive Showcase Features

To demonstrate data engineering, database modeling, and frontend integration skills directly to recruiters, the site includes three interactive components:
1. **In-Browser SQL Playground:** Select analytical queries from a dropdown (e.g., segment revenue shares, Benford's Law audit outliers, clinical survival deltas), inspect highlighted SQL syntax, and click "Execute Query" to see SQLite-simulated database outputs in a clean grid.
2. **Live ETL Observability Console:** A telemetry widget simulating daily retail sales ETL. Displays scrolling log console checkpoints, calculates feature data drift (Kolmogorov-Smirnov test), tracks vibration/temperature Z-score thresholds, and reports metrics.
3. **Print-Ready HTML Resume Viewer:** A modal rendering a complete structured resume. Equipped with CSS `@media print` layout overrides to print perfectly as a clean document (without dark background, navigation elements, or modal buttons).

---

## 🛠️ Dynamic Showcase Repositories (10 Production Pipelines)

This portfolio website dynamically displays 10 modular repositories spanning data engineering, machine learning, and advanced analytics.

| Repository / Project | Focus Area | Core Tech Stack |
|---|---|---|
| **[FinTech Credit Risk Pipeline](https://github.com/Deshraj-Jogiya/FinRisk-Analytics-Pipeline)** | Credit risk & real-time fraud command center | FastAPI, SQLite, Scikit-learn |
| **[Automated Daily Data Insights](https://github.com/Deshraj-Jogiya/automated-data-insights)** | Stateless daily financial ingestion & anomaly alerts | Python, yFinance, GitHub Actions |
| **[Sales Customer Segmentation](https://github.com/Deshraj-Jogiya/Sales-Customer-Segmentation-Pipeline)** | Star schema warehouse modeling & RFM K-Means clustering | SQLite, Scikit-learn, Power BI |
| **[Clinical Trials Outcomes Analysis](https://github.com/Deshraj-Jogiya/Clinical-Trials-Outcomes-Analysis)** | Medical trial outcomes tracking & statistical survival testing | lifelines, SciPy, Tableau |
| **[Tax Anomaly Audit Compliance Engine](https://github.com/Deshraj-Jogiya/Tax-Anomaly-Audit-Pipeline)** | Transaction auditing modeling following Benford's Law | SQLite, Isolation Forest, Power BI |
| **[AI Model Observability & Fairness Audits](https://github.com/Deshraj-Jogiya/AI-Model-Observability-Auditing)** | Product drift tracking (KS-test) and bias evaluations | SQL, NumPy, SciPy, Tableau |
| **[Real-Time IoT Telematics](https://github.com/Deshraj-Jogiya/IoT-Telematics-Predictive-Maintenance)** | High-frequency telematics streaming & RUL estimation | Python, Z-score outliers, Power BI |
| **[Multi-State Land Use Emissions Analysis](https://github.com/Deshraj-Jogiya/Multi-State-Land-Use-Emissions-Analysis)** | Geospatial emissions tracking and CO₂ trend forecasting | SQLite, Random Forest, ArcGIS |
| **[AI-ML Data Science Simulation](https://github.com/Deshraj-Jogiya/AI-ML-Data-Science-Simulation)** | Cross-branch retail sales ETL ingestion and demand planning | Python, Pandas, Scikit-learn, Tableau |
| **[Extending STEM across ASL](https://github.com/Deshraj-Jogiya/Extending-STEM-across-ASL)** | Inclusive educational tool utilizing hand-gesture CNN models | TensorFlow, Keras, Flask |

---

## 🚀 Local Execution & Development

You can edit project descriptions, add new skills, or update stats by modifying `projects.json` and recompiling the site locally.

### 1. Install Dependencies
Ensure you have Jinja2 installed:
```bash
pip install Jinja2
```

### 2. Compile Site
Run the python compiler to regenerate `index.html`:
```bash
python build_site.py
```

### 3. Deploy
Stage, commit, and push changes to GitHub. The Actions deployment workflow will automatically compile the site in a clean runner and deploy it to GitHub Pages in under a minute:
```bash
git add .
git commit -m "update: modify projects showcase"
git push origin main
```
