# 🧠 Deshraj Jogiya — Data & AI/ML Engineering Portfolio

Source code for the portfolio website: projects, certifications, interactive SQL and pipeline demos, and a recruiter chatbot that answers from the same project data.

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

## 🛠️ Showcase Projects (30)

The site shows 30 projects across data engineering, machine learning, analytics and software development. [projects.json](projects.json) is the source of truth (regenerated from the master profile); this table is built from it.

| Project | Area | Core stack |
|---|---|---|
| **[Job Search CRM & AI Application Tailoring Center](https://github.com/Deshraj-Jogiya/Job-Search-CRM-Automation)** | AI & Process Automation | Python, FastAPI, PostgreSQL, Supabase |
| **[Reactive Job Ingest Gateway](https://github.com/Deshraj-Jogiya/reactive-job-ingest-gateway)** | Reactive Systems | Java, Spring Boot, Spring WebFlux, Spring Reactive |
| **[Job Search dbt Warehouse](https://github.com/Deshraj-Jogiya/job-search-dbt-warehouse)** | Data Warehousing | Databricks, dbt, SQL, Dimensional Modeling |
| **[Job Market Lakehouse](https://github.com/Deshraj-Jogiya/job-market-lakehouse)** | Big Data & Orchestration | PySpark, Spark SQL, Scala, Great Expectations |
| **[Job Notes](https://github.com/Deshraj-Jogiya/job-notes-app)** | Full Stack | MongoDB, Express, Angular, Node.js |
| **[Interview Prep API](https://github.com/Deshraj-Jogiya/interview-prep-api)** | Full Stack | C#, .NET, ASP.NET Core, Entity Framework Core |
| **[Company Blocklist](https://github.com/Deshraj-Jogiya/company-blocklist)** | Full Stack | PHP, CodeIgniter 4, SQLite |
| **[Interview Prep Mobile](https://github.com/Deshraj-Jogiya/interview-prep-mobile)** | Full Stack | React Native, Expo, TypeScript, AsyncStorage |
| **[Company Search (HTMX)](https://github.com/Deshraj-Jogiya/htmx-company-search)** | Full Stack | HTMX, FastAPI, Jinja2 |
| **[ArcGIS Commute Insights](https://github.com/Deshraj-Jogiya/arcgis-commute-insights)** | Geospatial | ArcGIS, Geocoding, Vector Tiles, Geospatial Analysis |
| **[Sentence Transformers, Multi-Task Learning & LLM Fine-Tuning](https://github.com/Deshraj-Jogiya/sentence-transformers-llm-finetuning)** | NLP & Transfer Learning | TensorFlow, TensorFlow Hub, TensorFlow Text, NumPy |
| **[CurioSync](https://github.com/Deshraj-Jogiya/curiosync)** | Cloud & Generative AI | Python, FastAPI, GitHub Actions, Gemini LLM |
| **[AI Model Observability & Fairness Audits](https://github.com/Deshraj-Jogiya/AI-Model-Observability-Auditing)** | AI Governance | Python, MLflow, Drift Audit, KS-Test |
| **[FinTech Credit Risk & Fraud Command Center](https://github.com/Deshraj-Jogiya/FinRisk-Analytics-Pipeline)** | FinTech & Risk | FastAPI, Python, SQL, Scikit-Learn |
| **[Member Messages QA System](https://github.com/Deshraj-Jogiya/NLP-based-Q-A-system)** | NLP & Semantic Search | Python, Sentence-Transformers, spaCy, Scikit-Learn |
| **[TalentVenue EventIntel](https://github.com/Deshraj-Jogiya/TalentVenue_EventIntel)** | Cloud & Enterprise ML | Python, SQL, Snowflake, Azure ADLS |
| **[Multi-State Land Use Emissions Analysis](https://github.com/Deshraj-Jogiya/Multi-State-Land-Use-Emissions-Analysis)** | Geospatial & Climate | Python, SQLite, Random Forest, ETL Ingestion |
| **[Tax Anomaly Audit Compliance Engine](https://github.com/Deshraj-Jogiya/Tax-Anomaly-Audit-Pipeline)** | Finance & Auditing | Python, Benford's Law, Isolation Forest, Power BI |
| **[Automated Daily Data Insights](https://github.com/Deshraj-Jogiya/automated-data-insights)** | Automation & ETL | Python, yFinance API, Matplotlib, GitHub Actions |
| **[Sales Analytics & RFM Customer Segmentation Pipeline](https://github.com/Deshraj-Jogiya/Sales-Customer-Segmentation-Pipeline)** | Sales & Marketing | Python, SQLite, K-Means, PCA |
| **[Clinical Trials Patient Outcomes Analysis](https://github.com/Deshraj-Jogiya/Clinical-Trials-Outcomes-Analysis)** | Healthcare & Statistics | Python, SQL, Kaplan-Meier, Log-Rank |
| **[Real-Time IoT Telematics & Predictive Maintenance](https://github.com/Deshraj-Jogiya/IoT-Telematics-Predictive-Maintenance)** | Streaming & IoT | Python, Z-Score Anomaly, RUL Model, Power BI |
| **[AI-ML Data Science Simulation](https://github.com/Deshraj-Jogiya/AI-ML-Data-Science-Simulation)** | Operations & Demand | Python, SQL, Random Forest, Sales ETL |
| **[Extending STEM across ASL](https://github.com/Deshraj-Jogiya/Extending-STEM-across-ASL)** | Accessibility & Deep Learning | Python, PyTorch, MediaPipe, OpenCV, TensorFlow, Keras |
| **[Stay Aware of Branch](https://github.com/Deshraj-Jogiya/Stay-Aware-of-Branch)** | Mobile & Education | Java, Android, Firebase, Mobile |
| **[Chef at Gathering](https://github.com/Deshraj-Jogiya/Chef-at-Gathering)** | Web Development & Catering | React JS, JavaScript, HTML5, CSS3 |
| **[Get your Token](https://github.com/Deshraj-Jogiya/Get-Your-Token)** | FinTech & Blockchain | Node.js, Express, Angular, Cryptocurrency API |
| **City Forums** (private repository) | Web Development & Community | PHP, CodeIgniter 3, MySQL, Bootstrap |
| **[Make It Short](https://github.com/Deshraj-Jogiya/Make-it-Short)** | Web Services & Gamification | PHP, CodeIgniter 4, MySQL, HTML5 |
| **[Solid Object Detection & Identification](https://github.com/Deshraj-Jogiya/Solid-Object-Detection-and-Identification-using-Image-Processing)** | Computer Vision & Deep Learning | Python, PyTorch, OpenCV, CNN Model |

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
