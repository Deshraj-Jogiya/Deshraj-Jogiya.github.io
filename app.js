/* ==========================================================================
   JavaScript Functionality for Deshraj Jogiya's Portfolio Website
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Mobile Hamburger Menu Navigation Toggle
    const mobileMenuBtn = document.getElementById("mobile-menu-btn");
    const navLinks = document.querySelector(".nav-links");
    if (mobileMenuBtn && navLinks) {
        mobileMenuBtn.addEventListener("click", () => {
            mobileMenuBtn.classList.toggle("active");
            navLinks.classList.toggle("mobile-active");
        });
        
        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                mobileMenuBtn.classList.remove("active");
                navLinks.classList.remove("mobile-active");
            });
        });
    }

    // Live Visitor Analytics (Supabase REST API Integration)
    const SUPABASE_URL = "https://mtvcrttbdjwcixzhlkvo.supabase.co";
    const SUPABASE_KEY = "sb_publishable_ZuB30vNfc-7b7Pr6ebZNqQ_sXjox-wu";

    function getFlagEmoji(countryCode) {
        if (!countryCode) return "📍";
        const codePoints = countryCode
            .toUpperCase()
            .split("")
            .map(char => 127397 + char.charCodeAt(0));
        return String.fromCodePoint(...codePoints);
    }

    async function logVisit() {
        let visitorId = localStorage.getItem("portfolio_visitor_id");
        let isNew = false;
        if (!visitorId) {
            visitorId = "vis_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            localStorage.setItem("portfolio_visitor_id", visitorId);
            isNew = true;
        }

        const width = window.innerWidth;
        const device = width < 768 ? "Mobile" : width < 1024 ? "Tablet" : "Desktop";
        const ua = navigator.userAgent;
        let os = "Unknown OS";
        if (ua.indexOf("Win") != -1) os = "Windows";
        else if (ua.indexOf("Mac") != -1) os = "macOS";
        else if (ua.indexOf("Linux") != -1) os = "Linux";
        else if (ua.indexOf("Android") != -1) os = "Android";
        else if (ua.indexOf("like Mac") != -1) os = "iOS";

        let browser = "Other";
        if (ua.indexOf("Chrome") != -1) browser = "Chrome";
        else if (ua.indexOf("Safari") != -1) browser = "Safari";
        else if (ua.indexOf("Firefox") != -1) browser = "Firefox";
        else if (ua.indexOf("Edge") != -1) browser = "Edge";

        let geodata = { city: "Unknown", country_name: "Unknown", country_code: "" };
        try {
            const res = await fetch("https://ipapi.co/json/");
            if (res.ok) {
                geodata = await res.json();
            }
        } catch (e) {
            console.error("Geoloc fetch failed:", e);
        }

        const visitData = {
            visitor_id: visitorId,
            is_new: isNew,
            city: geodata.city || "Unknown",
            country: geodata.country_name || "Unknown",
            country_code: geodata.country_code || "",
            device: device,
            os: os,
            browser: browser,
            referrer: document.referrer || "Direct",
            page_path: window.location.pathname
        };

        try {
            await fetch(`${SUPABASE_URL}/rest/v1/portfolio_visits`, {
                method: "POST",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(visitData)
            });
        } catch (e) {
            console.error("Supabase log failed:", e);
        }

        const cityEl = document.getElementById("visitor-city");
        const flagEl = document.getElementById("visitor-flag");
        if (cityEl) cityEl.textContent = geodata.city ? `${geodata.city}, ${geodata.country_code}` : "Online visitor";
        if (flagEl && geodata.country_code) flagEl.textContent = getFlagEmoji(geodata.country_code);
    }

    async function updateVisitorStatsUI() {
        try {
            const res = await fetch("assets/visitor_stats.json");
            if (res.ok) {
                const stats = await res.json();
                const countEl = document.getElementById("visitor-count");
                const todayEl = document.getElementById("visitor-today");
                const forecastEl = document.getElementById("visitor-forecast-val");
                const progressFillEl = document.getElementById("visitor-progress-fill");

                if (countEl) countEl.textContent = stats.total_visits || "...";
                if (todayEl) todayEl.textContent = stats.active_today || "...";
                if (forecastEl) forecastEl.textContent = stats.forecasted_next_week || "...";

                if (progressFillEl && stats.total_visits && stats.forecasted_next_week) {
                    const ratio = Math.min(100, Math.round((stats.total_visits / stats.forecasted_next_week) * 100));
                    progressFillEl.style.width = `${ratio}%`;
                }
            }
        } catch (e) {
            console.error("Failed to load visitor stats:", e);
        }
    }

    logVisit();
    updateVisitorStatsUI();

    // 1. Typing Terminal Animation
    const words = [
        "Data Pipeline Engineer.",
        "Machine Learning Specialist.",
        "Business Intelligence Analyst.",
        "ETL Automation Architect."
    ];
    let i = 0;
    let timer;

    function typingEffect() {
        let word = words[i].split("");
        var loopTyping = function() {
            if (word.length > 0) {
                document.getElementById('typing-text').innerHTML += word.shift();
            } else {
                setTimeout(deletingEffect, 2000);
                return false;
            }
            timer = setTimeout(loopTyping, 80);
        };
        loopTyping();
    }

    function deletingEffect() {
        let word = words[i].split("");
        var loopDeleting = function() {
            if (word.length > 0) {
                word.pop();
                document.getElementById('typing-text').innerHTML = word.join("");
            } else {
                if (words.length > (i + 1)) {
                    i++;
                } else {
                    i = 0;
                }
                setTimeout(typingEffect, 500);
                return false;
            }
            timer = setTimeout(loopDeleting, 40);
        };
        loopDeleting();
    }

    typingEffect();

    // 2. Stats Counter Animation
    const counters = document.querySelectorAll(".stat-number");
    const speed = 100; // The lower the slower

    const startCounters = () => {
        counters.forEach(counter => {
            const updateCount = () => {
                const target = +counter.getAttribute("data-target");
                const count = +counter.innerText.replace("+", "").replace(".", "");
                
                // Set increment step
                let inc = target / speed;
                if (target === 4) {
                    // Specific formatting for MS IT GPA 4.0
                    counter.innerText = "4.0/4.0";
                    return;
                }
                
                if (inc < 1) inc = 1;
                
                if (count < target) {
                    const nextVal = Math.ceil(count + inc);
                    if (nextVal >= target) {
                        counter.innerText = target === 98 ? "98%+" : target + "+";
                    } else {
                        counter.innerText = nextVal;
                        setTimeout(updateCount, 15);
                    }
                } else {
                    counter.innerText = target === 98 ? "98%+" : target + "+";
                }
            };
            updateCount();
        });
    };

    // Trigger counters on load (or using IntersectionObserver)
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startCounters();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        
        const statsSection = document.querySelector(".hero-right");
        if (statsSection) observer.observe(statsSection);
    } else {
        startCounters();
    }

    // 3. Project Filter Logic
    const filterButtons = document.querySelectorAll(".filter-btn");
    const projectCards = document.querySelectorAll(".project-card");

    filterButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Remove active class from other buttons
            filterButtons.forEach(btn => btn.classList.remove("active"));
            button.classList.add("active");

            const filterValue = button.getAttribute("data-filter");

            projectCards.forEach(card => {
                const categories = card.getAttribute("data-category").split(" ");
                if (filterValue === "all" || categories.includes(filterValue)) {
                    card.classList.remove("hidden");
                } else {
                    card.classList.add("hidden");
                }
            });
        });
    });

    // 4. Interactive Dashboard Modal Lightbox
    const modal = document.getElementById("dashboard-modal");
    const modalImg = document.getElementById("modal-dashboard-img");
    const closeBtn = document.querySelector(".close-modal-btn");
    const viewButtons = document.querySelectorAll(".view-dashboard-btn");

    viewButtons.forEach(button => {
        button.addEventListener("click", () => {
            const dashboardSrc = button.getAttribute("data-dashboard");
            modalImg.src = dashboardSrc;
            modal.classList.add("active");
            document.body.style.overflow = "hidden"; // Disable background scrolling
        });
    });

    const closeModal = () => {
        modal.classList.remove("active");
        document.body.style.overflow = "auto"; // Re-enable background scrolling
        setTimeout(() => {
            modalImg.src = ""; // Clear source after transition completes
        }, 300);
    };

    closeBtn.addEventListener("click", closeModal);
    
    // Close modal when clicking on dark overlay background
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close modal on Escape key press
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal.classList.contains("active")) {
            closeModal();
        }
    });

    // Visitor ML Models & Charts Modal
    const mlModal = document.getElementById("ml-charts-modal");
    const viewMlBtn = document.getElementById("view-ml-charts-btn");
    const closeMlBtn = document.getElementById("close-ml-modal-btn");

    if (viewMlBtn && mlModal) {
        viewMlBtn.addEventListener("click", () => {
            mlModal.classList.add("active");
            document.body.style.overflow = "hidden";
        });
    }

    const closeMlModal = () => {
        if (mlModal) {
            mlModal.classList.remove("active");
            document.body.style.overflow = ""; // Re-enable background scrolling
        }
    };

    if (closeMlBtn) {
        closeMlBtn.addEventListener("click", closeMlModal);
    }

    if (mlModal) {
        mlModal.addEventListener("click", (e) => {
            if (e.target === mlModal) {
                closeMlModal();
            }
        });
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && mlModal && mlModal.classList.contains("active")) {
            closeMlModal();
        }
    });

    // ==========================================================================
    // 5. Light/Dark Mode Theme Switcher
    // ==========================================================================
    const themeToggleBtn = document.getElementById("theme-toggle");
    const themeIcon = themeToggleBtn.querySelector(".theme-icon");
    
    // Check local storage or media preferences for default theme
    const savedTheme = localStorage.getItem("theme") || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    
    if (savedTheme === "light") {
        document.body.classList.add("light-theme");
        themeIcon.textContent = "☀️";
    } else {
        document.body.classList.remove("light-theme");
        themeIcon.textContent = "🌙";
    }

    themeToggleBtn.addEventListener("click", () => {
        if (document.body.classList.contains("light-theme")) {
            document.body.classList.remove("light-theme");
            themeIcon.textContent = "🌙";
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.add("light-theme");
            themeIcon.textContent = "☀️";
            localStorage.setItem("theme", "light");
        }
    });

    // ==========================================================================
    // 6. Interactive HTML Resume Modal & Printing
    // ==========================================================================
    const resumeModal = document.getElementById("resume-modal");
    const resumeNavBtn = document.getElementById("resume-nav-btn");
    const resumeHeroBtn = document.getElementById("resume-hero-btn");
    const closeResumeBtn = document.querySelector(".close-resume-btn");
    const printResumeBtn = document.getElementById("print-resume-btn");

    const openResume = () => {
        resumeModal.classList.add("active");
        document.body.style.overflow = "hidden";
    };

    const closeResume = () => {
        resumeModal.classList.remove("active");
        document.body.style.overflow = "auto";
    };

    if (resumeNavBtn) resumeNavBtn.addEventListener("click", openResume);
    if (resumeHeroBtn) resumeHeroBtn.addEventListener("click", openResume);
    if (closeResumeBtn) closeResumeBtn.addEventListener("click", closeResume);
    
    resumeModal.addEventListener("click", (e) => {
        if (e.target === resumeModal) {
            closeResume();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && resumeModal.classList.contains("active")) {
            closeResume();
        }
    });

    if (printResumeBtn) {
        printResumeBtn.addEventListener("click", () => {
            window.print();
        });
    }

    // ==========================================================================
    // 7. Contact Form Submission (Web3Forms API)
    // ==========================================================================
    const contactForm = document.getElementById("contact-form");
    const formResult = document.getElementById("form-result");

    if (contactForm) {
        contactForm.addEventListener("submit", (e) => {
            e.preventDefault();
            formResult.textContent = "Sending message...";
            formResult.className = "form-result-text";

            const formData = new FormData(contactForm);
            
            fetch("https://api.web3forms.com/submit", {
                method: "POST",
                body: formData
            })
            .then(async (response) => {
                let json = await response.json();
                if (response.status == 200) {
                    formResult.textContent = "Message sent successfully! 🚀";
                    formResult.className = "form-result-text success";
                    contactForm.reset();
                } else {
                    formResult.textContent = json.message || "Something went wrong.";
                    formResult.className = "form-result-text error";
                }
            })
            .catch(error => {
                formResult.textContent = "Failed to send message. Please check connection.";
                formResult.className = "form-result-text error";
            });
        });
    }

    // ==========================================================================
    // 8. Dynamic Learning Logs Timeline Ingestion (GitHub API)
    // ==========================================================================
    const learningFeed = document.getElementById("learning-feed");

    const loadLearningLogs = async () => {
        if (!learningFeed) return;

        try {
            // Fetch list of files in the notes folder of the dev-root-affinity repo
            const response = await fetch("https://api.github.com/repos/Deshraj-Jogiya/dev-root-affinity/contents/notes");
            if (!response.ok) throw new Error("Failed to load notes from repository.");

            const files = await response.json();
            
            // Filter only markdown/text files and exclude READMEs
            const noteFiles = files.filter(f => f.type === "file" && (f.name.endsWith(".md") || f.name.endsWith(".txt")) && f.name.toLowerCase() !== "readme.md");

            if (noteFiles.length === 0) {
                renderFallbackLogs();
                return;
            }

            // Sort descending to get the latest files
            noteFiles.sort((a, b) => b.name.localeCompare(a.name));

            // Fetch the 3 most recent notes
            const latestNotes = noteFiles.slice(0, 3);
            learningFeed.innerHTML = ""; // Clear loader

            for (const note of latestNotes) {
                const noteRes = await fetch(note.download_url);
                const text = await noteRes.text();
                
                const parsedNote = parseNoteContent(note.name, text);
                renderLogItem(parsedNote);
            }
        } catch (err) {
            console.warn("GitHub API rate limit or network error, loading local fallback logs:", err);
            renderFallbackLogs();
        }
    };

    const parseNoteContent = (filename, content) => {
        const cleanName = filename.replace(/\.(md|txt)$/i, "");
        const parts = cleanName.split("_");
        let dateStr = "";
        let titleStr = "";

        if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
            const dateObj = new Date(parts[0] + "T00:00:00");
            dateStr = dateObj.toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
            titleStr = parts.slice(1).join(" ").replace(/-/g, " ");
        } else {
            dateStr = "Recent Note";
            titleStr = cleanName.replace(/-/g, " ").replace(/_/g, " ");
        }

        const lines = content.split("\n");
        const takeaways = [];
        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
                const bullet = trimmed.substring(1).trim();
                if (bullet && takeaways.length < 3) {
                    takeaways.push(bullet);
                }
            }
        });

        if (takeaways.length === 0) {
            takeaways.push("Refined model training parameters and feature pipelines.");
            takeaways.push("Reviewed logs and anomaly scores for audit validations.");
        }

        return {
            date: dateStr,
            title: titleStr.toUpperCase(),
            takeaways: takeaways
        };
    };

    const renderLogItem = (log) => {
        const item = document.createElement("div");
        item.className = "learning-item glass-card learning-card";
        
        let bulletsHtml = "";
        log.takeaways.forEach(pt => {
            bulletsHtml += `<li>${pt}</li>`;
        });

        item.innerHTML = `
            <div class="learning-date">${log.date}</div>
            <h4 class="learning-title" style="margin-bottom: 0.75rem;">${log.title}</h4>
            <ul class="learning-takeaways">
                ${bulletsHtml}
            </ul>
        `;
        learningFeed.appendChild(item);
    };

    const renderFallbackLogs = () => {
        if (!learningFeed) return;
        learningFeed.innerHTML = "";
        
        const fallbackData = [
            {
                date: "June 16, 2026",
                title: "ETL OBSERVABILITY PIPELINE ROBUSTNESS",
                takeaways: [
                    "Integrated Kolmogorov-Smirnov (KS) tests into live monitoring to catch feature drift dynamically.",
                    "Improved isolation forest thresholds on General Ledger transactions, reducing tax false positives by 12%.",
                    "Resolved namespace collision in ASU STEM platform module imports."
                ]
            },
            {
                date: "June 15, 2026",
                title: "K-MEANS CLUSTERING & RFM SCALING",
                takeaways: [
                    "Standardized customer metrics using StandardScaler before training K-Means (k=4) models.",
                    "Configured principal component analysis (PCA) dimension reduction to plot clusters in 2D space.",
                    "Wrote automated CSV output script to pipe customer segmentations directly to Power BI reports."
                ]
            },
            {
                date: "June 14, 2026",
                title: "TELEOPERATION ROBOTICS DATA QA PIPELINES",
                takeaways: [
                    "Built high-frequency EV battery sensor ingestion pipeline running Z-score calculations.",
                    "Optimized database indexing for telematics SQLite instances, speeding up rolling query execution by 30%.",
                    "Integrated remaining useful life (RUL) estimation algorithms for fleet battery monitoring."
                ]
            }
        ];

        fallbackData.forEach(renderLogItem);
    };

    loadLearningLogs();

    // ==========================================================================
    // 9. Observability Monitor Simulation
    // ==========================================================================
    const runObsBtn = document.getElementById("run-obs-btn");
    const obsConsole = document.getElementById("obs-console");
    const obsStatus = document.getElementById("obs-status");
    const obsStatusText = document.getElementById("obs-status-text");
    const metricLatency = document.getElementById("metric-latency");
    const metricReliability = document.getElementById("metric-reliability");
    const metricRows = document.getElementById("metric-rows");
    const metricDrift = document.getElementById("metric-drift");

    const obsSimLogs = [
        { type: "info", text: "[INFO] [2026-06-16 14:20:00] Initializing daily retail sales ETL pipeline ingestion..." },
        { type: "info", text: "[INFO] Fetching daily transactional JSON files from 5 branch stores..." },
        { type: "success", text: "[SUCCESS] Ingested 5 separate logs. Total rows read: 5,167." },
        { type: "info", text: "[INFO] Starting Great Expectations data QA validation schema check..." },
        { type: "success", text: "[SUCCESS] Schema check complete. 0 null values, column types matching star schema." },
        { type: "info", text: "[INFO] Calculating RFM customer profiles (Recency, Frequency, Monetary)..." },
        { type: "info", text: "[INFO] Standardizing metrics and loading K-Means Clustering model (k=4)..." },
        { type: "info", text: "[INFO] Evaluating data drift. Running Kolmogorov-Smirnov (KS) test on Monetary values..." },
        { type: "warn", text: "[WARN] Feature Drift detected on 'Monetary' distribution (KS p-value = 0.034 < 0.05)." },
        { type: "info", text: "[INFO] Re-centering PCA coordinates for cluster visualization..." },
        { type: "info", text: "[INFO] Materializing results into SQLite database dim_customers and fact_sales..." },
        { type: "success", text: "[SUCCESS] ETL pipeline executed successfully. Materialized views compiled." },
        { type: "info", text: "[INFO] Updating Power BI dataset dashboard cache..." },
        { type: "success", text: "[SUCCESS] Observed reliability: 98.4%. Pipeline run complete." }
    ];

    let isRunningObs = false;

    // Pipeline Visual Node selectors
    const pipelineProgress = document.getElementById("pipeline-progress-line");
    const nodeIngest = document.getElementById("node-ingest");
    const nodeValidate = document.getElementById("node-validate");
    const nodeScore = document.getElementById("node-score");
    const nodeCommit = document.getElementById("node-commit");

    function resetPipelineNodes() {
        if (pipelineProgress) pipelineProgress.style.width = "0%";
        [nodeIngest, nodeValidate, nodeScore, nodeCommit].forEach(n => {
            if (n) n.className = "pipeline-node-item";
        });
    }

    if (runObsBtn) {
        runObsBtn.addEventListener("click", () => {
            if (isRunningObs) return;
            isRunningObs = true;
            runObsBtn.disabled = true;
            runObsBtn.textContent = "Processing ETL Pipeline... 🔄";
            
            // Set status to running
            obsStatus.className = "obs-status running";
            obsStatusText.textContent = "Running ETL";
            
            // Reset console, metrics, and nodes
            obsConsole.innerHTML = "";
            metricLatency.textContent = "0.00s";
            metricRows.textContent = "0";
            metricDrift.textContent = "Checking";
            metricDrift.style.color = "inherit";
            resetPipelineNodes();

            let currentLogIndex = 0;
            const logInterval = setInterval(() => {
                if (currentLogIndex < obsSimLogs.length) {
                    const log = obsSimLogs[currentLogIndex];
                    const logEl = document.createElement("div");
                    logEl.className = `obs-log ${log.type}`;
                    logEl.textContent = log.text;
                    obsConsole.appendChild(logEl);
                    obsConsole.scrollTop = obsConsole.scrollHeight;

                    // Animate Pipeline Node Flow Diagram dynamically based on log progression
                    if (currentLogIndex === 0) {
                        if (nodeIngest) nodeIngest.classList.add("active");
                        if (pipelineProgress) pipelineProgress.style.width = "12.5%";
                    } else if (currentLogIndex === 3) {
                        if (nodeIngest) { nodeIngest.classList.remove("active"); nodeIngest.classList.add("success"); }
                        if (nodeValidate) nodeValidate.classList.add("active");
                        if (pipelineProgress) pipelineProgress.style.width = "37.5%";
                    } else if (currentLogIndex === 6) {
                        if (nodeValidate) { nodeValidate.classList.remove("active"); nodeValidate.classList.add("success"); }
                        if (nodeScore) nodeScore.classList.add("active");
                        if (pipelineProgress) pipelineProgress.style.width = "62.5%";
                    } else if (currentLogIndex === 8) {
                        if (nodeScore) { nodeScore.classList.remove("active"); nodeScore.classList.add("warning"); }
                        if (nodeCommit) nodeCommit.classList.add("active");
                        if (pipelineProgress) pipelineProgress.style.width = "87.5%";
                    } else if (currentLogIndex === 11) {
                        if (nodeCommit) { nodeCommit.classList.remove("active"); nodeCommit.classList.add("success"); }
                        if (pipelineProgress) pipelineProgress.style.width = "100%";
                    }

                    // Update metrics incrementally
                    if (currentLogIndex === 2) {
                        metricRows.textContent = "5,167";
                    }
                    if (currentLogIndex === 8) {
                        metricDrift.textContent = "Warning ⚠️";
                        metricDrift.style.color = "var(--accent-amber)";
                    }
                    if (currentLogIndex === 11) {
                        metricLatency.textContent = "1.45s";
                        metricDrift.textContent = "Drift Handled";
                        metricDrift.style.color = "var(--accent-emerald)";
                    }

                    currentLogIndex++;
                } else {
                    clearInterval(logInterval);
                    
                    // Complete
                    isRunningObs = false;
                    runObsBtn.disabled = false;
                    runObsBtn.textContent = "Run Pipeline Diagnostics 🚀";
                    
                    obsStatus.className = "obs-status idle";
                    obsStatusText.textContent = "System Idle";
                }
            }, 600);
        });
    }

    // ==========================================================================
    // 10. SQL Playground logic
    // ==========================================================================
    const sqlSelect = document.getElementById("sql-query-select");
    const sqlEditor = document.getElementById("sql-editor");
    const runSqlBtn = document.getElementById("run-sql-btn");
    const sqlResultsTable = document.getElementById("sql-results-table");

    const sqlQueries = {
        revenue_by_segment: {
            raw: `SELECT \n  c.segment AS customer_segment,\n  COUNT(DISTINCT s.customer_id) AS customer_count,\n  SUM(s.units_sold) AS total_units_sold,\n  ROUND(SUM(s.total_price), 2) AS total_revenue_usd\nFROM fact_sales s\nJOIN dim_customers c ON s.customer_id = c.customer_id\nGROUP BY c.segment\nORDER BY total_revenue_usd DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  c.segment <span class="sql-keyword">AS</span> customer_segment,
  <span class="sql-keyword">COUNT</span>(<span class="sql-keyword">DISTINCT</span> s.customer_id) <span class="sql-keyword">AS</span> customer_count,
  <span class="sql-keyword">SUM</span>(s.units_sold) <span class="sql-keyword">AS</span> total_units_sold,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">SUM</span>(s.total_price), <span class="sql-number">2</span>) <span class="sql-keyword">AS</span> total_revenue_usd
<span class="sql-keyword">FROM</span> <span class="sql-table">fact_sales</span> s
<span class="sql-keyword">JOIN</span> <span class="sql-table">dim_customers</span> c <span class="sql-keyword">ON</span> s.customer_id = c.customer_id
<span class="sql-keyword">GROUP BY</span> c.segment
<span class="sql-keyword">ORDER BY</span> total_revenue_usd <span class="sql-keyword">DESC</span>;`,
            headers: ["customer_segment", "customer_count", "total_units_sold", "total_revenue_usd"],
            data: [
                ["VIP Champions", "42", "1,842", "$34,250.00"],
                ["Loyal Growth", "120", "2,105", "$24,180.20"],
                ["At-Risk Slipping", "85", "840", "$8,124.50"],
                ["Lost Inactive", "150", "380", "$3,120.00"]
            ]
        },
        anomaly_risk_claims: {
            raw: `SELECT \n  claim_id,\n  company_name,\n  tax_claimed_usd,\n  isolation_forest_anomaly_score AS anomaly_score,\n  CASE \n    WHEN isolation_forest_anomaly_score < 0 THEN 'HIGH RISK'\n    ELSE 'COMPLIANT'\n  END AS audit_status\nFROM tax_claims\nWHERE audit_status = 'HIGH RISK'\nORDER BY tax_claimed_usd DESC\nLIMIT 5;`,
            html: `<span class="sql-keyword">SELECT</span> 
  claim_id,
  company_name,
  tax_claimed_usd,
  isolation_forest_anomaly_score <span class="sql-keyword">AS</span> anomaly_score,
  <span class="sql-keyword">CASE</span> 
    <span class="sql-keyword">WHEN</span> isolation_forest_anomaly_score &lt; <span class="sql-number">0</span> <span class="sql-keyword">THEN</span> <span class="sql-string">'HIGH RISK'</span>
    <span class="sql-keyword">ELSE</span> <span class="sql-string">'COMPLIANT'</span>
  <span class="sql-keyword">END AS</span> audit_status
<span class="sql-keyword">FROM</span> <span class="sql-table">tax_claims</span>
<span class="sql-keyword">WHERE</span> audit_status = <span class="sql-string">'HIGH RISK'</span>
<span class="sql-keyword">ORDER BY</span> tax_claimed_usd <span class="sql-keyword">DESC</span>
<span class="sql-keyword">LIMIT</span> <span class="sql-number">5</span>;`,
            headers: ["claim_id", "company_name", "tax_claimed_usd", "anomaly_score", "audit_status"],
            data: [
                ["CLM-7824", "Vertex Global Corp", "$184,500.00", "-0.185", "HIGH RISK"],
                ["CLM-9234", "Apex Logistics Ltd", "$142,300.00", "-0.142", "HIGH RISK"],
                ["CLM-1153", "BioHealth Pharma", "$98,400.00", "-0.098", "HIGH RISK"],
                ["CLM-8843", "Nexus Energy Ventures", "$84,100.00", "-0.084", "HIGH RISK"],
                ["CLM-4322", "Pioneer Retail Group", "$79,300.00", "-0.076", "HIGH RISK"]
            ]
        },
        survival_by_treatment: {
            raw: `SELECT \n  treatment_arm,\n  COUNT(patient_id) AS cohort_size,\n  ROUND(AVG(survival_days), 1) AS mean_survival_days,\n  ROUND(AVG(systolic_bp_change), 1) AS avg_systolic_bp_delta,\n  ROUND(AVG(diastolic_bp_change), 1) AS avg_diastolic_bp_delta\nFROM trial_outcomes\nGROUP BY treatment_arm;`,
            html: `<span class="sql-keyword">SELECT</span> 
  treatment_arm,
  <span class="sql-keyword">COUNT</span>(patient_id) <span class="sql-keyword">AS</span> cohort_size,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">AVG</span>(survival_days), <span class="sql-number">1</span>) <span class="sql-keyword">AS</span> mean_survival_days,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">AVG</span>(systolic_bp_change), <span class="sql-number">1</span>) <span class="sql-keyword">AS</span> avg_systolic_bp_delta,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">AVG</span>(diastolic_bp_change), <span class="sql-number">1</span>) <span class="sql-keyword">AS</span> avg_diastolic_bp_delta
<span class="sql-keyword">FROM</span> <span class="sql-table">trial_outcomes</span>
<span class="sql-keyword">GROUP BY</span> treatment_arm;`,
            headers: ["treatment_arm", "cohort_size", "mean_survival_days", "avg_systolic_bp_delta", "avg_diastolic_bp_delta"],
            data: [
                ["High-Dosage Arm (Target)", "85", "324.5 days", "-12.4 mmHg", "-8.2 mmHg"],
                ["Low-Dosage Arm", "83", "280.2 days", "-6.8 mmHg", "-4.5 mmHg"],
                ["Control Arm (Placebo)", "82", "204.1 days", "+1.2 mmHg", "+0.8 mmHg"]
            ]
        },
        drift_by_feature: {
            raw: `SELECT \n  feature_name,\n  ks_statistic,\n  ks_p_value,\n  CASE \n    WHEN ks_p_value < 0.05 THEN 'DRIFT DETECTED'\n    ELSE 'STABLE'\n  END AS drift_status,\n  last_updated_at\nFROM model_observability_history\nORDER BY ks_statistic DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  feature_name,
  ks_statistic,
  ks_p_value,
  <span class="sql-keyword">CASE</span> 
    <span class="sql-keyword">WHEN</span> ks_p_value &lt; <span class="sql-number">0.05</span> <span class="sql-keyword">THEN</span> <span class="sql-string">'DRIFT DETECTED'</span>
    <span class="sql-keyword">ELSE</span> <span class="sql-string">'STABLE'</span>
  <span class="sql-keyword">END AS</span> drift_status,
  last_updated_at
<span class="sql-keyword">FROM</span> <span class="sql-table">model_observability_history</span>
<span class="sql-keyword">ORDER BY</span> ks_statistic <span class="sql-keyword">DESC</span>;`,
            headers: ["feature_name", "ks_statistic", "ks_p_value", "drift_status", "last_updated_at"],
            data: [
                ["Monetary Value (Spend)", "0.142", "0.034", "DRIFT DETECTED", "2026-06-16 14:00:00"],
                ["Tenure Months", "0.054", "0.245", "STABLE", "2026-06-16 14:00:00"],
                ["Recency Days", "0.031", "0.582", "STABLE", "2026-06-16 14:00:00"],
                ["Frequency Units", "0.024", "0.814", "STABLE", "2026-06-16 14:00:00"]
            ]
        },
        emissions_by_state: {
            raw: `SELECT \n  state,\n  SUM(case when land_type = 'Forest' then area_ha else 0 end) AS forest_area_ha,\n  SUM(case when land_type = 'Urban' then area_ha else 0 end) AS urban_area_ha,\n  ROUND(SUM(co2_tons), 1) AS net_co2_emissions_tons\nFROM land_use_records\nGROUP BY state\nORDER BY net_co2_emissions_tons DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  state,
  <span class="sql-keyword">SUM</span>(<span class="sql-keyword">CASE</span> <span class="sql-keyword">WHEN</span> land_type = <span class="sql-string">'Forest'</span> <span class="sql-keyword">THEN</span> area_ha <span class="sql-keyword">ELSE</span> <span class="sql-number">0</span> <span class="sql-keyword">END</span>) <span class="sql-keyword">AS</span> forest_area_ha,
  <span class="sql-keyword">SUM</span>(<span class="sql-keyword">CASE</span> <span class="sql-keyword">WHEN</span> land_type = <span class="sql-string">'Urban'</span> <span class="sql-keyword">THEN</span> area_ha <span class="sql-keyword">ELSE</span> <span class="sql-number">0</span> <span class="sql-keyword">END</span>) <span class="sql-keyword">AS</span> urban_area_ha,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">SUM</span>(co2_tons), <span class="sql-number">1</span>) <span class="sql-keyword">AS</span> net_co2_emissions_tons
<span class="sql-keyword">FROM</span> <span class="sql-table">land_use_records</span>
<span class="sql-keyword">GROUP BY</span> state
<span class="sql-keyword">ORDER BY</span> net_co2_emissions_tons <span class="sql-keyword">DESC</span>;`,
            headers: ["state", "forest_area_ha", "urban_area_ha", "net_co2_emissions_tons"],
            data: [
                ["California (CA)", "142,500", "55,200", "-18,450.0"],
                ["Washington (WA)", "98,200", "12,400", "-24,320.5"],
                ["Florida (FL)", "45,300", "38,100", "+8,420.0"],
                ["Texas (TX)", "65,100", "84,300", "+14,280.2"],
                ["Alabama (AL)", "87,400", "15,800", "-2,120.4"]
            ]
        },
        credit_fraud_risk: {
            raw: `SELECT \n  risk_score_tier,\n  COUNT(*) AS application_count,\n  ROUND(AVG(income_usd), 0) AS avg_income,\n  SUM(CASE WHEN transaction_anomaly_flag = 1 THEN 1 ELSE 0 END) AS flagged_anomalies\nFROM credit_applications\nGROUP BY risk_score_tier\nORDER BY application_count DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  risk_score_tier,
  <span class="sql-keyword">COUNT</span>(*) <span class="sql-keyword">AS</span> application_count,
  <span class="sql-keyword">ROUND</span>(<span class="sql-keyword">AVG</span>(income_usd), <span class="sql-number">0</span>) <span class="sql-keyword">AS</span> avg_income,
  <span class="sql-keyword">SUM</span>(<span class="sql-keyword">CASE</span> <span class="sql-keyword">WHEN</span> transaction_anomaly_flag = <span class="sql-number">1</span> <span class="sql-keyword">THEN</span> <span class="sql-number">1</span> <span class="sql-keyword">ELSE</span> <span class="sql-number">0</span> <span class="sql-keyword">END</span>) <span class="sql-keyword">AS</span> flagged_anomalies
<span class="sql-keyword">FROM</span> <span class="sql-table">credit_applications</span>
<span class="sql-keyword">GROUP BY</span> risk_score_tier
<span class="sql-keyword">ORDER BY</span> application_count <span class="sql-keyword">DESC</span>;`,
            headers: ["risk_score_tier", "application_count", "avg_income", "flagged_anomalies"],
            data: [
                ["Tier-A (Low Risk)", "120", "$94,500", "1"],
                ["Tier-B (Moderate)", "42", "$68,200", "3"],
                ["Tier-C (High Risk)", "12", "$42,300", "5"],
                ["Tier-D (Critical)", "2", "$31,000", "2"]
            ]
        },
        iot_telematics: {
            raw: `SELECT \n  device_id,\n  AVG(motor_temp_c) AS avg_temp_c,\n  MAX(vibration_level) AS max_vibe,\n  SUM(CASE WHEN vibration_level > 2.5 THEN 1 ELSE 0 END) AS anomaly_alerts\nFROM telemetry_logs\nGROUP BY device_id\nHAVING anomaly_alerts > 0\nORDER BY anomaly_alerts DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  device_id,
  <span class="sql-keyword">AVG</span>(motor_temp_c) <span class="sql-keyword">AS</span> avg_temp_c,
  <span class="sql-keyword">MAX</span>(vibration_level) <span class="sql-keyword">AS</span> max_vibe,
  <span class="sql-keyword">SUM</span>(<span class="sql-keyword">CASE</span> <span class="sql-keyword">WHEN</span> vibration_level &gt; <span class="sql-number">2.5</span> <span class="sql-keyword">THEN</span> <span class="sql-number">1</span> <span class="sql-keyword">ELSE</span> <span class="sql-number">0</span> <span class="sql-keyword">END</span>) <span class="sql-keyword">AS</span> anomaly_alerts
<span class="sql-keyword">FROM</span> <span class="sql-table">telemetry_logs</span>
<span class="sql-keyword">GROUP BY</span> device_id
<span class="sql-keyword">HAVING</span> anomaly_alerts &gt; <span class="sql-number">0</span>
<span class="sql-keyword">ORDER BY</span> anomaly_alerts <span class="sql-keyword">DESC</span>;`,
            headers: ["device_id", "avg_temp_c", "max_vibe", "anomaly_alerts"],
            data: [
                ["DEV-004", "78.4 C", "3.24", "15"],
                ["DEV-001", "72.1 C", "2.84", "4"],
                ["DEV-003", "65.8 C", "2.61", "2"]
            ]
        },
        simulated_sales_forecast: {
            raw: `SELECT \n  branch_city,\n  SUM(units_sold) AS total_units_sold,\n  AVG(stock_remaining) AS avg_stock_level,\n  MIN(stock_remaining) AS min_stock_level\nFROM branch_sales\nGROUP BY branch_city\nORDER BY total_units_sold DESC;`,
            html: `<span class="sql-keyword">SELECT</span> 
  branch_city,
  <span class="sql-keyword">SUM</span>(units_sold) <span class="sql-keyword">AS</span> total_units_sold,
  <span class="sql-keyword">AVG</span>(stock_remaining) <span class="sql-keyword">AS</span> avg_stock_level,
  <span class="sql-keyword">MIN</span>(stock_remaining) <span class="sql-keyword">AS</span> min_stock_level
<span class="sql-keyword">FROM</span> <span class="sql-table">branch_sales</span>
<span class="sql-keyword">GROUP BY</span> branch_city
<span class="sql-keyword">ORDER BY</span> total_units_sold <span class="sql-keyword">DESC</span>;`,
            headers: ["branch_city", "total_units_sold", "avg_stock_level", "min_stock_level"],
            data: [
                ["Chicago", "12,450", "425 units", "12 units"],
                ["Boston", "9,820", "310 units", "4 units"],
                ["Seattle", "7,140", "515 units", "42 units"],
                ["Miami", "6,800", "280 units", "18 units"],
                ["Dallas", "5,230", "640 units", "95 units"]
            ]
        }
    };

    const updateSqlPreview = () => {
        if (!sqlSelect || !sqlEditor) return;
        const selected = sqlSelect.value;
        const query = sqlQueries[selected];
        if (query) {
            sqlEditor.innerHTML = query.html;
        }
    };

    // Business value insights mapping to playground queries
    const recruiterInsights = {
        revenue_by_segment: {
            text: "Business Value: Groups customers by their shopping frequency and spending. This helps a business target loyal customers with rewards and win back inactive customers with custom discounts, raising overall sales.",
            takeaway: "Key Skills: Customer Segmentation (K-Means, PCA), Database Star Schema design, and Business Intelligence dashboarding."
        },
        anomaly_risk_claims: {
            text: "Business Value: Audits financial transactions automatically to flag weird patterns or potential errors. This saves finance teams hundreds of hours of manual verification and stops transaction fraud early.",
            takeaway: "Key Skills: Automated Auditing, Anomaly Detection modeling, and Compliance reporting."
        },
        survival_by_treatment: {
            text: "Business Value: Analyzes patient treatment groups in clinical trials to evaluate which medicine dosages are most effective and safe. It proves therapeutic success with high statistical certainty.",
            takeaway: "Key Skills: Biostatistics, Survival Curve modeling, and Clinical Database architecture."
        },
        drift_by_feature: {
            text: "Business Value: Monitors live AI models to make sure their accuracy hasn't dropped since they were deployed. This guarantees the AI keeps outputting reliable predictions as customer behaviors change.",
            takeaway: "Key Skills: AI/ML Observability, Data Quality Audits, and automated retraining pipelines."
        },
        emissions_by_state: {
            text: "Business Value: Tracks regional land cover changes (like forest loss vs urban growth) to calculate environmental carbon impact. This enables governments and companies to plan sustainability efforts accurately.",
            takeaway: "Key Skills: Geospatial ETL pipelines, Carbon Accounting logic, and regional scale analysis."
        },
        credit_fraud_risk: {
            text: "Business Value: Automatically evaluates loan applicant risk scores alongside transaction safety metrics. This protects banking capital from defaults while ensuring safe, legitimate applicants get approved quickly.",
            takeaway: "Key Skills: Financial Risk Auditing, Credit Tier modeling, and security checkpoints."
        },
        iot_telematics: {
            text: "Business Value: Monitors live vehicle telemetry (vibration, heat) to flag when a component is starting to wear down. This lets fleet operators schedule maintenance before a vehicle breaks down on the road, avoiding costly repairs.",
            takeaway: "Key Skills: Real-time Telemetry processing, IoT anomaly flags, and predictive maintenance algorithms."
        },
        simulated_sales_forecast: {
            text: "Business Value: Forecasts daily inventory demand across multiple retail branches to match stock levels. This prevents out-of-stock scenarios (lost sales) and reduces warehousing overhead costs.",
            takeaway: "Key Skills: Retail demand forecasting, Multi-branch data synchronization, and Inventory Analytics."
        }
    };

    function updateRecruiterInsights() {
        const selectedValue = sqlSelect.value;
        const insight = recruiterInsights[selectedValue];
        const textEl = document.getElementById("recruiter-insight-text");
        const takeawayEl = document.getElementById("recruiter-insight-takeaway");
        if (insight && textEl && takeawayEl) {
            textEl.textContent = insight.text;
            takeawayEl.innerHTML = `<strong>Key Takeaway:</strong> ${insight.takeaway}`;
        }
    }

    if (sqlSelect) {
        sqlSelect.addEventListener("change", () => {
            updateSqlPreview();
            updateRecruiterInsights();
        });
        updateSqlPreview(); // Initial preview on page load
        updateRecruiterInsights(); // Initial insights display
    }

    if (runSqlBtn && sqlResultsTable) {
        runSqlBtn.addEventListener("click", () => {
            const selected = sqlSelect.value;
            const query = sqlQueries[selected];
            if (!query) return;

            const thead = sqlResultsTable.querySelector("thead");
            const tbody = sqlResultsTable.querySelector("tbody");

            thead.innerHTML = "";
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem;">
                <div class="spinner" style="margin: 0 auto 1rem auto; width: 30px; height: 30px;"></div>
                Executing SQL query against local SQLite cache database...
            </td></tr>`;

            setTimeout(() => {
                let headerRow = "<tr>";
                query.headers.forEach(h => {
                    headerRow += `<th>${h}</th>`;
                });
                headerRow += "</tr>";
                thead.innerHTML = headerRow;

                tbody.innerHTML = "";
                query.data.forEach(row => {
                    let dataRow = "<tr>";
                    row.forEach(val => {
                        let cellStyle = "";
                        if (val === "HIGH RISK" || val === "DRIFT DETECTED") {
                            cellStyle = "style='color: #ef4444; font-weight: bold;'";
                        } else if (val === "COMPLIANT" || val === "STABLE") {
                            cellStyle = "style='color: var(--accent-emerald); font-weight: bold;'";
                        } else if (val.includes("Target")) {
                            cellStyle = "style='color: #8b5cf6; font-weight: bold;'";
                        }
                        dataRow += `<td ${cellStyle}>${val}</td>`;
                    });
                    dataRow += "</tr>";
                    tbody.innerHTML += dataRow;
                });
            }, 600);
        });
    }
});
