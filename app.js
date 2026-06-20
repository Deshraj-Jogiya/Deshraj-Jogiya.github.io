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
            const bulletMatch = trimmed.match(/^[-*]\s+(.*)$/);
            if (bulletMatch) {
                const bullet = bulletMatch[1].trim();
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
            // Convert simple markdown elements like **bold** and `code` to HTML tags
            let formattedPt = pt
                .replace(/\*\*(.*?)\*\//g, '<strong>$1</strong>') // Handle nested formats
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\`(.*?)\`/g, '<code>$1</code>');
            bulletsHtml += `<li>${formattedPt}</li>`;
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
        { type: "success", text: "[SUCCESS] Observed reliability: 98.4%. Pipeline run complete." }
    ];
    let isRunningObs = false;
    let currentReliability = "98.2%";

    // Great Expectations Mock Rules Data
    const qaReportData = [
        { name: "expect_table_column_count_to_equal(8)", status: "pass", desc: "Verifies the general ledger schema contains exactly 8 columns (transaction_id, date, amount, account, entity, location, user, anomaly_flag).", details: { expectation_type: "expect_table_column_count_to_equal", kwargs: { value: 8 }, meta: { dimension: "schema" } } },
        { name: "expect_column_values_to_not_be_null(\"transaction_id\")", status: "pass", desc: "Ensures primary key transaction_id is non-null for all incoming records.", details: { expectation_type: "expect_column_values_to_not_be_null", kwargs: { column: "transaction_id" }, meta: { dimension: "completeness" } } },
        { name: "expect_column_values_to_be_between(\"amount\", 0, 10000000)", status: "pass", desc: "Ensures financial transaction amount is positive and under $10M threshold.", details: { expectation_type: "expect_column_values_to_be_between", kwargs: { column: "amount", min_value: 0, max_value: 10000000 }, meta: { dimension: "validity" } } },
        { name: "expect_column_values_to_be_in_set(\"segment\", [\"VIP\", \"Loyal\", \"Slipping\", \"Lost\"])", status: "pass", desc: "Verifies customer segments map strictly to the database classification taxonomy.", details: { expectation_type: "expect_column_values_to_be_in_set", kwargs: { column: "segment", value_set: ["VIP", "Loyal", "Slipping", "Lost"] }, meta: { dimension: "consistency" } } },
        { name: "expect_column_values_to_match_regex(\"date\", \"^\\\\d{4}-\\\\d{2}-\\\\d{2}$\")", status: "pass", desc: "Validates date format follows ISO YYYY-MM-DD pattern.", details: { expectation_type: "expect_column_values_to_match_regex", kwargs: { column: "date", regex: "^\\d{4}-\\d{2}-\\d{2}$" }, meta: { dimension: "schema" } } },
        { name: "expect_column_values_to_follow_benfords_law(\"amount\")", status: "warn", desc: "Checks first-digit distribution against Benford's Law logarithmic curve. Warns on significant distribution drift (KS test p-value < 0.05).", details: { expectation_type: "expect_column_values_to_follow_benfords_law", kwargs: { column: "amount", p_value_threshold: 0.05 }, meta: { dimension: "distribution_drift" } } }
    ];

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

    // Observability tab switcher
    const obsTabBtns = document.querySelectorAll(".obs-tab-btn");
    const obsConsolePanel = document.getElementById("obs-console-panel");
    const obsQaPanel = document.getElementById("obs-qa-panel");

    obsTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            obsTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const targetTab = btn.getAttribute("data-tab");
            if (targetTab === "console") {
                if (obsConsolePanel) obsConsolePanel.style.display = "block";
                if (obsQaPanel) obsQaPanel.style.display = "none";
            } else {
                if (obsConsolePanel) obsConsolePanel.style.display = "none";
                if (obsQaPanel) obsQaPanel.style.display = "block";
            }
        });
    });

    // Populate Data QA report in UI
    function renderQaReport(isRunning) {
        const qaReport = document.getElementById("obs-qa-report");
        if (!qaReport) return;

        if (isRunning) {
            qaReport.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                    <span style="font-weight: 700; color: var(--text-primary);">Validation Status: <span style="color: var(--accent-amber);">VALIDATING... 🔄</span></span>
                    <span style="font-size: 0.72rem; color: var(--text-muted);">Executing Schema Checks</span>
                </div>
                <div style="text-align: center; padding: 2rem 0;">
                    <div class="spinner" style="margin: 0 auto 0.5rem auto; width: 25px; height: 25px;"></div>
                    <p style="font-size: 0.75rem; color: var(--text-muted);">Great Expectations validation context compiling...</p>
                </div>
            `;
            return;
        }

        let qaHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 0.5rem;">
                <span style="font-weight: 700; color: var(--text-primary);">Validation Status: <span style="color: var(--accent-emerald);">PASS ✅</span></span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">6/6 Expectations Succeeded</span>
            </div>
            <div class="qa-rules-list" style="display: flex; flex-direction: column; gap: 0.5rem;">
        `;
        
        qaReportData.forEach((rule, idx) => {
            const badgeClass = rule.status === "pass" ? "qa-badge-pass" : "qa-badge-warn";
            const badgeText = rule.status === "pass" ? "PASS" : "WARN";
            qaHtml += `
                <div class="qa-rule-item">
                    <div class="qa-rule-header">
                        <span class="qa-rule-name">${rule.name}</span>
                        <span class="qa-rule-badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="qa-rule-details" id="qa-details-${idx}" style="display: none;">
                        <div style="margin-bottom: 0.4rem; color: var(--text-secondary);">${rule.desc}</div>
                        <pre style="margin: 0; color: #a7f3d0; font-size: 0.7rem; overflow-x: auto;">${JSON.stringify(rule.details, null, 2)}</pre>
                    </div>
                </div>
            `;
        });
        
        qaHtml += `</div>`;
        qaReport.innerHTML = qaHtml;
    }

    const qaReport = document.getElementById("obs-qa-report");
    if (qaReport) {
        qaReport.addEventListener("click", (e) => {
            const header = e.target.closest(".qa-rule-header");
            if (header) {
                const item = header.closest(".qa-rule-item");
                const details = item.querySelector(".qa-rule-details");
                if (details) {
                    details.style.display = details.style.display === "none" ? "block" : "none";
                }
            }
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
            metricReliability.textContent = currentReliability; // Reset fix: keep established metrics
            metricRows.textContent = "0";
            metricDrift.textContent = "Checking...";
            metricDrift.style.color = "inherit";
            resetPipelineNodes();

            // Reset top-level header stats card
            const topReliabilityStat = Array.from(document.querySelectorAll(".stat-card")).find(card => {
                const label = card.querySelector(".stat-label");
                return label && label.textContent.includes("ETL Reliability");
            })?.querySelector(".stat-number");
            if (topReliabilityStat) {
                topReliabilityStat.textContent = currentReliability.includes("98.4") ? "98.4%+" : "98%+";
            }

            // Clear QA report state to trigger validation loader
            renderQaReport(true);

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
                    if (currentLogIndex === 5) {
                        // Ingest validation complete, populate QA Validation Report
                        renderQaReport(false);
                    }
                    if (currentLogIndex === 8) {
                        metricDrift.textContent = "Warning ⚠️";
                        metricDrift.style.color = "var(--accent-amber)";
                    }
                    if (currentLogIndex === 12) {
                        metricLatency.textContent = "1.45s";
                        currentReliability = "98.4%";
                        metricReliability.textContent = currentReliability;
                        metricDrift.textContent = "Stable";
                        metricDrift.style.color = "var(--accent-emerald)";
                        
                        // Also update the global stat counter in the header if it exists
                        const topReliabilityStat = Array.from(document.querySelectorAll(".stat-card")).find(card => {
                            const label = card.querySelector(".stat-label");
                            return label && label.textContent.includes("ETL Reliability");
                        })?.querySelector(".stat-number");
                        if (topReliabilityStat) {
                            topReliabilityStat.textContent = "98.4%+";
                        }
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

    // Pre-populate Observability Monitor with a successful run state on page load
    function prePopulateObservabilityMonitor() {
        if (!obsConsole || !metricLatency || !metricReliability || !metricRows || !metricDrift) return;
        
        // Populate Console with all logs
        obsConsole.innerHTML = "";
        obsSimLogs.forEach(log => {
            const logEl = document.createElement("div");
            logEl.className = `obs-log ${log.type}`;
            logEl.textContent = log.text;
            obsConsole.appendChild(logEl);
        });
        obsConsole.scrollTop = obsConsole.scrollHeight;

        // Populate QA Report
        renderQaReport(false);

        // Populate Metric Cards
        metricLatency.textContent = "1.45s";
        currentReliability = "98.4%";
        metricReliability.textContent = currentReliability;
        metricRows.textContent = "5,167";
        metricDrift.textContent = "Stable";
        metricDrift.style.color = "var(--accent-emerald)";

        // Activate nodes in diagram
        if (nodeIngest && nodeValidate && nodeScore && nodeCommit) {
            nodeIngest.className = "pipeline-node-item success";
            nodeValidate.className = "pipeline-node-item success";
            nodeScore.className = "pipeline-node-item warning"; // Warning on drift
            nodeCommit.className = "pipeline-node-item success";
        }
        if (pipelineProgress) pipelineProgress.style.width = "100%";
    }

    prePopulateObservabilityMonitor();

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
            raw: `SELECT \n  claim_id,\n  company_name,\n  tax_claimed_usd,\n  isolation_forest_anomaly_score AS anomaly_score,\n  CASE \n    WHEN isolation_forest_anomaly_score AS anomaly_score < 0 THEN 'HIGH RISK'\n    ELSE 'COMPLIANT'\n  END AS audit_status\nFROM tax_claims\nWHERE audit_status = 'HIGH RISK'\nORDER BY tax_claimed_usd DESC\nLIMIT 5;`,
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

    // ==========================================================================
    // 11. Resume Role Highlighting Filters Logic
    // ==========================================================================
    const resumeFilterBtns = document.querySelectorAll(".resume-filter-btn");
    const resumeBullets = document.querySelectorAll(".resume-bullet");

    resumeFilterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            resumeFilterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const selectedRole = btn.getAttribute("data-role");

            resumeBullets.forEach(bullet => {
                const bulletRole = bullet.getAttribute("data-role");
                bullet.classList.remove("highlighted-de", "highlighted-ds", "dimmed");

                if (selectedRole === "all") {
                    return;
                }

                if (bulletRole === selectedRole) {
                    bullet.classList.add(`highlighted-${selectedRole}`);
                } else {
                    bullet.classList.add("dimmed");
                }
            });
        });
    });

    // ==========================================================================
    // 12. Floating Resume AI Q&A Bot Widget (RAG Simulation)
    // ==========================================================================
    const chatLauncher = document.getElementById("chat-launcher");
    const chatContainer = document.getElementById("chat-container");
    const closeChatBtn = document.getElementById("close-chat-btn");
    const chatForm = document.getElementById("chat-form");
    const chatInput = document.getElementById("chat-input");
    const chatMessages = document.getElementById("chat-messages");
    const chatSuggestBtns = document.querySelectorAll(".chat-suggest-btn");

    if (chatLauncher && chatContainer) {
        chatLauncher.addEventListener("click", () => {
            chatContainer.classList.toggle("active");
            if (chatContainer.classList.contains("active")) {
                chatInput.focus();
            }
        });
    }

    if (closeChatBtn) {
        closeChatBtn.addEventListener("click", () => {
            chatContainer.classList.remove("active");
        });
    }

    const answers = {
        gpa: "Deshraj graduated from Arizona State University (ASU) with a perfect Master of Science in IT GPA of 4.0/4.0. He is committed to engineering clean, reliable, and mathematically sound production-grade systems.",
        python: "He leverages Python daily. His experience includes building end-to-end ETL pipelines, training Random Forest and Isolation Forest classifiers, and developing gesture recognition CNNs in TensorFlow/Keras.",
        asu: "He holds a Master of Science in Information Technology from Arizona State University (ASU), graduating in May 2024. His graduate curriculum specialized in cloud computing, data warehousing, and predictive modeling.",
        contact: "You can reach Deshraj directly via email at djogiya786@gmail.com or call him at (480) 876-2863. He is open to relocation and excited to discuss data/ML engineering roles.",
        cloud: "His cloud expertise includes automated ETL orchestrations in AWS Glue/S3, analytics modeling in Snowflake data warehouses, and Supabase client-server integrations.",
        experience: "He has over five years of data engineering and machine learning experience, spanning real-time data collection at Objectways Technologies, model optimization at Technoid LLC, and Snowflake schema modeling at Zifatech Solutions.",
        projects: "Deshraj has built several showcase projects: a FinTech risk command center, an automated daily market anomalies pipeline, and a retail customer segmentation pipeline. You can check them in the projects section!",
        observability: "He is highly proficient in data governance and observability. He configures Great Expectations validation pipelines to detect schema drift, and applies Kolmogorov-Smirnov (KS) tests to evaluate statistical feature drift.",
        skills: "Deshraj's technical skill set includes strong programming in Python and SQL; extensive work with tools and databases like PostgreSQL, Snowflake, AWS (Glue, S3), and Supabase; and expertise in data quality validation (Great Expectations) and machine learning (Scikit-Learn, TensorFlow)."
    };

    const searchKeyword = (msg) => {
        const query = msg.toLowerCase();
        if (query.includes("gpa") || query.includes("grade") || query.includes("scale") || query.includes("score")) return answers.gpa;
        if (query.includes("python") || query.includes("pandas") || query.includes("numpy") || query.includes("programming")) return answers.python;
        if (query.includes("skills") || query.includes("technical") || query.includes("tech stack") || query.includes("languages")) return answers.skills;
        if (query.includes("asu") || query.includes("education") || query.includes("degree") || query.includes("master")) return answers.asu;
        if (query.includes("contact") || query.includes("email") || query.includes("phone") || query.includes("reach") || query.includes("hire")) return answers.contact;
        if (query.includes("cloud") || query.includes("aws") || query.includes("snowflake") || query.includes("azure") || query.includes("supabase")) return answers.cloud;
        if (query.includes("experience") || query.includes("work") || query.includes("history") || query.includes("job") || query.includes("technoid") || query.includes("objectways")) return answers.experience;
        if (query.includes("project") || query.includes("repo") || query.includes("github")) return answers.projects;
        if (query.includes("drift") || query.includes("ks") || query.includes("observability") || query.includes("validation")) return answers.observability;
        
        return "That's a great question! While this simulation chatbot database is compact, you can find full details in Deshraj's projects grid or resume modal, or email him directly at djogiya786@gmail.com.";
    };

    const addMessage = (text, sender) => {
        const msgEl = document.createElement("div");
        msgEl.className = `chat-msg ${sender}-msg`;
        msgEl.textContent = text;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgEl;
    };

    const triggerBotResponse = (userQuery) => {
        // Add typing dots
        const typingEl = document.createElement("div");
        typingEl.className = "chat-msg bot-msg typing-msg";
        typingEl.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        setTimeout(() => {
            chatMessages.removeChild(typingEl);
            const answer = searchKeyword(userQuery);
            addMessage(answer, "bot");
        }, 800);
    };

    if (chatForm) {
        chatForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = chatInput.value.trim();
            if (!text) return;
            addMessage(text, "user");
            chatInput.value = "";
            triggerBotResponse(text);
        });
    }

    chatSuggestBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const question = btn.getAttribute("data-question");
            addMessage(question, "user");
            triggerBotResponse(question);
        });
    });

    // ==========================================================================
    // 13. Data Pipeline Architecture explorer
    // ==========================================================================
    const pipelineData = {
        batch: {
            nodes: [
                { 
                    id: "ingest", 
                    label: "Ingest", 
                    icon: "📥", 
                    tags: ["Python", "yFinance", "Pandas"], 
                    desc: "Fetches raw daily market pricing and transactional telemetry from finance APIs. Standardizes data columns and formats ISO timestamps.",
                    impact: "Replaces manual daily CSV downloading and aggregation workflows, saving 10+ hours of operational overhead weekly.",
                    inputs: "Yahoo Finance API",
                    process: "yFinance Ingestion",
                    outputs: "Raw Market CSV",
                    code: "import yfinance as yf\nimport pandas as pd\n\ndef ingest_daily_data(ticker='SPY'):\n    data = yf.download(ticker, period='1d', interval='1m')\n    df = pd.DataFrame(data)\n    df.reset_index(inplace=True)\n    df.rename(columns={'Datetime': 'timestamp'}, inplace=True)\n    return df" 
                },
                { 
                    id: "validate", 
                    label: "Validate", 
                    icon: "🛡️", 
                    tags: ["Great Expectations", "Python"], 
                    desc: "Runs automated schema validations, verifying column types, non-null primary keys, and data boundaries.",
                    impact: "Acts as a gatekeeper, preventing corrupt or malformed transaction data from breaking downstream metrics and business databases.",
                    inputs: "Raw Ingested CSV",
                    process: "Great Expectations",
                    outputs: "Valid Data Stream",
                    code: "import great_expectations as ge\n\ndef validate_schema(df):\n    ge_df = ge.from_pandas(df)\n    result = ge_df.expect_column_values_to_not_be_null('timestamp')\n    assert result['success']\n    result = ge_df.expect_column_values_to_be_between('Close', min_value=0)\n    return result['success']" 
                },
                { 
                    id: "model", 
                    label: "Model", 
                    icon: "🧠", 
                    tags: ["Scikit-Learn", "Isolation Forest"], 
                    desc: "Applies unsupervised Isolation Forest anomaly scoring and statistical checks to evaluate data outliers.",
                    impact: "Enables proactive threat and anomaly detection, immediately flagging compliance and auditing risks for human review.",
                    inputs: "Valid Data Stream",
                    process: "Isolation Forest",
                    outputs: "Anomaly Flags",
                    code: "from sklearn.ensemble import IsolationForest\n\ndef detect_anomalies(df, contamination=0.04):\n    model = IsolationForest(contamination=contamination, random_state=42)\n    df['anomaly_score'] = model.fit_predict(df[['Close', 'Volume']])\n    return df" 
                },
                { 
                    id: "warehouse", 
                    label: "Warehouse", 
                    icon: "❄️", 
                    tags: ["Snowflake", "SQL", "Star Schema"], 
                    desc: "Pipes cleaned data into persistent Snowflake data warehouse dimensions and fact tables.",
                    impact: "Centralizes organizational records into structured Star Schemas, enabling 15x faster analytic queries for business teams.",
                    inputs: "Flagged anomalies",
                    process: "Snowflake Schema",
                    outputs: "Analytical Tables",
                    code: "INSERT INTO fact_market_sales (timestamp, close_price, volume, anomaly_flag)\nSELECT \n  timestamp, \n  close_price, \n  volume, \n  CASE WHEN anomaly_score < 0 THEN 1 ELSE 0 END\nFROM stg_market_data;" 
                },
                { 
                    id: "bi", 
                    label: "BI Dashboard", 
                    icon: "📊", 
                    tags: ["Power BI", "DAX"], 
                    desc: "Materializes metrics into live Power BI dashboards to track performance trends and KPI aggregates.",
                    impact: "Gives executives real-time visibility into business performance and active alerts, enabling fast data-driven decisions.",
                    inputs: "Analytical Tables",
                    process: "DAX KPI Measures",
                    outputs: "Power BI Report",
                    code: "Average Close = AVERAGE(fact_market_sales[close_price])\nAnomaly Count = CALCULATE(COUNTROWS(fact_market_sales), fact_market_sales[anomaly_flag] = 1)" 
                }
            ]
        },
        stream: {
            nodes: [
                { 
                    id: "ingest", 
                    label: "IoT Ingest", 
                    icon: "📟", 
                    tags: ["MQTT", "HTTP", "FastAPI"], 
                    desc: "Receives high-frequency sensor readings (vibration, heat, voltage) in real-time from fleet battery systems.",
                    impact: "Ingests continuous device data from 5,000+ devices concurrently with sub-second ingestion latency.",
                    inputs: "IoT Telemetry Streams",
                    process: "MQTT Broker Ingest",
                    outputs: "Kafka Event Buffer",
                    code: "@app.post('/api/telemetry')\nasync def ingest_stream(reading: TelemetryReading):\n    await stream_buffer.append(reading)\n    return {'status': 'buffered'}" 
                },
                { 
                    id: "validate", 
                    label: "Validation", 
                    icon: "🛡️", 
                    tags: ["Python", "Z-Score"], 
                    desc: "Performs rolling Z-score checks on micro-batches to detect immediate sensor hardware failures.",
                    impact: "Filters out high-frequency sensor noise and hardware errors before they corrupt predictive modeling algorithms.",
                    inputs: "Kafka Event Buffer",
                    process: "Rolling Z-Score QA",
                    outputs: "Validated Signals",
                    code: "def rolling_zscore_check(window, current_val):\n    mean = sum(window) / len(window)\n    std = (sum((x - mean)**2 for x in window) / len(window))**0.5\n    z = (current_val - mean) / (std + 1e-6)\n    return abs(z) < 3.0" 
                },
                { 
                    id: "model", 
                    label: "RUL Estimator", 
                    icon: "🧠", 
                    tags: ["Scikit-Learn", "Regression"], 
                    desc: "Applies an exponential health decay model to forecast the fleet component's Remaining Useful Life (RUL).",
                    impact: "Enables predictive maintenance schedules, reducing fleet breakdown rates by 15% and saving repair costs.",
                    inputs: "Validated Signals",
                    process: "RUL Regression Model",
                    outputs: "Failure Projections",
                    code: "import numpy as np\n\ndef estimate_rul(vibration_history):\n    decay_fit = np.polyfit(np.arange(len(vibration_history)), np.log(vibration_history), 1)\n    projected_fail_step = (np.log(MAX_LIMIT) - decay_fit[1]) / decay_fit[0]\n    return max(0, projected_fail_step - len(vibration_history))" 
                },
                { 
                    id: "alert", 
                    label: "Alert Hook", 
                    icon: "🚨", 
                    tags: ["Webhooks", "FastAPI"], 
                    desc: "Triggers notifications to maintenance teams if RUL drops below critical safety threshold levels.",
                    impact: "Automates incident management by alerting mechanics in real time, preventing active on-road failures.",
                    inputs: "Failure Projections",
                    process: "FastAPI Alert Router",
                    outputs: "PagerDuty Alerts",
                    code: "async def trigger_maintenance_alert(device_id, rul_hours):\n    payload = {'device_id': device_id, 'alert': 'CRITICAL', 'rul_remaining': rul_hours}\n    async with httpx.AsyncClient() as client:\n        await client.post('https://pagerduty.com/trigger', json=payload)" 
                }
            ]
        },
        geospatial: {
            nodes: [
                { 
                    id: "ingest", 
                    label: "Spatial Ingest", 
                    icon: "🌎", 
                    tags: ["Python", "Geopandas", "Shapefiles"], 
                    desc: "Loads multi-state daily land cover shapefiles and raster coordinates, aligning coordinate reference systems (CRS).",
                    impact: "Aggregates complex geographic and environmental shape coordinates from separate state databases into a single system.",
                    inputs: "Multi-State GeoJSONs",
                    process: "CRS Realignment",
                    outputs: "Clean GeoDataFrames",
                    code: "import geopandas as gpd\n\ndef load_geojson(path):\n    gdf = gpd.read_file(path)\n    gdf = gdf.to_crs(epsg=4326)\n    return gdf" 
                },
                { 
                    id: "validate", 
                    label: "Carbon Engine", 
                    icon: "🍃", 
                    tags: ["Python", "Pandas"], 
                    desc: "Calculates net carbon emissions based on land cover type changes (forest loss vs. urban expansion).",
                    impact: "Measures and audits net regional carbon offset changes, ensuring compliance with EPA state standards.",
                    inputs: "Clean GeoDataFrames",
                    process: "Carbon Offset Engine",
                    outputs: "CO2 Delta Matrices",
                    code: "def calculate_emissions(gdf):\n    # Forest: -3.5 tons/ha, Urban: +2.1 tons/ha\n    gdf['co2_delta'] = gdf['area_ha'] * gdf['land_type'].map({\n        'Forest': -3.5,\n        'Urban': 2.1,\n        'Agriculture': 0.8\n    })\n    return gdf" 
                },
                { 
                    id: "model", 
                    label: "ML Forecast", 
                    icon: "🧠", 
                    tags: ["Random Forest", "Scikit-Learn"], 
                    desc: "Fits Linear Regression and Random Forest models to forecast CO2 trend lines.",
                    impact: "Predicts future carbon trends to optimize forestry projects and plan emissions offset targets.",
                    inputs: "CO2 Delta Matrices",
                    process: "Random Forest Regressor",
                    outputs: "Decade Trend Curves",
                    code: "from sklearn.ensemble import RandomForestRegressor\n\ndef train_emissions_forecaster(X, y):\n    model = RandomForestRegressor(n_estimators=100, random_state=42)\n    model.fit(X, y)\n    return model" 
                },
                { 
                    id: "warehouse", 
                    label: "DB Storage", 
                    icon: "💾", 
                    tags: ["SQLite", "SQL"], 
                    desc: "Saves regional emissions inventory records to SQLite index database.",
                    impact: "Ensures audited carbon records are permanently saved and indexed for audit verification and search queries.",
                    inputs: "Decade Trend Curves",
                    process: "SQLite Schema Mapping",
                    outputs: "Historical Database",
                    code: "CREATE TABLE land_changes (\n  state TEXT,\n  from_type TEXT,\n  to_type TEXT,\n  area_changed REAL,\n  change_date DATE\n);" 
                },
                { 
                    id: "commit", 
                    label: "Git Pages Commit", 
                    icon: "🐙", 
                    tags: ["GitHub Actions", "Git"], 
                    desc: "Commits updated visitor stats and model prediction plots daily, updating GitHub Pages contributions.",
                    impact: "Automates public reporting by automatically committing fresh analytics files to public pages every 24 hours.",
                    inputs: "Historical Database",
                    process: "Automated Git Runner",
                    outputs: "GitHub Pages Site",
                    code: "# git command line runner\nimport subprocess\n\ndef push_changes():\n    subprocess.run(['git', 'add', '.'])\n    subprocess.run(['git', 'commit', '-m', 'daily update'])\n    subprocess.run(['git', 'push', 'origin', 'main'])" 
                }
            ]
        }
    };

    const archTabBtns = document.querySelectorAll(".arch-tab-btn");
    const archFlowDiagram = document.getElementById("arch-flow-diagram");
    const nodeNameEl = document.getElementById("arch-node-name");
    const nodeTagsEl = document.getElementById("arch-node-tags");
    const nodeDescEl = document.getElementById("arch-node-desc");
    const nodeImpactEl = document.getElementById("arch-node-impact");
    const toggleCodeBtn = document.getElementById("arch-toggle-code-btn");
    const codeBox = document.getElementById("arch-code-box");
    const codeContentEl = document.getElementById("arch-code-content");

    // Input-Process-Output Flow Box selectors
    const flowBox = document.getElementById("arch-node-flow-box");
    const flowInput = document.getElementById("arch-flow-input");
    const flowProcess = document.getElementById("arch-flow-process");
    const flowOutput = document.getElementById("arch-flow-output");
    const tourBtn = document.getElementById("arch-tour-btn");

    let tourInterval = null;
    let isPlayingTour = false;

    function renderPipelineFlow(pipelineType) {
        if (!archFlowDiagram) return;
        const pipeline = pipelineData[pipelineType];
        archFlowDiagram.innerHTML = "";

        pipeline.nodes.forEach((node, idx) => {
            // Node element
            const nodeEl = document.createElement("div");
            nodeEl.className = "arch-node-item" + (idx === 0 ? " active" : "");
            nodeEl.setAttribute("data-node-id", node.id);
            nodeEl.innerHTML = `
                <div class="arch-node-circle">${node.icon}</div>
                <div class="arch-node-lbl">${node.label}</div>
            `;
            archFlowDiagram.appendChild(nodeEl);

            // Connector (except last item)
            if (idx < pipeline.nodes.length - 1) {
                const connEl = document.createElement("div");
                connEl.className = "arch-connector active";
                archFlowDiagram.appendChild(connEl);
            }
        });

        // Set default node data
        showNodeDetails(pipeline.nodes[0]);
    }

    function showNodeDetails(node) {
        if (!nodeNameEl) return;
        nodeNameEl.textContent = `${node.icon} ${node.label} Stage`;
        nodeTagsEl.innerHTML = "";
        node.tags.forEach(t => {
            const span = document.createElement("span");
            span.className = "badge";
            span.style.background = "rgba(99, 102, 241, 0.1)";
            span.style.border = "1px solid rgba(99, 102, 241, 0.2)";
            span.style.color = "var(--accent-blue)";
            span.style.fontSize = "0.7rem";
            span.style.padding = "0.2rem 0.5rem";
            span.style.borderRadius = "4px";
            span.textContent = t;
            nodeTagsEl.appendChild(span);
        });
        nodeDescEl.innerHTML = "<strong>Technical Function:</strong> " + node.desc;
        
        if (nodeImpactEl) {
            nodeImpactEl.innerHTML = "<strong>Business Value:</strong> " + node.impact;
            nodeImpactEl.style.display = "block";
        }
        
        if (flowBox && flowInput && flowProcess && flowOutput) {
            flowInput.textContent = node.inputs || "-";
            flowProcess.textContent = node.process || "-";
            flowOutput.textContent = node.outputs || "-";
            flowBox.style.display = "grid";
        }

        if (toggleCodeBtn) {
            toggleCodeBtn.style.display = "block";
            toggleCodeBtn.textContent = "View Technical Code Snippet 🛠️";
        }
        if (codeBox && codeContentEl) {
            codeContentEl.textContent = node.code;
            codeBox.style.display = "none";
        }
    }

    function playPipelineTour() {
        if (isPlayingTour) return;
        isPlayingTour = true;
        if (tourBtn) {
            tourBtn.innerHTML = "Stop Tour ⏹️";
            tourBtn.style.background = "rgba(239, 68, 68, 0.1)";
            tourBtn.style.borderColor = "rgba(239, 68, 68, 0.25)";
            tourBtn.style.color = "var(--accent-red, #ef4444)";
        }

        const activeTab = document.querySelector(".arch-tab-btn.active");
        if (!activeTab) return;
        const pipelineType = activeTab.getAttribute("data-pipeline");
        const nodes = pipelineData[pipelineType].nodes;

        const activeNodeEl = archFlowDiagram.querySelector(".arch-node-item.active");
        let currentIndex = 0;
        if (activeNodeEl) {
            const nodeId = activeNodeEl.getAttribute("data-node-id");
            currentIndex = nodes.findIndex(n => n.id === nodeId);
        }

        tourInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % nodes.length;
            const nextNode = nodes[currentIndex];

            const nodeEls = archFlowDiagram.querySelectorAll(".arch-node-item");
            nodeEls.forEach(el => {
                if (el.getAttribute("data-node-id") === nextNode.id) {
                    el.classList.add("active");
                } else {
                    el.classList.remove("active");
                }
            });

            showNodeDetails(nextNode);
        }, 3000);
    }

    function stopPipelineTour() {
        if (!isPlayingTour) return;
        isPlayingTour = false;
        if (tourInterval) {
            clearInterval(tourInterval);
            tourInterval = null;
        }
        if (tourBtn) {
            tourBtn.innerHTML = "Play Tour ⏯️";
            tourBtn.style.background = "rgba(16, 185, 129, 0.1)";
            tourBtn.style.borderColor = "rgba(16, 185, 129, 0.25)";
            tourBtn.style.color = "var(--accent-emerald)";
        }
    }

    if (tourBtn) {
        tourBtn.addEventListener("click", () => {
            if (isPlayingTour) {
                stopPipelineTour();
            } else {
                playPipelineTour();
            }
        });
    }

    if (archFlowDiagram) {
        archFlowDiagram.addEventListener("click", (e) => {
            const nodeItem = e.target.closest(".arch-node-item");
            if (nodeItem) {
                stopPipelineTour();
                // Remove active class
                archFlowDiagram.querySelectorAll(".arch-node-item").forEach(n => n.classList.remove("active"));
                nodeItem.classList.add("active");

                const activePipeline = document.querySelector(".arch-tab-btn.active").getAttribute("data-pipeline");
                const nodeId = nodeItem.getAttribute("data-node-id");
                const node = pipelineData[activePipeline].nodes.find(n => n.id === nodeId);
                if (node) {
                    showNodeDetails(node);
                }
            }
        });
    }

    if (toggleCodeBtn) {
        toggleCodeBtn.addEventListener("click", () => {
            if (codeBox.style.display === "none") {
                codeBox.style.display = "block";
                toggleCodeBtn.textContent = "Hide Technical Code Snippet 🙈";
            } else {
                codeBox.style.display = "none";
                toggleCodeBtn.textContent = "View Technical Code Snippet 🛠️";
            }
        });
    }

    archTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            stopPipelineTour();
            archTabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const pipelineType = btn.getAttribute("data-pipeline");
            renderPipelineFlow(pipelineType);
        });
    });

    // Initialize default pipeline flow
    renderPipelineFlow("batch");

    // ==========================================================================
    // 14. Interactive ML Evaluation Metrics & SVG Tracker Curves
    // ==========================================================================
    const mlTabBtns = document.querySelectorAll(".ml-tab-btn");
    const mlForecastPanel = document.getElementById("ml-forecast-panel");
    const mlCohortsPanel = document.getElementById("ml-cohorts-panel");
    const mlMetricsPanel = document.getElementById("ml-metrics-panel");

    mlTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            mlTabBtns.forEach(b => {
                b.classList.remove("active");
                b.style.background = "rgba(255,255,255,0.04)";
                b.style.color = "var(--text-secondary)";
                b.style.border = "1px solid rgba(255,255,255,0.1)";
            });
            btn.classList.add("active");
            btn.style.background = "var(--grad-primary)";
            btn.style.color = "#fff";
            btn.style.border = "none";

            const targetTab = btn.getAttribute("data-ml-tab");
            if (targetTab === "forecast") {
                if (mlForecastPanel) mlForecastPanel.style.display = "block";
                if (mlCohortsPanel) mlCohortsPanel.style.display = "none";
                if (mlMetricsPanel) mlMetricsPanel.style.display = "none";
            } else if (targetTab === "cohorts") {
                if (mlForecastPanel) mlForecastPanel.style.display = "none";
                if (mlCohortsPanel) mlCohortsPanel.style.display = "block";
                if (mlMetricsPanel) mlMetricsPanel.style.display = "none";
            } else {
                if (mlForecastPanel) mlForecastPanel.style.display = "none";
                if (mlCohortsPanel) mlCohortsPanel.style.display = "none";
                if (mlMetricsPanel) mlMetricsPanel.style.display = "block";
                // Trigger curve tracker dot alignment on first display
                updateClassifierSimulator();
            }
        });
    });

    const modelSelect = document.getElementById("ml-model-select");
    const thresholdSlider = document.getElementById("threshold-slider");
    const thresholdVal = document.getElementById("threshold-val");
    const precisionVal = document.getElementById("metric-precision");
    const recallVal = document.getElementById("metric-recall");
    const f1Val = document.getElementById("metric-f1");
    const cellTP = document.getElementById("cell-tp");
    const cellFP = document.getElementById("cell-fp");
    const cellFN = document.getElementById("cell-fn");
    const cellTN = document.getElementById("cell-tn");
    const businessTitle = document.getElementById("ml-business-title");
    const businessDesc = document.getElementById("ml-business-desc");
    const rocDot = document.getElementById("roc-dot");
    const prDot = document.getElementById("pr-dot");

    function updateClassifierSimulator() {
        if (!thresholdSlider) return;
        const t = parseFloat(thresholdSlider.value);
        if (thresholdVal) thresholdVal.textContent = t.toFixed(2);

        const model = modelSelect ? modelSelect.value : "credit";

        let tp, fp, fn, tn, totalPos, totalNeg;

        if (model === "credit") {
            totalPos = 200;
            totalNeg = 800;
            // Mathematical approximations modeling typical Classifier curves
            tp = Math.round(totalPos * Math.pow(1 - t, 0.35));
            fp = Math.round(totalNeg * Math.pow(1 - t, 2.2));
            fn = totalPos - tp;
            tn = totalNeg - fp;
        } else {
            totalPos = 150;
            totalNeg = 850;
            tp = Math.round(totalPos * Math.pow(1 - t, 0.5));
            fp = Math.round(totalNeg * Math.pow(1 - t, 1.6));
            fn = totalPos - tp;
            tn = totalNeg - fp;
        }

        // Confusion matrix values
        if (cellTP) cellTP.textContent = tp;
        if (cellFP) cellFP.textContent = fp;
        if (cellFN) cellFN.textContent = fn;
        if (cellTN) cellTN.textContent = tn;

        // Metrics calculations
        const precision = tp / (tp + fp + 1e-5);
        const recall = tp / totalPos;
        const f1 = 2 * precision * recall / (precision + recall + 1e-5);

        if (precisionVal) precisionVal.textContent = (precision * 100).toFixed(1) + "%";
        if (recallVal) recallVal.textContent = (recall * 100).toFixed(1) + "%";
        if (f1Val) f1Val.textContent = (f1 * 100).toFixed(1) + "%";

        // Align dot trackers on SVGs
        const fpr = fp / totalNeg;
        const tpr = recall;

        if (rocDot) {
            // SVG coordinate scaling (viewbox 0 0 100 100)
            const cx = fpr * 100;
            const cy = 100 - (tpr * 100);
            rocDot.setAttribute("cx", cx.toFixed(1));
            rocDot.setAttribute("cy", cy.toFixed(1));
        }

        if (prDot) {
            const cx = recall * 100;
            const cy = 100 - (precision * 100);
            prDot.setAttribute("cx", cx.toFixed(1));
            prDot.setAttribute("cy", cy.toFixed(1));
        }

        // Contextual business text
        if (businessTitle && businessDesc) {
            if (model === "credit") {
                if (t < 0.30) {
                    businessTitle.textContent = `⚠️ High Recall / Low Precision Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "The model flags almost all potential fraud transactions. This prevents default loss, but generates many false alarms (blocking 90% of genuine users) and causes substantial user frustration.";
                } else if (t > 0.70) {
                    businessTitle.textContent = `⚠️ High Precision / Low Recall Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "The model only flags fraud when it is 100% certain. Genuine users experience zero friction, but the bank misses 80% of actual fraud cases, leading to massive default losses.";
                } else {
                    businessTitle.textContent = `✅ Optimal Balanced Decisioning Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-emerald)";
                    businessDesc.textContent = "Optimal F1-Score trade-off. Captures ~85% of fraudulent loan attempts while ensuring a smooth, frictionless approval experience for 98% of creditworthy customers.";
                }
            } else {
                if (t < 0.35) {
                    businessTitle.textContent = `⚠️ High Recall / Low Precision Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags almost all tax claims for auditing. Secures compliance safety, but creates massive administrative backlogs for audit analysts who must verify compliant returns manually.";
                } else if (t > 0.65) {
                    businessTitle.textContent = `⚠️ High Precision / Low Recall Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags only extreme outlier tax claims. Keeps audit overhead low, but misses millions of dollars in fraudulent deductions and non-compliant claims.";
                } else {
                    businessTitle.textContent = `✅ Optimal Balanced Compliance Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-emerald)";
                    businessDesc.textContent = "Balanced compliance engine. Captures ~82% of high-risk claims while keeping audit verification backlogs manageable for internal reviewers.";
                }
            }
        }
    }

    if (thresholdSlider) {
        thresholdSlider.addEventListener("input", updateClassifierSimulator);
    }
    if (modelSelect) {
        modelSelect.addEventListener("change", updateClassifierSimulator);
    }
});
