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
* [supabase/functions/](supabase/functions/) — Serverless backend: `portfolio-chat` (the AI recruiter assistant), `submit-contact` (contact form → email notification via GitHub Actions dispatch), and `clear-chatbot-cache` (invoked by the deploy workflow, not by visitors). Deployed independently of the site itself with the Supabase CLI (`supabase functions deploy <name>`) -- pushing to `main` does not redeploy these.

---

## 🌟 Interactive Showcase Features

To demonstrate data engineering, database modeling, and frontend integration skills directly to recruiters, the site includes six interactive components:
1. **In-Browser SQL Playground:** Select analytical queries from a dropdown (e.g., segment revenue shares, Benford's Law audit outliers, clinical survival deltas), inspect highlighted SQL syntax, and click "Execute Query" to see SQLite-simulated database outputs in a clean grid.
2. **Live ETL Observability Console & Traffic Monitor:** A telemetry widget simulating daily retail sales ETL. Displays scrolling log console checkpoints, calculates feature data drift (Kolmogorov-Smirnov test), tracks vibration/temperature Z-score thresholds, and visualizes live visitor geolocation analytics.
3. **A/B Hypothesis Testing Simulator:** Drag conversion rate sliders and simulate live hypothesis testing. Runs a two-tailed Z-test on proportions, outputs Uplift, Z-Score, and P-value, and evaluates statistical significance ($p < 0.05$).
4. **Model Decision Threshold Optimizer:** Adjust decision thresholds to optimize user conversion and model performance. Simulates confusion matrices, Precision/Recall, and models Net ROI impact to identify the most profitable classification boundary.
5. **Print-Ready HTML Resume Viewer:** A modal rendering a complete structured resume. Equipped with CSS `@media print` layout overrides to print perfectly as a clean document (without dark background, navigation elements, or modal buttons).
6. **AI Recruiter Assistant:** A conversational chatbot (hero CTA + launcher) answering questions about Deshraj's experience, projects, and skills, with real conversation memory for natural follow-ups. Backed by a Supabase Edge Function ([`supabase/functions/portfolio-chat`](supabase/functions/portfolio-chat)) that reads live from [`projects.json`](projects.json) on every request -- it can't answer with stale data because it's never given the chance to. Supports Anthropic or Gemini as the LLM provider via a `LLM_PROVIDER` secret. Answers are cached in Supabase per question to avoid repeat LLM calls; the cache is automatically cleared by the deploy workflow whenever `projects.json` changes ([`supabase/functions/clear-chatbot-cache`](supabase/functions/clear-chatbot-cache)), so a cached answer can't outlive the data it was generated from.

---

## 🛠️ Dynamic Showcase Repositories (21 Projects)

This portfolio website dynamically displays 21 repositories spanning generative AI/agentic systems, data engineering, machine learning, and full-stack development. The full, current list — including every tag and description shown on the live site — lives in [projects.json](projects.json); the table below is a summary, not the source of truth, so it won't go stale the same way a hand-maintained list would.

| Repository / Project | Focus Area | Core Tech Stack |
|---|---|---|
| **[Job Search CRM & AI Application Tailoring Center](https://github.com/Deshraj-Jogiya/Job-Search-CRM-Automation)** | AI-powered job application command center & resume tailoring | FastAPI, Python, SQLite, OpenAI API |
| **[CurioSync](https://github.com/Deshraj-Jogiya/curiosync)** | Serverless tech news curation & LinkedIn publisher | FastAPI, Python, Gemini LLM, GitHub Actions |
| **[TalentVenue EventIntel](https://github.com/Deshraj-Jogiya/TalentVenue_EventIntel)** | Enterprise data platform & contract-risk prediction | Python, Snowflake, Azure ADLS, Streamlit |
| **[Member Messages QA System](https://github.com/Deshraj-Jogiya/NLP-based-Q-A-system)** | Semantic-search QA API with NER-based subject detection | Python, Sentence-Transformers, spaCy |
| **[ML Apprentice Take-Home Exercise](https://github.com/Deshraj-Jogiya/ML-Apprentice-Take-Home-Exercise)** | Sentence Transformer & multi-task learning architecture | TensorFlow, TensorFlow Hub, BERT |
| **[AI Model Observability & Fairness Audits](https://github.com/Deshraj-Jogiya/AI-Model-Observability-Auditing)** | Production drift tracking (KS-test) and bias evaluation | Python, SciPy, Tableau |
| **[FinTech Credit Risk Pipeline](https://github.com/Deshraj-Jogiya/FinRisk-Analytics-Pipeline)** | Credit risk & real-time fraud command center | FastAPI, SQLite, Scikit-learn, XGBoost |
| **[Multi-State Land Use Emissions Analysis](https://github.com/Deshraj-Jogiya/Multi-State-Land-Use-Emissions-Analysis)** | Geospatial emissions tracking and CO₂ trend forecasting | SQLite, Random Forest, ArcGIS |
| **[Tax Anomaly Audit Compliance Engine](https://github.com/Deshraj-Jogiya/Tax-Anomaly-Audit-Pipeline)** | Transaction auditing modeling following Benford's Law | SQLite, Isolation Forest, Power BI |
| **[Automated Daily Data Insights](https://github.com/Deshraj-Jogiya/automated-data-insights)** | Stateless daily financial ingestion & anomaly alerts | Python, yFinance, GitHub Actions |
| **[Sales Customer Segmentation](https://github.com/Deshraj-Jogiya/Sales-Customer-Segmentation-Pipeline)** | Star schema warehouse modeling & RFM K-Means clustering | SQLite, Scikit-learn, Power BI |
| **[Clinical Trials Outcomes Analysis](https://github.com/Deshraj-Jogiya/Clinical-Trials-Outcomes-Analysis)** | Medical trial outcomes tracking & statistical survival testing | lifelines, SciPy, Tableau |
| **[Real-Time IoT Telematics](https://github.com/Deshraj-Jogiya/IoT-Telematics-Predictive-Maintenance)** | High-frequency telematics streaming & RUL estimation | Python, Z-score outliers, Power BI |
| **[AI-ML Data Science Simulation](https://github.com/Deshraj-Jogiya/AI-ML-Data-Science-Simulation)** | Cross-branch retail sales ETL ingestion and demand planning | Python, Pandas, Scikit-learn, Tableau |
| **[Extending STEM across ASL](https://github.com/Deshraj-Jogiya/Extending-STEM-across-ASL)** | Inclusive educational tool utilizing hand-gesture CNN models | TensorFlow, Keras, Flask |
| **[Stay Aware of Branch](https://github.com/Deshraj-Jogiya/Stay-Aware-of-Branch)** | Parent-school engagement mobile app | React Native, Android |
| **[Chef at Gathering](https://github.com/Deshraj-Jogiya/Chef-at-Gathering)** | Event coordination & catering booking platform | React, JavaScript |
| **[City Forums](https://github.com/Deshraj-Jogiya/City-Forums)** | Community engagement & marketplace platform | PHP, CodeIgniter 3, MySQL |
| **[Make It Short](https://github.com/Deshraj-Jogiya/Make-it-Short)** | Gamified link-shortening web engine | PHP, CodeIgniter 4, MySQL |
| **[Get your Token](https://github.com/Deshraj-Jogiya/Get-Your-Token)** | Web3 crypto marketplace frontend & dashboard | Node.js, Express, Angular |
| **[Solid Object Detection & Identification](https://github.com/Deshraj-Jogiya/Solid-Object-Detection-and-Identification-using-Image-Processing)** | Shape detection combining a custom CNN with contour geometry | PyTorch, OpenCV |

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
