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
                if (forecastEl) forecastEl.textContent = stats.forecasted_next_week || "...";

                if (todayEl) {
                    const baseActive = stats.active_today || 12;
                    todayEl.textContent = baseActive;
                    
                    if (window.activeUserInterval) clearInterval(window.activeUserInterval);
                    
                    window.activeUserInterval = setInterval(() => {
                        const hour = new Date().getHours();
                        let timeModifier = 0;
                        if (hour >= 9 && hour <= 17) {
                            timeModifier = 2; // peak hours
                        } else if (hour >= 23 || hour <= 5) {
                            timeModifier = -3; // night drop
                        }
                        const currentActive = Math.max(3, baseActive + timeModifier + Math.floor(Math.random() * 5) - 2);
                        todayEl.textContent = currentActive;
                    }, 8000);
                }

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
            const payload = {
                name: formData.get("name"),
                email: formData.get("email"),
                message: formData.get("message")
            };
            
            const submitUrl = `${SUPABASE_URL}/functions/v1/submit-contact`;

            fetch(submitUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY
                },
                body: JSON.stringify(payload)
            })
            .then(async (response) => {
                let json = await response.json();
                if (response.ok) {
                    formResult.textContent = "Message sent successfully! 🚀";
                    formResult.className = "form-result-text success";
                    contactForm.reset();
                } else {
                    formResult.textContent = json.error || "Something went wrong.";
                    formResult.className = "form-result-text error";
                }
            })
            .catch(error => {
                console.error("Submission error:", error);
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
        { name: "expect_column_values_to_follow_benfords_law(\"amount\")", status: "warn", desc: "Checks first-digit distribution against Benford's Law. A warning (KS p-value < 0.05) indicates mild statistical anomaly in transaction amounts (feature drift). This is non-blocking and flagged for review, while the schema remains fully valid.", details: { expectation_type: "expect_column_values_to_follow_benfords_law", kwargs: { column: "amount", p_value_threshold: 0.05 }, meta: { dimension: "distribution_drift" } } }
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
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--border-radius-sm); padding: 0.6rem; font-size: 0.75rem; color: #f59e0b; margin-bottom: 0.75rem; line-height: 1.4;">
                ⚠️ <strong>Non-blocking Warning on Benford's Law:</strong> This check detects mild transaction distribution drift. The schema is 100% valid and the pipeline passed, but this warning is logged for analytics auditing.
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

            // Reset reliability card indicators
            const driftDot = document.getElementById("reliability-drift-dot");
            if (driftDot) {
                driftDot.style.background = "var(--accent-emerald)";
            }
            const reliabilitySub = document.getElementById("metric-reliability-sub");
            if (reliabilitySub) {
                reliabilitySub.textContent = "Running live SLA check...";
            }

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
                        
                        const driftDot = document.getElementById("reliability-drift-dot");
                        if (driftDot) {
                            driftDot.style.background = "var(--accent-amber)";
                        }
                        const reliabilitySub = document.getElementById("metric-reliability-sub");
                        if (reliabilitySub) {
                            reliabilitySub.textContent = "Anomaly detected (Non-blocking)";
                        }
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
                        
                        const driftDot = document.getElementById("reliability-drift-dot");
                        if (driftDot) {
                            driftDot.style.background = "var(--accent-emerald)";
                        }
                        const reliabilitySub = document.getElementById("metric-reliability-sub");
                        if (reliabilitySub) {
                            reliabilitySub.textContent = "59/60 Daily Runs Successful";
                        }
                        
                        // Set the Model/Score node back to success/green since system is stable
                        if (nodeScore) {
                            nodeScore.classList.remove("warning");
                            nodeScore.classList.add("success");
                        }
                        
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

        const driftDot = document.getElementById("reliability-drift-dot");
        if (driftDot) {
            driftDot.style.background = "var(--accent-emerald)";
        }
        const reliabilitySub = document.getElementById("metric-reliability-sub");
        if (reliabilitySub) {
            reliabilitySub.textContent = "59/60 Daily Runs Successful";
        }

        // Activate nodes in diagram
        if (nodeIngest && nodeValidate && nodeScore && nodeCommit) {
            nodeIngest.className = "pipeline-node-item success";
            nodeValidate.className = "pipeline-node-item success";
            nodeScore.className = "pipeline-node-item success"; // Stable green on load
            nodeCommit.className = "pipeline-node-item success";
        }
        if (pipelineProgress) pipelineProgress.style.width = "100%";
    }

    // prePopulateObservabilityMonitor();

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

    let sqlChart = null;

    function renderSqlChart(selected, query) {
        const chartContainer = document.getElementById("sql-chart-container");
        const canvas = document.getElementById("sql-results-chart");
        if (!chartContainer || !canvas) return;

        if (sqlChart) {
            sqlChart.destroy();
            sqlChart = null;
        }

        chartContainer.style.display = "flex";
        chartContainer.style.opacity = "0";
        // Trigger reflow for animation
        chartContainer.offsetHeight;
        chartContainer.style.transition = "opacity 0.4s ease";
        chartContainer.style.opacity = "1";

        const labels = [];
        const chartData = [];
        let chartType = "bar";
        let chartLabel = "Metric";
        let bgColors = [];
        let borderColors = [];

        const purpleGrad = "rgba(139, 92, 246, 0.75)";
        const purpleBorder = "rgba(139, 92, 246, 1)";
        const emeraldGrad = "rgba(16, 185, 129, 0.75)";
        const emeraldBorder = "rgba(16, 185, 129, 1)";
        const amberGrad = "rgba(245, 158, 11, 0.75)";
        const amberBorder = "rgba(245, 158, 11, 1)";
        const roseGrad = "rgba(239, 68, 68, 0.75)";
        const roseBorder = "rgba(239, 68, 68, 1)";
        const blueGrad = "rgba(59, 130, 246, 0.75)";
        const blueBorder = "rgba(59, 130, 246, 1)";

        if (selected === "revenue_by_segment") {
            chartType = "pie";
            chartLabel = "Revenue ($)";
            query.data.forEach(row => {
                labels.push(row[0]);
                const val = parseFloat(row[3].replace(/[$,]/g, ""));
                chartData.push(val);
            });
            bgColors = ["rgba(139, 92, 246, 0.7)", "rgba(59, 130, 246, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(100, 116, 139, 0.7)"];
            borderColors = ["#8b5cf6", "#3b82f6", "#f59e0b", "#64748b"];
        } else if (selected === "anomaly_risk_claims") {
            chartType = "bar";
            chartLabel = "Tax Claimed ($)";
            query.data.forEach(row => {
                labels.push(`${row[0]} (${row[1].substring(0, 10)}...)`);
                const val = parseFloat(row[2].replace(/[$,]/g, ""));
                chartData.push(val);
            });
            bgColors = Array(query.data.length).fill(roseGrad);
            borderColors = Array(query.data.length).fill(roseBorder);
        } else if (selected === "survival_by_treatment") {
            chartType = "bar";
            chartLabel = "Mean Survival (Days)";
            query.data.forEach(row => {
                labels.push(row[0].split(" Arm")[0]);
                const val = parseFloat(row[2].replace(" days", ""));
                chartData.push(val);
            });
            bgColors = [purpleGrad, blueGrad, "rgba(100, 116, 139, 0.7)"];
            borderColors = [purpleBorder, blueBorder, "#64748b"];
        } else if (selected === "drift_by_feature") {
            chartType = "bar";
            chartLabel = "KS-Statistic";
            query.data.forEach(row => {
                labels.push(row[0].substring(0, 15));
                const val = parseFloat(row[1]);
                chartData.push(val);
                if (row[3] === "DRIFT DETECTED") {
                    bgColors.push(roseGrad);
                    borderColors.push(roseBorder);
                } else {
                    bgColors.push(emeraldGrad);
                    borderColors.push(emeraldBorder);
                }
            });
        } else if (selected === "emissions_by_state") {
            chartType = "bar";
            chartLabel = "Net CO2 (Tons)";
            query.data.forEach(row => {
                labels.push(row[0].split(" (")[0]);
                const val = parseFloat(row[3].replace(/[+]/g, ""));
                chartData.push(val);
                if (val < 0) {
                    bgColors.push(emeraldGrad);
                    borderColors.push(emeraldBorder);
                } else {
                    bgColors.push(roseGrad);
                    borderColors.push(roseBorder);
                }
            });
        } else if (selected === "credit_fraud_risk") {
            chartType = "doughnut";
            chartLabel = "Applications";
            query.data.forEach(row => {
                labels.push(row[0].split(" (")[0]);
                chartData.push(parseInt(row[1]));
            });
            bgColors = ["rgba(16, 185, 129, 0.7)", "rgba(59, 130, 246, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(239, 68, 68, 0.7)"];
            borderColors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];
        } else if (selected === "iot_telematics") {
            chartType = "bar";
            chartLabel = "Anomaly Alerts";
            query.data.forEach(row => {
                labels.push(row[0]);
                chartData.push(parseInt(row[3]));
            });
            bgColors = [roseGrad, amberGrad, "rgba(100, 116, 139, 0.7)"];
            borderColors = [roseBorder, amberBorder, "#64748b"];
        } else if (selected === "simulated_sales_forecast") {
            chartType = "bar";
            chartLabel = "Total Units Sold";
            query.data.forEach(row => {
                labels.push(row[0]);
                chartData.push(parseInt(row[1].replace(/,/g, "")));
            });
            bgColors = Array(query.data.length).fill(blueGrad);
            borderColors = Array(query.data.length).fill(blueBorder);
        }

        const isDark = !document.body.classList.contains("light-theme");
        const textColor = isDark ? "#cbd5e1" : "#1e293b";
        const gridColor = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.08)";

        const config = {
            type: chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: chartLabel,
                    data: chartData,
                    backgroundColor: bgColors,
                    borderColor: borderColors,
                    borderWidth: 1.5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: chartType === "pie" || chartType === "doughnut",
                        position: "bottom",
                        labels: {
                            color: textColor,
                            boxWidth: 10,
                            font: { size: 10, family: "Inter, sans-serif" }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? "#1e293b" : "#ffffff",
                        titleColor: isDark ? "#ffffff" : "#0f172a",
                        bodyColor: isDark ? "#cbd5e1" : "#334155",
                        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                        borderWidth: 1,
                        cornerRadius: 6
                    }
                },
                scales: chartType === "pie" || chartType === "doughnut" ? {} : {
                    x: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { size: 9, family: "Inter, sans-serif" } }
                    },
                    y: {
                        grid: { color: gridColor },
                        ticks: { color: textColor, font: { size: 9, family: "Inter, sans-serif" } }
                    }
                }
            }
        };

        sqlChart = new Chart(canvas.getContext("2d"), config);
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

            const chartContainer = document.getElementById("sql-chart-container");
            if (chartContainer) {
                chartContainer.style.display = "none";
            }

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

                // Render matching chart
                renderSqlChart(selected, query);
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
                bullet.classList.remove("highlighted-de", "highlighted-ds", "highlighted-sde", "dimmed");

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

    // ==========================================================================
    // 12b. Floating Live Visitor Analytics Widget Toggle
    // ==========================================================================
    const visitorLauncher = document.getElementById("visitor-launcher");
    const visitorContainer = document.getElementById("visitor-container");
    const closeVisitorBtn = document.getElementById("close-visitor-btn");

    if (visitorLauncher && visitorContainer) {
        visitorLauncher.addEventListener("click", () => {
            visitorContainer.classList.toggle("active");
        });
    }

    if (closeVisitorBtn && visitorContainer) {
        closeVisitorBtn.addEventListener("click", () => {
            visitorContainer.classList.remove("active");
        });
    }

    // Responsive DOM Portal for Visitor Analytics Widget (Mobile Flow Insertion)
    const handleVisitorResponsiveLayout = () => {
        const container = document.getElementById("visitor-container");
        const desktopParent = document.getElementById("visitor-analytics-widget");
        const mobileParent = document.getElementById("mobile-visitor-section");
        
        if (!container || !desktopParent || !mobileParent) return;
        
        if (window.innerWidth < 992) {
            if (container.parentElement !== mobileParent) {
                mobileParent.appendChild(container);
            }
        } else {
            if (container.parentElement !== desktopParent) {
                desktopParent.appendChild(container);
            }
        }
    };
    
    handleVisitorResponsiveLayout();
    window.addEventListener("resize", handleVisitorResponsiveLayout);

    const answers = {
        gpa: "Deshraj earned a perfect 4.0/4.0 GPA during his Master of Science in IT at Arizona State University. He specialized in cloud data engineering, distributed systems, and predictive model governance.",
        python: "Python is Deshraj's primary stack for building asynchronous data pipelines, running Great Expectations quality QA, and training machine learning models (Random Forest, XGBoost, CNNs) using Scikit-Learn and TensorFlow.",
        asu: "Deshraj completed his Master of Science in IT at Arizona State University with a perfect 4.0/4.0 GPA, specializing in cloud data architectures, streaming ingestion, and predictive modeling.",
        contact: "You can reach Deshraj directly via email at djogiya786@gmail.com. He is actively interviewing for Data Engineering, Machine Learning Engineering, and Cloud Data Architecture roles.",
        cloud: "Deshraj builds secure, high-throughput cloud architectures using AWS (Glue ETL, S3 data lakes), Snowflake OLAP star schemas, Azure ADLS Gen2, and Supabase serverless backends.",
        experience: "Deshraj has 5+ years of experience as a Data & AI/ML Engineer. Key achievements include cutting vector sync latency by 65% at Technoid, boosting Snowflake data availability by 60% at Zifatech, and scaling Kubernetes teleoperation pipelines at Objectways.",
        projects: "Deshraj's top repositories include TalentVenue EventIntel (Azure/Snowflake Star Schema BI), CurioSync (Serverless LinkedIn Publisher), Job Search CRM (FastAPI/SQLite AI Tailoring), and FinTech Credit Risk Pipeline. Explore the Projects section above!",
        observability: "Deshraj integrates automated Great Expectations QA data rules into ingestion cycles and runs Kolmogorov-Smirnov (KS) tests to flag feature drift before it affects model performance.",
        skills: "Deshraj specializes in Python (Asyncio, FastAPI, Pandas), SQL (PostgreSQL, Snowflake), AWS Glue/S3, Azure ADLS Gen2, Supabase, Scikit-Learn, TensorFlow, Great Expectations, Power BI, and Tableau.",
        analytics: "Deshraj models dimensional Star Schemas in Snowflake and PostgreSQL, developing interactive Power BI and Tableau dashboards that cut reporting cycles by 30% and lift customer acquisition by 12%.",
        objectways: "At Objectways Technologies, Deshraj scaled teleoperation ingestion pipelines in Python, Scala, and Kubernetes, processing 10,000+ robotics telemetry samples and cutting data processing time by 30%.",
        technoid: "At Technoid LLC, Deshraj optimized GPT-4o mini models (+25% recommendation accuracy), restructured Supabase/PostgreSQL RLS sync (-65% latency), and built regression frameworks (-30% deployment errors).",
        zifatech: "At Zifatech Solutions, Deshraj migrated legacy database workflows to AWS Glue & S3 (+60% Snowflake availability), automated sales ETL (-70% manual effort), and set up Great Expectations QA (98%+ reliability).",
        elevateme: "At ElevateMe Bootcamp, Deshraj executed K-Means clustering and PCA customer segmentation (92% variance across 6 personas) and deployed Power BI dashboards lifting campaign CTR by 12%.",
        kronic: "At Kronic Keys, Deshraj cleaned 500k+ row financial datasets in PostgreSQL, building Tableau dashboards that cut monthly reporting cycles by 30%.",
        talentvenue: "TalentVenue EventIntel is an enterprise BI & predictive ML platform. Deshraj engineered a conformed Azure ADLS Gen2 landing zone, Snowflake OLAP Star Schema, SHA-256 PII tokenization, and a Random Forest contract cancellation risk classifier in Streamlit.",
        deployment_errors: "Deshraj cut model deployment errors by 30% at Technoid LLC by building automated phased regression test suites, implementing strict contract payload validation in PyTest/FastAPI, and establishing mandatory UAT staging gates before production rollouts.",
        sync_latency: "Deshraj reduced real-time vector sync latency by 65% at Technoid LLC by restructuring Supabase Row-Level Security (RLS) policies, indexing composite lookup keys in PostgreSQL, and converting synchronous updates into async batch operations.",
        recommendation_accuracy: "Deshraj raised candidate recommendation accuracy by 25% at Technoid LLC by designing structured JSON schema prompts for GPT-4o mini, implementing semantic keyword extraction, and tuning LLM temperature bounds.",
        location: "Deshraj is located in Tempe, Arizona (Phoenix Metropolitan Area), United States. He is open to relocation to major technology hubs nationwide for Data Engineering and ML Engineering roles.",
        current_doing: "Deshraj is currently working as a Teleoperation Data Collection Associate at Objectways Technologies LLC in Tempe, AZ, scaling robotics telemetry pipelines in Python, Scala, and Kubernetes. Simultaneously, he is engineering TalentVenue EventIntel—an enterprise BI and predictive ML platform on Azure ADLS Gen2 and Snowflake OLAP Star Schemas.",
        best_work: "Deshraj's best work is defined by bridging resilient cloud data engineering with low-latency ML model optimization. Commercially, his top achievement was at Technoid LLC (cutting vector sync latency by 65% and model deployment errors by 30%), while architecturally, his flagship platform is TalentVenue EventIntel (a Snowflake Star Schema & ML risk engine). Depending on your team's focus, I can dive into his Cloud Data Engineering (AWS/Snowflake), LLM Agent Optimization (GPT-4o), or Streaming Telemetry.",
        emissions: "Multi-State Land Use Emissions Analysis is a geospatial pipeline processing daily land cover changes across 5 U.S. states. Deshraj built Python/SQLite ETL ingestion and Random Forest models forecasting CO2 trends with 90% accuracy.",
        fintech: "FinTech Credit Risk Command Center is an end-to-end transaction pipeline featuring a FastAPI backend, Scikit-Learn Random Forest default prediction (92% precision), and real-time sub-100ms fraud evaluation.",
        telematics: "IoT Telematics & Predictive Maintenance processes streaming EV battery telemetry micro-batches, running Z-score anomaly detection and Remaining Useful Life (RUL) regression models for maintenance alerts.",
        stem: "Extending STEM across ASL is an accessibility platform where Deshraj trained a deep CNN in TensorFlow/Keras to recognize American Sign Language gestures for 7 core STEM concepts with a 4.6/5 user rating.",
        sales: "Sales Operations & Customer Segmentation pipeline automates RFM scaling, K-Means clustering, and PCA dimensionality reduction to group users into 4 target personas.",
        anomaly: "Tax Anomaly Audit Engine scans general ledger entries using Benford's Law distribution checks and Isolation Forest models to isolate multivariate financial outliers.",
        simulation: "AI-ML Data Science Simulation automates daily sales ingestion across 5 state branches, running Linear Regression and Random Forest models to cut stock-outs by 15%.",
        observability_project: "AI Model Observability & Fairness Audits runs automated Kolmogorov-Smirnov (KS) tests on production features for data drift and calculates Disparate Impact ratios for bias auditing."
    };

    const searchKeyword = (msg) => {
        const query = msg.toLowerCase();
        
        // 0. Location, Current Role, Best Work & Achievement metrics matching
        if (query.includes("location") || query.includes("located") || query.includes("where is") || query.includes("where does") || query.includes("live")) return answers.location;
        if (query.includes("currently doing") || query.includes("doing now") || query.includes("current role") || query.includes("latest work") || query.includes("current work")) return answers.current_doing;
        if (query.includes("best work") || query.includes("top work") || query.includes("best project") || query.includes("flagship")) return answers.best_work;
        if (query.includes("talentvenue") || query.includes("eventintel")) return answers.talentvenue;
        if (query.includes("30%") || (query.includes("deploy") && query.includes("error"))) return answers.deployment_errors;
        if (query.includes("65%") || (query.includes("sync") && query.includes("latency"))) return answers.sync_latency;
        if (query.includes("25%") || (query.includes("recommendation") && query.includes("accuracy"))) return answers.recommendation_accuracy;

        // 1. Specific Jobs matching
        if (query.includes("objectways") || query.includes("teleoperation")) return answers.objectways;
        if (query.includes("technoid") || query.includes("applied machine")) return answers.technoid;
        if (query.includes("zifatech") || query.includes("snowflake schema")) return answers.zifatech;
        if (query.includes("elevateme") || query.includes("bootcamp")) return answers.elevateme;
        if (query.includes("kronic") || query.includes("keys")) return answers.kronic;
        
        // 2. Specific Projects matching
        if (query.includes("emissions") || query.includes("land use") || query.includes("geospatial") || query.includes("arcgis")) return answers.emissions;
        if (query.includes("fintech") || query.includes("credit risk") || query.includes("fraud") || query.includes("credit evaluation")) return answers.fintech;
        if (query.includes("telematics") || query.includes("iot") || query.includes("fleet") || query.includes("battery") || query.includes("predictive")) return answers.telematics;
        if (query.includes("stem") || query.includes("asl") || query.includes("sign language") || query.includes("tensorflow") || query.includes("keras")) return answers.stem;
        if (query.includes("sales operations") || query.includes("segmentation pipeline") || query.includes("customer segmentation") || query.includes("segmentation")) return answers.sales;
        if (query.includes("anomaly") || query.includes("tax") || query.includes("benford") || query.includes("audit") || query.includes("isolation forest")) return answers.anomaly;
        if (query.includes("simulation project") || (query.includes("simulation") && query.includes("data science"))) return answers.simulation;
        if (query.includes("observability and fairness") || query.includes("fairness") || (query.includes("model") && query.includes("observability") && query.includes("audit"))) return answers.observability_project;
        
        // 3. Broad query categories (with fallback checks)
        if (query.includes("gpa") || query.includes("grade") || query.includes("scale") || query.includes("score")) return answers.gpa;
        if (query.includes("python") || query.includes("pandas") || query.includes("numpy") || query.includes("scikit") || query.includes("programming")) return answers.python;
        if (query.includes("asu") || query.includes("education") || query.includes("degree") || query.includes("master") || query.includes("university")) return answers.asu;
        if (query.includes("contact") || query.includes("email") || query.includes("phone") || query.includes("reach") || query.includes("hire") || query.includes("relocate")) return answers.contact;
        if (query.includes("cloud") || query.includes("aws") || query.includes("s3") || query.includes("glue") || query.includes("supabase")) return answers.cloud;
        if (query.includes("drift") || query.includes("observability") || query.includes("validation") || query.includes("great expectations")) return answers.observability;
        if (query.includes("skills") || query.includes("technical") || query.includes("tech stack") || query.includes("languages")) return answers.skills;
        if (query.includes("analysis") || query.includes("analytics") || query.includes("tableau") || query.includes("power bi") || query.includes("powerbi")) return answers.analytics;
        if (query.includes("project") || query.includes("portfolio") || query.includes("best work") || query.includes("github")) return answers.projects;
        if (query.includes("experience") || query.includes("work") || query.includes("history") || query.includes("job") || query.includes("years") || query.includes("career")) return answers.experience;
        
        return "That's an interesting question! Deshraj's experience covers advanced python scripting, cloud data engineering (AWS, Snowflake), and building robust ML models (from regression to deep learning). For details on a specific project or job, you can ask about 'Technoid', 'Objectways', 'Zifatech', 'TalentVenue', or 'IoT Telematics'. You can also email him directly at djogiya786@gmail.com.";
    };

    const addMessage = (text, sender) => {
        const msgEl = document.createElement("div");
        msgEl.className = `chat-msg ${sender}-msg`;
        msgEl.textContent = text;
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return msgEl;
    };

    const triggerBotResponse = async (userQuery) => {
        // Add typing dots
        const typingEl = document.createElement("div");
        typingEl.className = "chat-msg bot-msg typing-msg";
        typingEl.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        const respond = (text) => {
            if (chatMessages.contains(typingEl)) {
                chatMessages.removeChild(typingEl);
            }
            addMessage(text, "bot");
        };

        const normQuery = userQuery.trim().toLowerCase().replace(/[?.,!]/g, "");

        try {
            // 1. Look up question in Supabase cache table
            const cacheUrl = `${SUPABASE_URL}/rest/v1/chatbot_cache?question=eq.${encodeURIComponent(normQuery)}&select=answer`;
            const cacheRes = await fetch(cacheUrl, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                }
            });

            if (cacheRes.ok) {
                const cacheData = await cacheRes.json();
                if (cacheData && cacheData.length > 0 && cacheData[0].answer) {
                    console.log("Chatbot Cache Hit!");
                    respond(cacheData[0].answer);
                    return;
                }
            }

            // 2. Cache Miss: call Supabase Edge Function for Gemini API
            console.log("Chatbot Cache Miss. Querying Live Gemini AI via Supabase Edge Function...");
            const functionUrl = `${SUPABASE_URL}/functions/v1/portfolio-chat`;
            const aiRes = await fetch(functionUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`
                },
                body: JSON.stringify({ message: userQuery + " (Important: Write the response in a flowing paragraph narrative. Do NOT use bullet points, numbered lists, or dashes.)" })
            });

            if (!aiRes.ok) {
                throw new Error(`Edge Function returned status: ${aiRes.status}`);
            }

            const aiData = await aiRes.json();
            const reply = aiData.reply || aiData.response || aiData.text;
            if (!reply) {
                throw new Error("Edge Function returned empty reply");
            }

            respond(reply);

            // 3. Cache the successful result back in the database
            console.log("Caching new Q&A in Supabase database...");
            await fetch(`${SUPABASE_URL}/rest/v1/chatbot_cache`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "apikey": SUPABASE_KEY,
                    "Authorization": `Bearer ${SUPABASE_KEY}`,
                    "Prefer": "resolution=ignore-duplicates"
                },
                body: JSON.stringify({
                    question: normQuery,
                    answer: reply
                })
            }).catch(e => console.warn("Failed to write to chatbot cache:", e));

        } catch (error) {
            console.warn("Live AI chatbot failure, falling back to local searchKeyword:", error);
            // Fallback: Run local keyword-based answers
            const answer = searchKeyword(userQuery);
            setTimeout(() => {
                respond(answer);
            }, 600);
        }
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
                    desc: "Saves regional emissions inventory records to SQLite database.",
                    impact: "Ensures carbon offsets and land cover changes are saved for audit verification.",
                    inputs: "Decade Trend Curves",
                    process: "SQLite Schema Mapping",
                    outputs: "Historical Database",
                    code: "CREATE TABLE land_changes (\n  state TEXT,\n  from_type TEXT,\n  to_type TEXT,\n  area_changed REAL,\n  change_date DATE\n);" 
                },
                { 
                    id: "dashboard", 
                    label: "ArcGIS Dashboard", 
                    icon: "🗺️", 
                    tags: ["ArcGIS Python API", "GIS"], 
                    desc: "Visualizes land cover shifts, forest loss, and regional emission summaries dynamically.",
                    impact: "Enables stakeholders to explore spatial trends interactively, reducing anomaly detection time by 15%.",
                    inputs: "Historical Database",
                    process: "ArcGIS API Integration",
                    outputs: "Interactive GIS Dashboard",
                    code: "# ArcGIS Python API dashboard integration\nfrom arcgis.gis import GIS\n\ndef publish_to_dashboard(df_summary):\n    gis = GIS(\"https://arcgis.com\", \"username\", \"password\")\n    map_item = gis.content.search(\"Emissions Map\", \"Web Map\")[0]\n    feature_layer = map_item.layers[0]\n    feature_layer.edit_features(adds=df_summary.to_dict('records'))" 
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

        if (codeBox && codeContentEl) {
            codeContentEl.textContent = node.code;
            const isCurrentlyVisible = codeBox.style.display === "block";
            if (toggleCodeBtn) {
                toggleCodeBtn.style.display = "block";
                toggleCodeBtn.textContent = isCurrentlyVisible ? "Hide Technical Code Snippet 🙈" : "View Technical Code Snippet 🛠️";
            }
            if (!isCurrentlyVisible) {
                codeBox.style.display = "none";
            }
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
    const thresholdSlider = document.getElementById("modal-threshold-slider");
    const thresholdVal = document.getElementById("modal-threshold-val");
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

        const model = modelSelect ? modelSelect.value : "conversion";

        let tp, fp, fn, tn, totalPos, totalNeg;

        if (model === "conversion") {
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
            if (model === "conversion") {
                if (t < 0.30) {
                    businessTitle.textContent = `⚠️ High Recall / Low Precision Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags almost all visitors as likely to convert. This triggers aggressive modal popups, newsletter signups, and sales outreach, causing high user bounce rates and user frustration.";
                } else if (t > 0.70) {
                    businessTitle.textContent = `⚠️ High Precision / Low Recall Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Only triggers conversion outreach when 100% certain. Genuine recruiters browse in peace, but you miss proactive opportunities to trigger the recruiter tour or AI chatbot, losing warm leads.";
                } else {
                    businessTitle.textContent = `✅ Optimal Balanced Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-emerald)";
                    businessDesc.textContent = "Optimal F1-Score trade-off. Automatically triggers the guided tour and AI assistant launcher for high-interest users while keeping background tracking passive and non-intrusive.";
                }
            } else {
                if (t < 0.35) {
                    businessTitle.textContent = `⚠️ High Recall / Low Precision Bot Filtering Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags almost all sessions as potential bot traffic. Enforces strict CAPTCHA verification challenges for every visitor, causing high friction and driving away real recruiters.";
                } else if (t > 0.65) {
                    businessTitle.textContent = `⚠️ High Precision / Low Recall Bot Filtering Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Only blocks sessions that are undeniably bots. Real users experience zero friction, but the backend is flooded with automated scrapers, spam database inserts, and fake analytics logs.";
                } else {
                    businessTitle.textContent = `✅ Optimal Balanced Bot Security Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-emerald)";
                    businessDesc.textContent = "Balanced security threshold. Filters out 98% of aggressive headless scrapers and automated spam bots while ensuring a completely friction-free experience for 99.9% of human recruiters.";
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

    // ==========================================================================
    // A/B Testing Simulator & Normal Distribution Helpers
    // ==========================================================================
    
    // Standard normal CDF approximation (erf-based, highly accurate)
    function stdNormalCDF(x) {
        const erf = (z) => {
            const sign = z < 0 ? -1 : 1;
            const absZ = Math.abs(z);
            const a1 = 0.254829592;
            const a2 = -0.284496736;
            const a3 = 1.421413741;
            const a4 = -1.453152027;
            const a5 = 1.061405429;
            const p = 0.3275911;
            
            const t = 1 / (1 + p * absZ);
            const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ);
            return sign * y;
        };
        return 0.5 * (1 + erf(x / Math.sqrt(2)));
    }

    let abInterval = null;
    const runABBtn = document.getElementById("run-ab-btn");
    const abATargetInput = document.getElementById("ab-a-target-input");
    const abBTargetInput = document.getElementById("ab-b-target-input");
    const abATargetVal = document.getElementById("ab-a-target-val");
    const abBTargetVal = document.getElementById("ab-b-target-val");

    function updateABStaticValues() {
        if (!abATargetInput || !abBTargetInput) return;
        const valA = parseFloat(abATargetInput.value);
        const valB = parseFloat(abBTargetInput.value);
        
        const crAEl = document.getElementById("ab-a-cr");
        const crBEl = document.getElementById("ab-b-cr");
        const convAEl = document.getElementById("ab-a-conv");
        const convBEl = document.getElementById("ab-b-conv");
        const visAEl = document.getElementById("ab-a-visitors");
        const visBEl = document.getElementById("ab-b-visitors");
        const barAEl = document.getElementById("ab-a-bar");
        const barBEl = document.getElementById("ab-b-bar");
        
        const convA = Math.round(valA * 10);
        const convB = Math.round(valB * 10);
        
        if (crAEl) crAEl.textContent = valA.toFixed(2) + "%";
        if (crBEl) crBEl.textContent = valB.toFixed(2) + "%";
        
        if (convAEl) convAEl.textContent = convA;
        if (convBEl) convBEl.textContent = convB;
        
        if (visAEl) visAEl.textContent = "1000";
        if (visBEl) visBEl.textContent = "1000";
        
        if (barAEl) barAEl.style.width = Math.min(100, (valA / 30) * 100) + "%";
        if (barBEl) barBEl.style.width = Math.min(100, (valB / 30) * 100) + "%";

        // Reset analytical stats and badge since the sliders were dragged
        const upliftEl = document.getElementById("ab-uplift");
        const zscoreEl = document.getElementById("ab-zscore");
        const pvalueEl = document.getElementById("ab-pvalue");
        const badge = document.getElementById("ab-status-badge");

        if (upliftEl) upliftEl.textContent = "0.00%";
        if (zscoreEl) zscoreEl.textContent = "0.00";
        if (pvalueEl) pvalueEl.textContent = "0.0000";

        if (badge) {
            badge.className = "";
            badge.classList.add("badge-status-neutral");
            badge.textContent = "Not Simulated";
        }
    }

    if (abATargetInput && abATargetVal) {
        abATargetInput.addEventListener("input", () => {
            abATargetVal.textContent = abATargetInput.value + "%";
            // Update results in real-time as user moves the slider
            if (!abInterval || runABBtn.disabled === false) {
                updateABStaticValues();
            }
        });
    }
    if (abBTargetInput && abBTargetVal) {
        abBTargetInput.addEventListener("input", () => {
            abBTargetVal.textContent = abBTargetInput.value + "%";
            // Update results in real-time as user moves the slider
            if (!abInterval || runABBtn.disabled === false) {
                updateABStaticValues();
            }
        });
    }
    
    // Call initially to render default targets (10% and 13%)
    updateABStaticValues();
    
    if (runABBtn) {
        runABBtn.addEventListener("click", () => {
            if (abInterval) clearInterval(abInterval);
            runABBtn.disabled = true;
            runABBtn.textContent = "Simulating Traffic... 🚦";
            
            const nA = 1000;
            const nB = 1000;
            
            const targetValA = abATargetInput ? parseFloat(abATargetInput.value) / 100 : 0.10;
            const targetValB = abBTargetInput ? parseFloat(abBTargetInput.value) / 100 : 0.13;

            // Generate actual random conversions based on target sliders
            const finalA = Math.round(nA * (targetValA - 0.01 + Math.random() * 0.02)); 
            const finalB = Math.round(nB * (targetValB - 0.01 + Math.random() * 0.02)); 
            
            let currentVisitors = 0;
            abInterval = setInterval(() => {
                currentVisitors += 50;
                if (currentVisitors > 1000) {
                    currentVisitors = 1000;
                    clearInterval(abInterval);
                    runABBtn.disabled = false;
                    runABBtn.textContent = "Run Experiment Simulation 🔄";
                }
                
                const curA = Math.round((currentVisitors / 1000) * finalA);
                const curB = Math.round((currentVisitors / 1000) * finalB);
                
                const crA = currentVisitors > 0 ? (curA / currentVisitors) * 100 : 0;
                const crB = currentVisitors > 0 ? (curB / currentVisitors) * 100 : 0;
                
                document.getElementById("ab-a-cr").textContent = crA.toFixed(2) + "%";
                document.getElementById("ab-b-cr").textContent = crB.toFixed(2) + "%";
                document.getElementById("ab-a-conv").textContent = curA;
                document.getElementById("ab-b-conv").textContent = curB;
                document.getElementById("ab-a-visitors").textContent = currentVisitors;
                document.getElementById("ab-b-visitors").textContent = currentVisitors;
                
                // Max 30% conversion rate fills 100% width of progress bar (scaled to 30)
                document.getElementById("ab-a-bar").style.width = Math.min(100, (crA / 30) * 100) + "%";
                document.getElementById("ab-b-bar").style.width = Math.min(100, (crB / 30) * 100) + "%";
                
                // Calculate and update stats live at each tick
                const pA = curA / currentVisitors;
                const pB = curB / currentVisitors;
                const pooled = (curA + curB) / (currentVisitors * 2);
                let z = 0;
                let pValue = 1.0;
                if (pooled > 0 && pooled < 1) {
                    const se = Math.sqrt(pooled * (1 - pooled) * (2 / currentVisitors));
                    z = se > 0 ? (pB - pA) / se : 0;
                    pValue = 2 * (1 - stdNormalCDF(Math.abs(z)));
                }
                const uplift = pA > 0 ? ((pB - pA) / pA) * 100 : 0;
                
                document.getElementById("ab-uplift").textContent = (uplift >= 0 ? "+" : "") + uplift.toFixed(2) + "%";
                document.getElementById("ab-zscore").textContent = z.toFixed(3);
                const pvalueEl = document.getElementById("ab-pvalue");
                if (pvalueEl) {
                    if (pValue < 0.0001) {
                        pvalueEl.textContent = "< 0.0001";
                    } else {
                        pvalueEl.textContent = pValue.toFixed(4);
                    }
                }
                
                const badge = document.getElementById("ab-status-badge");
                if (badge) {
                    badge.className = ""; 
                    if (currentVisitors < 1000) {
                        badge.classList.add("badge-status-neutral");
                        badge.textContent = "Simulating...";
                    } else {
                        if (pValue < 0.05) {
                            badge.classList.add("badge-status-sig");
                            badge.textContent = "SIGNIFICANT (p < 0.05)";
                        } else {
                            badge.classList.add("badge-status-not-sig");
                            badge.textContent = "NOT SIGNIFICANT";
                        }
                    }
                }
            }, 30);
        });
    }

    // ==========================================================================
    // ML Decision Threshold Optimizer
    // ==========================================================================
    const abSlider = document.getElementById("threshold-slider");
    if (abSlider) {
        const updateThresholdOptimizer = () => {
            const T = parseFloat(abSlider.value);
            document.getElementById("threshold-val-display").textContent = T.toFixed(2);
            
            const P = 200; // Actual fraud cases
            const N = 800; // Actual compliant cases
            
            // Distributions: Fraud Mean=0.65, Std=0.18. Compliant Mean=0.30, Std=0.18
            const zPos = (T - 0.65) / 0.18;
            const propPosAbove = 1 - stdNormalCDF(zPos);
            const TP = Math.round(P * propPosAbove);
            const FN = P - TP;
            
            const zNeg = (T - 0.30) / 0.18;
            const propNegAbove = 1 - stdNormalCDF(zNeg);
            const FP = Math.round(N * propNegAbove);
            const TN = N - FP;
            
            const precision = (TP + FP) > 0 ? (TP / (TP + FP)) * 100 : 100.0;
            const recall = P > 0 ? (TP / P) * 100 : 0.0;
            
            // Business ROI: +$100 per TP (prevented fraud), -$20 per FP (false alarm support), -$150 per FN (missed fraud)
            const tpGain = TP * 100;
            const fpLoss = FP * 20;
            const fnLoss = FN * 150;
            const netProfit = tpGain - fpLoss - fnLoss;
            
            document.getElementById("cm-tp").textContent = TP;
            document.getElementById("cm-fn").textContent = FN;
            document.getElementById("cm-fp").textContent = FP;
            document.getElementById("cm-tn").textContent = TN;
            
            document.getElementById("val-precision").textContent = precision.toFixed(1) + "%";
            document.getElementById("val-recall").textContent = recall.toFixed(1) + "%";
            
            document.getElementById("profit-tp-gain").textContent = "+$" + tpGain.toLocaleString();
            document.getElementById("profit-fp-loss").textContent = "-$" + fpLoss.toLocaleString();
            document.getElementById("profit-fn-loss").textContent = "-$" + fnLoss.toLocaleString();
            
            const netProfitEl = document.getElementById("val-net-profit");
            netProfitEl.textContent = (netProfit >= 0 ? "$" : "-$") + Math.abs(netProfit).toLocaleString();
            if (netProfit >= 0) {
                netProfitEl.style.color = "#10b981";
            } else {
                netProfitEl.style.color = "#ef4444";
            }
            
            const optimalBadge = document.getElementById("threshold-optimal-badge");
            if (Math.abs(T - 0.35) < 0.01) {
                optimalBadge.style.display = "inline-block";
            } else {
                optimalBadge.style.display = "none";
            }
        };
        abSlider.addEventListener("input", updateThresholdOptimizer);
        updateThresholdOptimizer();
    }

    // ==========================================================================
    // Recruiter Guided Tour Coordinator (Autoplay & Self-Paced)
    // ==========================================================================
    let tourCurrentStep = 0;
    let tourMode = 'manual'; // 'autoplay' or 'manual'
    let isAutoplayPaused = false;
    let progressIntervalId = null;
    let stepDuration = 0;
    let stepTimeElapsed = 0;
    const PROGRESS_TICK = 100;
    
    let pendingTourDelays = [];
    
    const delay = (ms) => new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
            pendingTourDelays = pendingTourDelays.filter(item => item.reject !== reject);
            resolve();
        }, ms);
        
        pendingTourDelays.push({
            timeoutId,
            reject: () => {
                clearTimeout(timeoutId);
                reject(new Error("TourStepAborted"));
            }
        });
    });

    function cancelPendingTourDelays() {
        pendingTourDelays.forEach(item => {
            try {
                item.reject();
            } catch (e) {}
        });
        pendingTourDelays = [];
    }
    
    const tourOverlay = document.getElementById("tour-overlay-card");
    const tourBackdrop = document.getElementById("tour-backdrop");
    const tourTitle = document.getElementById("tour-step-title");
    const tourDesc = document.getElementById("tour-step-desc");
    const tourStepIndicator = document.getElementById("tour-step-indicator");
    
    const tourNextBtn = document.getElementById("tour-next-btn");
    const tourPrevBtn = document.getElementById("tour-prev-btn");
    const tourSkipBtn = document.getElementById("tour-skip-btn");
    const tourPausePlayBtn = document.getElementById("tour-pause-play-btn");
    
    const tourSteps = [
        {
            title: "Welcome to Deshraj's Portfolio!",
            desc: "This interactive guided tour showcases Deshraj's professional experience, pipeline dashboard, SQL charts, and conversational AI chatbot in sequence. Choose how you would like to proceed below:",
            target: null,
            duration: 0,
            action: async () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                await delay(800);
            }
        },
        {
            title: "Interactive Resume Modal",
            desc: "Watch as we open the Resume, cycle through his 'Data Engineering' and 'Data Science' highlights, and point out his perfect 4.0/4.0 GPA from Arizona State University.",
            target: "#resume-hero-btn",
            duration: 30000,
            action: async () => {
                const resumeModal = document.getElementById("resume-modal");
                if (resumeModal) {
                    resumeModal.classList.add("tour-highlight");
                }
                const resumeBtn = document.getElementById("resume-hero-btn") || document.getElementById("resume-nav-btn");
                if (resumeBtn) {
                    resumeBtn.click();
                }
                await delay(1200);
                
                // Highlight Data Engineering role bullets & scroll to one
                const deFilter = document.querySelector('.resume-filter-btn[data-role="de"]');
                if (deFilter) {
                    deFilter.click();
                    deFilter.classList.add("tour-highlight");
                }
                const deBullet = document.querySelector('.resume-bullet[data-role="de"]');
                if (deBullet) {
                    deBullet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    deBullet.classList.add("tour-highlight");
                }
                await delay(5000);
                if (deFilter) deFilter.classList.remove("tour-highlight");
                if (deBullet) deBullet.classList.remove("tour-highlight");
                
                // Highlight Data Science & ML role bullets & scroll to one
                const dsFilter = document.querySelector('.resume-filter-btn[data-role="ds"]');
                if (dsFilter) {
                    dsFilter.click();
                    dsFilter.classList.add("tour-highlight");
                }
                const dsBullet = document.querySelector('.resume-bullet[data-role="ds"]');
                if (dsBullet) {
                    dsBullet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    dsBullet.classList.add("tour-highlight");
                }
                await delay(5000);
                if (dsFilter) dsFilter.classList.remove("tour-highlight");
                if (dsBullet) dsBullet.classList.remove("tour-highlight");

                // Highlight SDE & Web Dev role bullets & scroll to one
                const sdeFilter = document.querySelector('.resume-filter-btn[data-role="sde"]');
                if (sdeFilter) {
                    sdeFilter.click();
                    sdeFilter.classList.add("tour-highlight");
                }
                const sdeBullet = document.querySelector('.resume-bullet[data-role="sde"]');
                if (sdeBullet) {
                    sdeBullet.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sdeBullet.classList.add("tour-highlight");
                }
                await delay(5000);
                if (sdeFilter) sdeFilter.classList.remove("tour-highlight");
                if (sdeBullet) sdeBullet.classList.remove("tour-highlight");
                
                // Return to all roles & highlight GPA
                const allFilter = document.querySelector('.resume-filter-btn[data-role="all"]');
                if (allFilter) {
                    allFilter.click();
                }
                await delay(1200);
                
                const gpaText = document.getElementById("resume-gpa-highlight");
                if (gpaText) {
                    gpaText.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    gpaText.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const resumeModal = document.getElementById("resume-modal");
                if (resumeModal) resumeModal.classList.remove("tour-highlight");
                
                const deFilter = document.querySelector('.resume-filter-btn[data-role="de"]');
                if (deFilter) deFilter.classList.remove("tour-highlight");
                
                const dsFilter = document.querySelector('.resume-filter-btn[data-role="ds"]');
                if (dsFilter) dsFilter.classList.remove("tour-highlight");

                const sdeFilter = document.querySelector('.resume-filter-btn[data-role="sde"]');
                if (sdeFilter) sdeFilter.classList.remove("tour-highlight");
                
                const deBullet = document.querySelector('.resume-bullet[data-role="de"]');
                if (deBullet) deBullet.classList.remove("tour-highlight");
                
                const dsBullet = document.querySelector('.resume-bullet[data-role="ds"]');
                if (dsBullet) dsBullet.classList.remove("tour-highlight");

                const sdeBullet = document.querySelector('.resume-bullet[data-role="sde"]');
                if (sdeBullet) sdeBullet.classList.remove("tour-highlight");
                
                const gpaText = document.getElementById("resume-gpa-highlight");
                if (gpaText) gpaText.classList.remove("tour-highlight");
                
                const closeResumeBtn = document.getElementById("close-resume-btn");
                if (closeResumeBtn) closeResumeBtn.click();
            }
        },
        {
            title: "Professional Experience",
            desc: "Explore Deshraj's 5+ years of hands-on work history, featuring quantified metrics from Technoid LLC, Objectways, Zifatech Solutions, and Arizona State University.",
            target: "#experience",
            duration: 10000,
            action: async () => {
                const expSec = document.getElementById("experience");
                if (expSec) {
                    expSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    expSec.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const expSec = document.getElementById("experience");
                if (expSec) expSec.classList.remove("tour-highlight");
            }
        },
        {
            title: "Portfolio Repositories",
            desc: "Next, we scroll to his projects. Watch as the search category filters cycle dynamically to show Data Engineering, ML, and Analytics projects.",
            target: "#projects",
            duration: 18000,
            action: async () => {
                const section = document.getElementById("projects");
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    section.classList.add("tour-highlight");
                }
                await delay(1000);
                
                const deFilter = document.querySelector('.filter-btn[data-filter="data-engineering"]');
                if (deFilter) {
                    deFilter.click();
                    deFilter.classList.add("tour-highlight");
                }
                await delay(3500);
                if (deFilter) deFilter.classList.remove("tour-highlight");
                
                const mlFilter = document.querySelector('.filter-btn[data-filter="machine-learning"]');
                if (mlFilter) {
                    mlFilter.click();
                    mlFilter.classList.add("tour-highlight");
                }
                await delay(3500);
                if (mlFilter) mlFilter.classList.remove("tour-highlight");
                
                const biFilter = document.querySelector('.filter-btn[data-filter="analytics"]');
                if (biFilter) {
                    biFilter.click();
                    biFilter.classList.add("tour-highlight");
                }
                await delay(3500);
                if (biFilter) biFilter.classList.remove("tour-highlight");
                
                const allFilter = document.querySelector('.filter-btn[data-filter="all"]');
                if (allFilter) {
                    allFilter.click();
                }
            },
            cleanup: () => {
                const section = document.getElementById("projects");
                if (section) section.classList.remove("tour-highlight");
                const deFilter = document.querySelector('.filter-btn[data-filter="data-engineering"]');
                if (deFilter) deFilter.classList.remove("tour-highlight");
                const mlFilter = document.querySelector('.filter-btn[data-filter="machine-learning"]');
                if (mlFilter) mlFilter.classList.remove("tour-highlight");
                const biFilter = document.querySelector('.filter-btn[data-filter="analytics"]');
                if (biFilter) biFilter.classList.remove("tour-highlight");
            }
        },
        {
            title: "SQL Sandbox & Dynamic Visuals",
            desc: "Watch as we select and execute multiple analytical queries inside the playground to automatically render live metrics, data tables, and custom charts.",
            target: ".sql-widget",
            duration: 32000,
            action: async () => {
                const widget = document.querySelector('.sql-widget');
                if (widget) {
                    widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    widget.classList.add("tour-highlight");
                }
                await delay(1000);
                
                const querySelect = document.getElementById("sql-query-select");
                const runBtn = document.getElementById("run-sql-btn");
                
                // 1. Cycle to Tax Anomaly Audit Query
                if (querySelect) {
                    querySelect.value = "anomaly_risk_claims";
                    querySelect.dispatchEvent(new Event('change'));
                }
                await delay(1500);
                if (runBtn) runBtn.click();
                await delay(8000);
                
                // 2. Cycle to Clinical Trial Outcomes Query
                if (querySelect) {
                    querySelect.value = "survival_by_treatment";
                    querySelect.dispatchEvent(new Event('change'));
                }
                await delay(1500);
                if (runBtn) runBtn.click();
                await delay(8000);
                
                // 3. Cycle to Land Use Emissions Query
                if (querySelect) {
                    querySelect.value = "emissions_by_state";
                    querySelect.dispatchEvent(new Event('change'));
                }
                await delay(1500);
                if (runBtn) runBtn.click();
                await delay(8000);
            },
            cleanup: () => {
                const widget = document.querySelector('.sql-widget');
                if (widget) widget.classList.remove("tour-highlight");
            }
        },
        {
            title: "Real-Time ETL Observability",
            desc: "Next, we'll scroll down to the Live ETL Monitor. We'll run full diagnostics to show pipeline checks, data validation status, and drift alerts.",
            target: ".observability-widget",
            duration: 18000,
            action: async () => {
                const widget = document.querySelector('.observability-widget');
                if (widget) {
                    widget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    widget.classList.add("tour-highlight");
                }
                await delay(1000);
                
                const runBtn = document.getElementById("run-obs-btn");
                if (runBtn) {
                    runBtn.click();
                }
            },
            cleanup: () => {
                const widget = document.querySelector('.observability-widget');
                if (widget) widget.classList.remove("tour-highlight");
            }
        },
        {
            title: "D.S. & ML Experiments Simulator",
            desc: "Watch as we run a live Z-test in the A/B Testing Simulator, and adjust the classification decision boundary threshold on the ML Optimizer.",
            target: ".experiments-grid",
            duration: 16000,
            action: async () => {
                const grid = document.querySelector('.experiments-grid');
                if (grid) {
                    grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    grid.classList.add("tour-highlight");
                }
                await delay(1000);
                
                const runBtn = document.getElementById("run-ab-btn");
                if (runBtn) {
                    runBtn.click();
                }
                await delay(5000);
                
                const slider = document.getElementById("threshold-slider");
                if (slider) {
                    slider.value = "0.35";
                    slider.dispatchEvent(new Event('input'));
                }
            },
            cleanup: () => {
                const grid = document.querySelector('.experiments-grid');
                if (grid) grid.classList.remove("tour-highlight");
            }
        },
        {
            title: "Live Visitor Analytics & Traffic Forecast",
            desc: "Explore persistent visitor telemetry! Watch as we open the panel, cycle through 7-Day Traffic Forecasts, visualize K-Means Visitor Cohort Clusters, and test live ML model inference.",
            target: "#visitor-container",
            duration: 18000,
            action: async () => {
                const container = document.getElementById("visitor-container");
                if (container) {
                    container.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                
                const widget = document.getElementById("visitor-analytics-widget");
                if (widget && window.innerWidth >= 992) {
                    widget.style.zIndex = "100002"; // Elevate stacking context above backdrop on desktop
                }
                
                const launcher = document.getElementById("visitor-launcher");
                
                // If collapsed, open it
                if (launcher && window.getComputedStyle(launcher).display !== "none") {
                    launcher.click();
                }
                
                if (container) {
                    container.classList.add("tour-highlight");
                }
                await delay(1500);
                
                const mlBtn = document.getElementById("view-ml-charts-btn");
                if (mlBtn) mlBtn.click();
                
                // Elevate the ML charts modal so it is not blurred by the tour backdrop
                const mlModal = document.getElementById("ml-charts-modal");
                if (mlModal) {
                    mlModal.classList.add("tour-highlight");
                }
                await delay(3000);
                
                // Switch to Tab 2: Visitor Cohorts (K-Means)
                const cohortTab = document.querySelector('.ml-tab-btn[data-ml-tab="cohorts"]');
                if (cohortTab) {
                    cohortTab.click();
                }
                await delay(4000);
                
                // Switch to Tab 3: Model Playground
                const playgroundTab = document.querySelector('.ml-tab-btn[data-ml-tab="playground"]');
                if (playgroundTab) {
                    playgroundTab.click();
                }
                await delay(2000);
                
                const runMlBtn = document.getElementById("run-ml-model-btn");
                if (runMlBtn) {
                    runMlBtn.click();
                }
                await delay(4000);
            },
            cleanup: () => {
                const closeMlBtn = document.getElementById("close-ml-modal-btn");
                if (closeMlBtn) closeMlBtn.click();
                
                const mlModal = document.getElementById("ml-charts-modal");
                if (mlModal) {
                    mlModal.classList.remove("tour-highlight");
                }
                
                const container = document.getElementById("visitor-container");
                if (container) {
                    container.classList.remove("tour-highlight");
                    container.classList.remove("active");
                }
                
                const widget = document.getElementById("visitor-analytics-widget");
                if (widget) {
                    widget.style.zIndex = ""; // Restore original z-index
                }
            }
        },
        {
            title: "Technical Skills & Learning Log",
            desc: "Take a look at Deshraj's skills category cards, followed by the 'Today I Learned' (TIL) logging repository showcasing his ongoing study topics.",
            target: "#skills",
            duration: 8000,
            action: async () => {
                const skills = document.getElementById("skills");
                if (skills) {
                    skills.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    skills.classList.add("tour-highlight");
                }
                await delay(3000);
                if (skills) skills.classList.remove("tour-highlight");
                
                const learning = document.getElementById("learning");
                if (learning) {
                    learning.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    learning.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const skills = document.getElementById("skills");
                if (skills) skills.classList.remove("tour-highlight");
                const learning = document.getElementById("learning");
                if (learning) learning.classList.remove("tour-highlight");
            }
        },
        {
            title: "Career Assistant Chatbot",
            desc: "Finally, let's open the AI assistant. The tour will type and send: 'summarize his 5 years of experience' so you can see live RAG retrieval in action.",
            target: "#chat-launcher",
            duration: 22000,
            action: async () => {
                const widget = document.getElementById("ai-chat-widget");
                if (widget) widget.style.zIndex = "100003";

                const launcher = document.getElementById("chat-launcher");
                if (launcher) {
                    launcher.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    launcher.classList.add("tour-highlight");
                    await delay(1000);
                    launcher.click();
                }
                await delay(1000);
                if (launcher) launcher.classList.remove("tour-highlight");
                
                const chatContainer = document.getElementById("chat-container");
                if (chatContainer) {
                    chatContainer.classList.add("tour-highlight");
                }
                await delay(800);
                
                const inputEl = document.getElementById("chat-input");
                if (inputEl) {
                    const text = "summarize his 5 years of experience";
                    inputEl.value = "";
                    for (let i = 0; i < text.length; i++) {
                        inputEl.value += text[i];
                        inputEl.dispatchEvent(new Event('input'));
                        await delay(40);
                    }
                }
                await delay(1000);
                
                const chatForm = document.getElementById("chat-form");
                if (chatForm) {
                    chatForm.dispatchEvent(new Event('submit'));
                }
            },
            cleanup: () => {
                const widget = document.getElementById("ai-chat-widget");
                if (widget) widget.style.zIndex = "";

                const chatContainer = document.getElementById("chat-container");
                if (chatContainer) chatContainer.classList.remove("tour-highlight");
            }
        },
        {
            title: "Tour Completed!",
            desc: "Thank you for completing the tour! You've seen Deshraj's full pipeline dashboard, SQL queries, statistical models, and RAG AI chatbot. Connect with him below!",
            target: "#contact",
            duration: 10000,
            action: async () => {
                const contactSec = document.getElementById("contact");
                if (contactSec) {
                    contactSec.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    contactSec.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const contactSec = document.getElementById("contact");
                if (contactSec) contactSec.classList.remove("tour-highlight");
                
                const closeChatBtn = document.getElementById("close-chat-btn");
                if (closeChatBtn) closeChatBtn.click();
            }
        }
    ];

    function startStepTimer(duration) {
        clearStepTimer();
        if (tourMode !== 'autoplay' || isAutoplayPaused) return;

        stepDuration = duration;
        stepTimeElapsed = 0;

        const progressBar = document.getElementById("tour-progress-bar");
        const progressContainer = document.getElementById("tour-progress-container");
        if (progressContainer) progressContainer.style.display = "block";
        if (progressBar) progressBar.style.width = "0%";

        progressIntervalId = setInterval(() => {
            stepTimeElapsed += PROGRESS_TICK;
            const percentage = Math.min((stepTimeElapsed / stepDuration) * 100, 100);
            if (progressBar) progressBar.style.width = `${percentage}%`;

            if (stepTimeElapsed >= stepDuration) {
                clearStepTimer();
                advanceTourAutomatically();
            }
        }, PROGRESS_TICK);
    }

    function pauseStepTimer() {
        if (tourMode !== 'autoplay' || isAutoplayPaused) return;
        isAutoplayPaused = true;
        if (progressIntervalId) {
            clearInterval(progressIntervalId);
            progressIntervalId = null;
        }
        updatePausePlayButtonUI();
    }

    function resumeStepTimer() {
        if (tourMode !== 'autoplay' || !isAutoplayPaused) return;
        isAutoplayPaused = false;
        updatePausePlayButtonUI();

        const progressBar = document.getElementById("tour-progress-bar");

        progressIntervalId = setInterval(() => {
            stepTimeElapsed += PROGRESS_TICK;
            const percentage = Math.min((stepTimeElapsed / stepDuration) * 100, 100);
            if (progressBar) progressBar.style.width = `${percentage}%`;

            if (stepTimeElapsed >= stepDuration) {
                clearStepTimer();
                advanceTourAutomatically();
            }
        }, PROGRESS_TICK);
    }

    function clearStepTimer() {
        if (progressIntervalId) {
            clearInterval(progressIntervalId);
            progressIntervalId = null;
        }
    }

    async function advanceTourAutomatically() {
        if (tourCurrentStep < tourSteps.length - 1) {
            await showTourStep(tourCurrentStep + 1);
        } else {
            endTour();
        }
    }

    function updatePausePlayButtonUI() {
        const pausePlayIcon = document.getElementById("tour-pause-play-icon");
        const pausePlayText = document.getElementById("tour-pause-play-text");
        if (isAutoplayPaused) {
            if (pausePlayIcon) pausePlayIcon.textContent = "▶️";
            if (pausePlayText) pausePlayText.textContent = "Resume";
        } else {
            if (pausePlayIcon) pausePlayIcon.textContent = "⏸️";
            if (pausePlayText) pausePlayText.textContent = "Pause";
        }
    }

    async function startTour() {
        tourCurrentStep = 0;
        tourMode = 'manual'; // defaults, waits for Step 1 click
        tourOverlay.style.display = "block";
        tourBackdrop.style.display = "block";
        await showTourStep(0);
    }

    function endTour() {
        clearStepTimer();
        cancelPendingTourDelays();
        if (tourSteps[tourCurrentStep].cleanup) {
            tourSteps[tourCurrentStep].cleanup();
        }
        
        tourSteps.forEach(step => {
            if (step.target) {
                const el = document.querySelector(step.target);
                if (el) el.classList.remove("tour-highlight");
            }
        });
        
        const chatWidget = document.getElementById("ai-chat-widget");
        if (chatWidget) chatWidget.style.zIndex = "";
        
        const progressContainer = document.getElementById("tour-progress-container");
        if (progressContainer) progressContainer.style.display = "none";
        
        tourOverlay.style.display = "none";
        tourBackdrop.style.display = "none";
    }

    async function showTourStep(stepIdx) {
        clearStepTimer();
        cancelPendingTourDelays();

        if (stepIdx > 0 && tourSteps[stepIdx - 1].cleanup) {
            tourSteps[stepIdx - 1].cleanup();
        }
        if (stepIdx < tourSteps.length - 1 && tourSteps[stepIdx + 1].cleanup) {
            tourSteps[stepIdx + 1].cleanup();
        }
        
        tourCurrentStep = stepIdx;
        
        const modeSelector = document.getElementById("tour-mode-selector");
        if (stepIdx === 0) {
            if (modeSelector) modeSelector.style.display = "flex";
            tourPrevBtn.style.display = "none";
            tourNextBtn.style.display = "none";
            if (tourPausePlayBtn) tourPausePlayBtn.style.display = "none";
            
            const progressContainer = document.getElementById("tour-progress-container");
            if (progressContainer) progressContainer.style.display = "none";
        } else {
            if (modeSelector) modeSelector.style.display = "none";
            tourPrevBtn.style.display = "inline-block";
            tourNextBtn.style.display = "inline-block";
            tourPrevBtn.style.visibility = stepIdx === 0 ? "hidden" : "visible";
            tourNextBtn.textContent = stepIdx === tourSteps.length - 1 ? "Finish" : "Next Step";

            const progressContainer = document.getElementById("tour-progress-container");
            if (tourMode === 'autoplay') {
                if (progressContainer) progressContainer.style.display = "block";
                if (tourPausePlayBtn) {
                    tourPausePlayBtn.style.display = "flex";
                    tourPausePlayBtn.style.alignItems = "center";
                }
            } else {
                if (progressContainer) progressContainer.style.display = "none";
                if (tourPausePlayBtn) tourPausePlayBtn.style.display = "none";
            }
        }
        
        tourStepIndicator.textContent = `Step ${stepIdx + 1} of ${tourSteps.length}`;
        tourTitle.textContent = tourSteps[stepIdx].title;
        tourDesc.textContent = tourSteps[stepIdx].desc;
        
        if (tourSteps[stepIdx].action) {
            try {
                await tourSteps[stepIdx].action();
            } catch (err) {
                if (err.message === "TourStepAborted") {
                    console.log("Tour step action aborted successfully");
                    return;
                }
                console.error("Error in tour step action:", err);
            }
        }

        if (tourMode === 'autoplay' && stepIdx > 0) {
            isAutoplayPaused = false;
            updatePausePlayButtonUI();
            startStepTimer(tourSteps[stepIdx].duration || 5000);
        }
    }

    if (tourNextBtn) {
        tourNextBtn.addEventListener("click", async () => {
            if (tourCurrentStep < tourSteps.length - 1) {
                await showTourStep(tourCurrentStep + 1);
            } else {
                endTour();
            }
        });
    }

    if (tourPrevBtn) {
        tourPrevBtn.addEventListener("click", async () => {
            if (tourCurrentStep > 0) {
                await showTourStep(tourCurrentStep - 1);
            }
        });
    }

    if (tourSkipBtn) {
        tourSkipBtn.addEventListener("click", () => {
            endTour();
        });
    }

    if (tourPausePlayBtn) {
        tourPausePlayBtn.addEventListener("click", () => {
            if (isAutoplayPaused) {
                resumeStepTimer();
            } else {
                pauseStepTimer();
            }
        });
    }

    const btnAutoplay = document.getElementById("tour-btn-autoplay");
    const btnManual = document.getElementById("tour-btn-manual");
    
    if (btnAutoplay) {
        btnAutoplay.addEventListener("click", async () => {
            tourMode = 'autoplay';
            isAutoplayPaused = false;
            await showTourStep(1);
        });
    }
    
    if (btnManual) {
        btnManual.addEventListener("click", async () => {
            tourMode = 'manual';
            await showTourStep(1);
        });
    }

    const tourNavBtn = document.getElementById("tour-nav-btn");
    const startTourBtn = document.getElementById("start-tour-btn");
    
    if (tourNavBtn) {
        tourNavBtn.addEventListener("click", (e) => {
            e.preventDefault();
            startTour();
        });
    }
    if (startTourBtn) {
        startTourBtn.addEventListener("click", (e) => {
            e.preventDefault();
            startTour();
        });
    }
});
