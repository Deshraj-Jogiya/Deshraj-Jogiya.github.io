# 🧠 Deshraj Jogiya — Data & AI/ML Engineering Portfolio

Source code for the portfolio website: projects, certifications, a Lab of 21 in-browser demos, and a recruiter chatbot that answers from the same project data.

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

**The Lab** ([/lab/](https://deshraj-jogiya.github.io/lab/)) has 21 demos that run in the visitor's browser; 15 of them also take the visitor's own data, which never leaves the browser. Each ported model or statistic is checked against its project's Python code on every deploy (`tools/check_lab_*.js`, see `.github/workflows/deploy.yml`). The list is [`lab/demos.json`](lab/demos.json); the Lab index, the "Try it in the Lab" buttons on project cards and case studies, and both assistants read it.

| Demo | What it does |
|---|---|
| [SQL Analytics Playground](https://deshraj-jogiya.github.io/lab/#lab-sql) | Write SQL against tables from four projects and chart the result. |
| [ETL Pipeline Monitor](https://deshraj-jogiya.github.io/lab/#lab-etl) | Run a pipeline and watch latency, reliability and drift checks. |
| [A/B Test Significance](https://deshraj-jogiya.github.io/lab/#ab-testing-widget) | Simulate an experiment or test your own visitor and conversion counts with a z-test. |
| [Model Threshold Tuner](https://deshraj-jogiya.github.io/lab/#threshold-widget) | Move a model's decision threshold, or paste your own scores and costs, and find the best one. |
| [Pipeline Architecture Explorer](https://deshraj-jogiya.github.io/lab/#lab-arch) | Walk through real pipeline designs, step by step. |
| [Job Description Fit Scorer](https://deshraj-jogiya.github.io/lab/#lt-fit) | Paste a job posting and get the rule-based fit score Career Pilot uses. |
| [Data Contract Checker](https://deshraj-jogiya.github.io/lab/#lt-contract) | Paste CSV rows and run data-quality rules against them. |
| [SCD Type 2 Snapshots](https://deshraj-jogiya.github.io/lab/#lt-scd) | See how a dbt snapshot keeps history that a merge throws away. |
| [Drift & Fairness Monitor](https://deshraj-jogiya.github.io/lab/#lt-drift) | Shift a model's inputs, or paste your own two columns, and see which drift and fairness checks fail. |
| [Lakehouse Time Travel](https://deshraj-jogiya.github.io/lab/#lt-travel) | Query a table as it was at an earlier version. |
| [Event-Time Windows](https://deshraj-jogiya.github.io/lab/#lt-windows) | Set a watermark and lateness and watch late events land or drop. |
| [Airflow Backfill & Retry](https://deshraj-jogiya.github.io/lab/#lt-dag) | Replay a DAG's retries and backfills day by day. |
| [Shape Classifier](https://deshraj-jogiya.github.io/lab/#lm-shapes) | Draw or upload a shape; see each image-processing step, then the model's answer. |
| [ASL Word Signs](https://deshraj-jogiya.github.io/lab/#lm-signs) | Sign to your webcam or upload a clip; a GRU names the sign. |
| [Survival Curves by Dosage](https://deshraj-jogiya.github.io/lab/#st-trials) | Kaplan-Meier curves and a log-rank test, on trial data or your own. |
| [Benford's Law Audit](https://deshraj-jogiya.github.io/lab/#st-benford) | Test any column of amounts against Benford's first-digit law. |
| [Fraud Rule Tester](https://deshraj-jogiya.github.io/lab/#st-fraud) | Tune fraud rules on 345,524 transactions or your own CSV. |
| [LinkedIn Post Checker](https://deshraj-jogiya.github.io/lab/#st-posts) | Paste a draft and run CurioSync's writing rules on it. |
| [Member Q&A by Meaning](https://deshraj-jogiya.github.io/lab/#st-qa) | Ask questions answered by sentence embeddings, on members' messages or your own text. |
| [Customer Segments by RFM](https://deshraj-jogiya.github.io/lab/#st-rfm) | K-Means segments from recency, frequency and spend, on 2,000 customers or your CSV. |
| [Land-Use Emissions Forecast](https://deshraj-jogiya.github.io/lab/#st-em) | EPA land-use series forecast a year ahead; test your own yearly series. |

Also on the site:
- **Print-ready resume viewer:** a modal with a `@media print` layout that prints as a clean document.
- **AI recruiter assistant:** answers questions about experience, projects and skills, and checks a pasted job description against the profile. It runs on a Supabase Edge Function ([`supabase/functions/portfolio-chat`](supabase/functions/portfolio-chat)) that reads [`projects.json`](projects.json) and [`lab/demos.json`](lab/demos.json) on every request (Anthropic or Gemini via an `LLM_PROVIDER` secret). Answers are cached per question; the deploy workflow clears the cache when either file changes. If the LLM call fails, a browser-only assistant takes over: BM25 and bge-small search over [`assets/assistant_index.json`](assets/assistant_index.json), reranked by a small cross-encoder, with answer cards built from the same profile.
- **Guided tour** of the home page, and an anonymous visitor log (page views, scroll depth, sections seen, key clicks and which Lab demos were used).

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

Measured results behind the chat assistant's no-LLM fallback: [docs/FINDINGS.md](docs/FINDINGS.md).

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
