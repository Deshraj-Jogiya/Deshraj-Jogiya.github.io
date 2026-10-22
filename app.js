/* ==========================================================================
   JavaScript Functionality for Deshraj Jogiya's Portfolio Website
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Recommendations: expand / collapse the full text of long recommendations
    document.querySelectorAll(".testimonial-toggle").forEach((btn) => {
        btn.addEventListener("click", () => {
            const quote = document.getElementById(btn.getAttribute("aria-controls"));
            if (!quote) return;
            const expanded = quote.classList.toggle("expanded");
            btn.setAttribute("aria-expanded", String(expanded));
            btn.textContent = expanded ? "Show less" : "Read full recommendation";
        });
    });

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
        if (!countryCode) return "";
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
            const res = await fetch("/assets/visitor_stats.json");
            if (res.ok) {
                const stats = await res.json();
                const countEl = document.getElementById("visitor-count");
                const todayEl = document.getElementById("visitor-today");
                const forecastEl = document.getElementById("visitor-forecast-val");

                if (countEl) countEl.textContent = stats.unique_visitors ?? stats.total_visits ?? "...";
                if (forecastEl) forecastEl.textContent = stats.forecasted_next_week ?? "...";
                // Real count from the last pipeline run (every 12 hours); no simulated live movement
                if (todayEl) todayEl.textContent = stats.visitors_today ?? "...";
                const sinceEl = document.getElementById("visitor-since");
                if (sinceEl && stats.first_visit) {
                    sinceEl.textContent = new Date(stats.first_visit + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
                }
            }
        } catch (e) {
            console.error("Failed to load visitor stats:", e);
        }
    }

    logVisit();
    updateVisitorStatsUI();

    // 1. Role rotator: types each role, erases it and moves to the next, looping through all of them for as long as the page is open.
    // With reduced motion requested it shows one static line instead.
    const typingEl = document.getElementById("typing-text");
    const words = ["Data Engineer", "Machine Learning Engineer", "Data Pipeline Engineer", "Analytics Engineer",
                   "LLM & RAG Engineer", "MLOps & Data Quality Engineer"];
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (typingEl && reduceMotion) {
        typingEl.textContent = "Data Engineer · ML Engineer";
    } else if (typingEl) {
        let i = 0, pos = 0, erasing = false;
        const tick = () => {
            const word = words[i];
            pos += erasing ? -1 : 1;
            typingEl.textContent = word.slice(0, pos);
            if (!erasing && pos === word.length) { erasing = true; return setTimeout(tick, 1700); }
            if (erasing && pos === 0) { erasing = false; i = (i + 1) % words.length; return setTimeout(tick, 350); }
            setTimeout(tick, erasing ? 30 : 70);
        };
        tick();
    }

    // 2. Stats Counter Animation
    const counters = document.querySelectorAll(".stat-number");

    // Counts each stat up from zero to its data-target, then shows it with its data-suffix and data-decimals
    const startCounters = () => {
        counters.forEach(counter => {
            const target = parseFloat(counter.dataset.target);
            const suffix = counter.dataset.suffix || "";
            const decimals = parseInt(counter.dataset.decimals || "0", 10);
            const show = v => { counter.textContent = v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix; };
            if (reduceMotion || !isFinite(target)) { show(target); return; }
            const start = performance.now(), ms = 1200;
            const step = now => {
                const t = Math.min((now - start) / ms, 1);
                show(target * (1 - Math.pow(1 - t, 3)));
                if (t < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
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
    const projectCards = document.querySelectorAll(".projects-grid:not(.team-grid) .project-card");

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

    // The lightbox exists only on the home page
    if (modal && modalImg && closeBtn) {
        viewButtons.forEach(button => {
            button.addEventListener("click", () => {
                const dashboardSrc = button.getAttribute("data-dashboard");
                modalImg.src = dashboardSrc;
                const titleEl = document.getElementById("modal-dashboard-title");
                if (titleEl) titleEl.textContent = button.getAttribute("data-title") || "Project chart";
                modalImg.alt = (button.getAttribute("data-title") || "Project") + " chart";
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

    }

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
        themeIcon.textContent = "◑";
    } else {
        document.body.classList.remove("light-theme");
        themeIcon.textContent = "◐";
    }

    themeToggleBtn.addEventListener("click", () => {
        if (document.body.classList.contains("light-theme")) {
            document.body.classList.remove("light-theme");
            themeIcon.textContent = "◐";
            localStorage.setItem("theme", "dark");
        } else {
            document.body.classList.add("light-theme");
            themeIcon.textContent = "◑";
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
    
    if (resumeModal) resumeModal.addEventListener("click", (e) => {
        if (e.target === resumeModal) {
            closeResume();
        }
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && resumeModal && resumeModal.classList.contains("active")) {
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
                    formResult.textContent = "Message sent successfully! ";
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
                    <span style="font-weight: 700; color: var(--text-primary);">Validation Status: <span style="color: var(--accent-amber);">VALIDATING... </span></span>
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
                <span style="font-weight: 700; color: var(--text-primary);">Validation Status: <span style="color: var(--accent-emerald);">PASS </span></span>
                <span style="font-size: 0.72rem; color: var(--text-muted);">6/6 Expectations Succeeded</span>
            </div>
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.2); border-radius: var(--border-radius-sm); padding: 0.6rem; font-size: 0.75rem; color: #f59e0b; margin-bottom: 0.75rem; line-height: 1.4;">
                 <strong>Non-blocking Warning on Benford's Law:</strong> This check detects mild transaction distribution drift. The schema is 100% valid and the pipeline passed, but this warning is logged for analytics auditing.
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
            runObsBtn.textContent = "Processing ETL Pipeline... ";
            
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
                        metricDrift.textContent = "Warning ";
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
                    runObsBtn.textContent = "Run Pipeline Diagnostics ";
                    
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
        },
        career_pilot_intake: {
                    "raw": "SELECT\n  source AS intake_source,\n  COUNT(*) AS postings\nFROM job_postings\nGROUP BY source\nORDER BY postings DESC;",
                    "html": "<span class=\"sql-keyword\">SELECT</span>\n  source <span class=\"sql-keyword\">AS</span> intake_source,\n  <span class=\"sql-keyword\">COUNT</span>(*) <span class=\"sql-keyword\">AS</span> postings\n<span class=\"sql-keyword\">FROM</span> <span class=\"sql-table\">job_postings</span>\n<span class=\"sql-keyword\">GROUP BY</span> source\n<span class=\"sql-keyword\">ORDER BY</span> postings <span class=\"sql-keyword\">DESC</span>;",
                    "headers": [
                                "intake_source",
                                "postings"
                    ],
                    "data": [
                                [
                                            "manual (Chrome extension add)",
                                            "18"
                                ],
                                [
                                            "greenhouse",
                                            "10"
                                ],
                                [
                                            "ashby",
                                            "9"
                                ],
                                [
                                            "jobspipe",
                                            "4"
                                ],
                                [
                                            "linkedin",
                                            "2"
                                ]
                    ]
        },
        dbt_application_outcomes: {
                    "raw": "SELECT\n  status,\n  COUNT(*) AS applications,\n  COUNT(*) FILTER (WHERE reached_interview) AS reached_interview,\n  ROUND(AVG(days_to_decision), 1) AS avg_days_to_decision\nFROM fct_application\nGROUP BY status\nORDER BY applications DESC;",
                    "html": "<span class=\"sql-keyword\">SELECT</span>\n  status,\n  <span class=\"sql-keyword\">COUNT</span>(*) <span class=\"sql-keyword\">AS</span> applications,\n  <span class=\"sql-keyword\">COUNT</span>(*) <span class=\"sql-keyword\">FILTER</span> (<span class=\"sql-keyword\">WHERE</span> reached_interview) <span class=\"sql-keyword\">AS</span> reached_interview,\n  <span class=\"sql-keyword\">ROUND</span>(<span class=\"sql-keyword\">AVG</span>(days_to_decision), <span class=\"sql-number\">1</span>) <span class=\"sql-keyword\">AS</span> avg_days_to_decision\n<span class=\"sql-keyword\">FROM</span> <span class=\"sql-table\">fct_application</span>\n<span class=\"sql-keyword\">GROUP BY</span> status\n<span class=\"sql-keyword\">ORDER BY</span> applications <span class=\"sql-keyword\">DESC</span>;",
                    "headers": [
                                "status",
                                "applications",
                                "reached_interview",
                                "avg_days_to_decision"
                    ],
                    "data": [
                                [
                                            "rejected",
                                            "6",
                                            "5",
                                            "7.5"
                                ],
                                [
                                            "applied",
                                            "3",
                                            "0",
                                            "-"
                                ],
                                [
                                            "interviewing",
                                            "2",
                                            "2",
                                            "-"
                                ],
                                [
                                            "offer",
                                            "2",
                                            "2",
                                            "22.5"
                                ],
                                [
                                            "screening",
                                            "2",
                                            "0",
                                            "-"
                                ],
                                [
                                            "withdrawn",
                                            "2",
                                            "0",
                                            "2.0"
                                ]
                    ]
        },
        lakehouse_salary_by_industry: {
                    "raw": "SELECT\n  c.industry,\n  COUNT(*) AS posting_count,\n  ROUND(AVG(p.salary_usd), 2) AS avg_salary,\n  MAX(p.salary_usd) AS max_salary\nFROM raw_postings p\nJOIN raw_companies c ON p.company_id = c.company_id\nGROUP BY c.industry\nORDER BY avg_salary DESC;",
                    "html": "<span class=\"sql-keyword\">SELECT</span>\n  c.industry,\n  <span class=\"sql-keyword\">COUNT</span>(*) <span class=\"sql-keyword\">AS</span> posting_count,\n  <span class=\"sql-keyword\">ROUND</span>(<span class=\"sql-keyword\">AVG</span>(p.salary_usd), <span class=\"sql-number\">2</span>) <span class=\"sql-keyword\">AS</span> avg_salary,\n  <span class=\"sql-keyword\">MAX</span>(p.salary_usd) <span class=\"sql-keyword\">AS</span> max_salary\n<span class=\"sql-keyword\">FROM</span> <span class=\"sql-table\">raw_postings</span> p\n<span class=\"sql-keyword\">JOIN</span> <span class=\"sql-table\">raw_companies</span> c <span class=\"sql-keyword\">ON</span> p.company_id = c.company_id\n<span class=\"sql-keyword\">GROUP BY</span> c.industry\n<span class=\"sql-keyword\">ORDER BY</span> avg_salary <span class=\"sql-keyword\">DESC</span>;",
                    "headers": [
                                "industry",
                                "posting_count",
                                "avg_salary",
                                "max_salary"
                    ],
                    "data": [
                                [
                                            "Healthcare",
                                            "7,595",
                                            "$131,541.87",
                                            "$204,979"
                                ],
                                [
                                            "Retail",
                                            "9,096",
                                            "$131,271.01",
                                            "$204,986"
                                ],
                                [
                                            "Software",
                                            "7,501",
                                            "$131,244.72",
                                            "$204,956"
                                ],
                                [
                                            "Manufacturing",
                                            "8,248",
                                            "$131,189.78",
                                            "$204,992"
                                ],
                                [
                                            "Energy",
                                            "8,225",
                                            "$131,042.77",
                                            "$205,000"
                                ],
                                [
                                            "Finance",
                                            "9,394",
                                            "$130,692.52",
                                            "$204,985"
                                ],
                                [
                                            "Logistics",
                                            "9,941",
                                            "$130,672.83",
                                            "$204,994"
                                ]
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
        career_pilot_intake: {"text": "Business Value: Career Pilot pulls postings from 7 applicant-tracking systems' job-board APIs and from the browser extension, scores them, and only then spends money on LLM tailoring. Knowing which source actually feeds the pipeline decides where polling effort goes. Live snapshot of the production database (16 Oct 2026).", "takeaway": "Key Skills: Multi-source ingestion, PostgreSQL (Supabase) data modeling, and production pipeline monitoring."},
        dbt_application_outcomes: {"text": "Business Value: The dbt project models raw application events into dimension and fact tables on a live Databricks SQL warehouse, so questions like 'how long until a decision' become one query instead of spreadsheet work. 15 dbt tests and a business-rule test (no decision dated before its application) run in CI on every push.", "takeaway": "Key Skills: dbt dimensional modeling, Databricks SQL, data tests, and CI for data pipelines."},
        lakehouse_salary_by_industry: {"text": "Business Value: A PySpark job joins 60,000 synthetic postings to 400 companies, aggregates salary statistics and ranks postings per industry with a window function; 11 Great Expectations checks validate the output before anything downstream reads it, orchestrated as an Airflow DAG.", "takeaway": "Key Skills: PySpark and Spark SQL, window functions, Great Expectations data quality, and Airflow orchestration."},
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

        const purpleGrad = "rgba(242, 169, 59, 0.75)";
        const purpleBorder = "rgba(242, 169, 59, 1)";
        const emeraldGrad = "rgba(16, 185, 129, 0.75)";
        const emeraldBorder = "rgba(16, 185, 129, 1)";
        const amberGrad = "rgba(245, 158, 11, 0.75)";
        const amberBorder = "rgba(245, 158, 11, 1)";
        const roseGrad = "rgba(239, 68, 68, 0.75)";
        const roseBorder = "rgba(239, 68, 68, 1)";
        const blueGrad = "rgba(242, 169, 59, 0.75)";
        const blueBorder = "rgba(242, 169, 59, 1)";

        if (selected === "revenue_by_segment") {
            chartType = "pie";
            chartLabel = "Revenue ($)";
            query.data.forEach(row => {
                labels.push(row[0]);
                const val = parseFloat(row[3].replace(/[$,]/g, ""));
                chartData.push(val);
            });
            bgColors = ["rgba(242, 169, 59, 0.7)", "rgba(242, 169, 59, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(100, 116, 139, 0.7)"];
            borderColors = ["#f2a93b", "#f2a93b", "#f59e0b", "#64748b"];
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
            bgColors = ["rgba(16, 185, 129, 0.7)", "rgba(242, 169, 59, 0.7)", "rgba(245, 158, 11, 0.7)", "rgba(239, 68, 68, 0.7)"];
            borderColors = ["#10b981", "#f2a93b", "#f59e0b", "#ef4444"];
        } else if (selected === "iot_telematics") {
            chartType = "bar";
            chartLabel = "Anomaly Alerts";
            query.data.forEach(row => {
                labels.push(row[0]);
                chartData.push(parseInt(row[3]));
            });
            bgColors = [roseGrad, amberGrad, "rgba(100, 116, 139, 0.7)"];
            borderColors = [roseBorder, amberBorder, "#64748b"];
        } else if (selected === "career_pilot_intake") {
            chartType = "doughnut";
            chartLabel = "Postings";
            query.data.forEach(row => { labels.push(row[0]); chartData.push(parseInt(row[1].replace(/,/g, ""))); });
            bgColors = [purpleGrad, blueGrad, emeraldGrad, amberGrad, "rgba(100, 116, 139, 0.7)"];
            borderColors = [purpleBorder, blueBorder, emeraldBorder, amberBorder, "#64748b"];
        } else if (selected === "dbt_application_outcomes") {
            chartType = "bar";
            chartLabel = "Applications";
            query.data.forEach(row => { labels.push(row[0]); chartData.push(parseInt(row[1])); });
            bgColors = query.data.map(row => row[0] === "offer" ? emeraldGrad : row[0] === "rejected" ? roseGrad : blueGrad);
            borderColors = query.data.map(row => row[0] === "offer" ? emeraldBorder : row[0] === "rejected" ? roseBorder : blueBorder);
        } else if (selected === "lakehouse_salary_by_industry") {
            chartType = "bar";
            chartLabel = "Postings per industry";
            query.data.forEach(row => { labels.push(row[0]); chartData.push(parseInt(row[1].replace(/,/g, ""))); });
            bgColors = Array(query.data.length).fill(purpleGrad);
            borderColors = Array(query.data.length).fill(purpleBorder);
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
                            cellStyle = "style='color: #f2a93b; font-weight: bold;'";
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

    // In-memory only (cleared on page reload) -- lets the bot handle a
    // natural follow-up like "tell me more about that" instead of treating
    // every message as a fresh, context-free question. Capped so a long
    // session doesn't balloon the request size sent to the LLM.
    let conversationHistory = [];
    const MAX_HISTORY_TURNS = 6;
    const pushHistory = (role, text) => {
        conversationHistory.push({ role, text });
        if (conversationHistory.length > MAX_HISTORY_TURNS * 2) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY_TURNS * 2);
        }
    };

    if (chatLauncher && chatContainer) {
        chatLauncher.addEventListener("click", () => {
            chatContainer.classList.toggle("active");
            if (chatContainer.classList.contains("active")) {
                chatInput.focus();
            }
        });
    }

    // Hero CTA is a second entry point into the same widget -- the
    // launcher button alone was easy to miss on first load, and the chat
    // feature is worth surfacing earlier than scroll-to-discover.
    const askAiHeroBtn = document.getElementById("ask-ai-hero-btn");
    if (askAiHeroBtn && chatLauncher) {
        askAiHeroBtn.addEventListener("click", () => chatLauncher.click());
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
        gpa: "Deshraj earned a perfect 4.0/4.0 GPA during his Master of Science in IT at Arizona State University.",
        python: "Python is Deshraj's primary language: ETL pipelines with Pandas and PySpark, Great Expectations data-quality checks, FastAPI services, and machine learning models with Scikit-Learn (Random Forest, XGBoost) and TensorFlow/Keras (CNNs).",
        asu: "Deshraj completed his Master of Science in IT at Arizona State University with a perfect 4.0/4.0 GPA.",
        contact: "You can reach Deshraj directly via email at djogiya786@gmail.com. He is actively interviewing for Data Engineer, Machine Learning Engineer and Analytics Engineer roles.",
        cloud: "Deshraj builds secure, high-throughput cloud architectures using AWS (Glue ETL, S3 data lakes), Snowflake OLAP star schemas, Azure ADLS Gen2, and Supabase serverless backends.",
        experience: "Deshraj has 3+ years of experience as a data engineer and machine learning engineer. Highlights: 25% better recommendation accuracy and 30% fewer model deployment errors at Technoid, 60% faster ingestion and a 98%+ data reliability standard at Zifatech, and 30% faster robotics data processing at Objectways.",
        projects: "Deshraj's top repositories include Career Pilot (a deployed FastAPI/PostgreSQL job-search platform with LLM agents, a non-LLM guardrail and a Chrome extension), TalentVenue EventIntel (Azure ADLS Gen2, Snowflake and Terraform), the Job Search dbt Warehouse on Databricks, and CurioSync (a serverless publisher). Explore the Projects section for all 30.",
        observability: "Deshraj integrates automated Great Expectations QA data rules into ingestion cycles and runs Kolmogorov-Smirnov (KS) tests to flag feature drift before it affects model performance.",
        skills: "Deshraj specializes in Python (FastAPI, Pandas, PySpark), SQL (PostgreSQL, Snowflake), AWS Glue/S3, Azure ADLS Gen2, Supabase, Scikit-Learn, TensorFlow, Great Expectations, Power BI, and Tableau.",
        analytics: "Deshraj models dimensional Star Schemas in Snowflake and PostgreSQL, developing interactive Power BI and Tableau dashboards that cut reporting cycles by 30% and lift customer acquisition by 12%.",
        objectways: "At Objectways Technologies, Deshraj scaled teleoperation ingestion pipelines in Python, Scala, and Kubernetes, processing 10,000+ robotics telemetry samples and cutting data processing time by 30%.",
        technoid: "At Technoid LLC, Deshraj optimized GPT-4o mini models (+25% recommendation accuracy), restructured Supabase/PostgreSQL RLS sync (-65% latency), and built regression frameworks (-30% deployment errors).",
        zifatech: "At Zifatech Solutions, Deshraj migrated legacy database workflows to AWS Glue & S3 (+60% data availability), automated sales ETL (-70% manual effort), and set up Great Expectations QA (98%+ reliability).",
        elevateme: "Through the ElevateMe Bootcamp, Deshraj built C# and .NET services on SQL Server with automated ETL routines (45% better query performance), segmented customers with K-Means and PCA (personas capturing 92% of variance), and delivered Power BI KPI dashboards.",
        kronic: "At Kronic Keys, Deshraj cleaned 500k+ row financial datasets in PostgreSQL, building Tableau dashboards that cut monthly reporting cycles by 30%.",
        talentvenue: "TalentVenue EventIntel is an enterprise BI & predictive ML platform. Deshraj engineered a conformed Azure ADLS Gen2 landing zone, Snowflake OLAP Star Schema, SHA-256 PII tokenization, and a Random Forest contract cancellation risk classifier in Streamlit.",
        deployment_errors: "At Technoid LLC, Deshraj reduced model deployment errors by 30% across AWS and Azure environments by establishing automated, phased regression and UAT testing frameworks in PyTest.",
        sync_latency: "At Technoid LLC, data synchronization latency fell 65%: Deshraj restructured Supabase data sync layers with PostgreSQL row-level security fixes and architected Core Java, Spring Boot and Python backend microservices and RESTful APIs.",
        recommendation_accuracy: "At Technoid LLC, Deshraj raised candidate-resume recommendation accuracy by 25% by optimizing GPT-4o mini models with OpenAI APIs, SQL and PostgreSQL.",
        location: "Deshraj is located in Tempe, Arizona (Phoenix Metropolitan Area), United States. He is open to relocation to major technology hubs nationwide for Data Engineering and ML Engineering roles.",
        current_doing: "Deshraj currently works as a Teleoperation Data Collection Associate at Objectways Technologies LLC in Tempe, AZ, building Python, Scala, PySpark and Kubernetes pipelines for robotics data. Alongside it he runs Career Pilot, his deployed job-search platform with LLM agents.",
        best_work: "Deshraj's strongest work joins data engineering with production AI. At Technoid LLC he raised recommendation accuracy 25% and cut model deployment errors 30%; at Zifatech he sped ingestion 60% and held a 98%+ data reliability standard. His flagship project is Career Pilot, a deployed AI platform with a guardrail on every generated claim, a daily spend cap and 1,100+ automated tests. Ask about Data Engineering, Machine Learning, or Career Pilot to go deeper.",
        emissions: "Multi-State Land Use Emissions Analysis is a land-use emissions ETL for 5 U.S. states built on the EPA's real state greenhouse-gas inventory (1990-2022): EPA-derived emission factors, a year-ahead forecast at 94.2% accuracy, shock detection with GeoPandas map layers on Census boundaries, and 10.2 hours of manual preparation replaced each week.",
        fintech: "FinTech Credit Risk & Fraud Command Center is an end-to-end credit-risk pipeline: a Random Forest at 93.4% precision on declined loans (0.92 ROC-AUC) tracked in MLflow, rule-based fraud flags that caught all 1,110 planted card-testing charges, and a FastAPI service with REST and GraphQL answering in 67 ms median.",
        telematics: "IoT Telematics & Predictive Maintenance processes streaming EV battery and motor telemetry in micro-batches: Z-score detection catches 98.1% of planted sensor spikes at 90.5% precision, and a JIT-compiled Jax recurrence estimates battery remaining useful life.",
        stem: "Extending STEM across ASL is an accessibility platform that teaches 7 core STEM concepts in American Sign Language. It recognises 29 STEM and computing word signs from video (MediaPipe hand landmarks, OpenCV contour features and a PyTorch GRU: 75.9% top-1 and 94.8% top-3 on held-out WLASL clips), works live from a webcam, and keeps a TensorFlow/Keras CNN for fingerspelled letters. The original 2023 version earned a 4.6/5 rating from 50+ STEM students.",
        sales: "Sales Analytics & RFM Customer Segmentation automates RFM scaling and K-Means clustering in Python over a 100k+ transaction star schema, identifying 4 customer personas, with an interactive Power BI report for marketing teams.",
        anomaly: "Tax Anomaly Audit Compliance Engine scores general-ledger entries with Benford's Law, an Isolation Forest and a tax-rate rule: 97.8% precision and 95.7% recall against known injected anomalies, and an auditor finds 90% of them after 43 entries instead of 1,108. It runs as a Dagster asset graph.",
        simulation: "AI-ML Data Science Simulation automates daily sales ingestion for 5 branches and forecasts demand at 90% accuracy (1 - WAPE) against a 78.4% naive baseline; in a reorder simulation, forecast-driven ordering cut stock-out days by 60.8%.",
        observability_project: "AI Model Observability & Fairness Audits runs KS and PSI drift tests and disparate-impact and equal-opportunity checks on deployed models, writes alerts to an audit table, and publishes a Tableau dashboard over 30,000 simulated inference records."
    };

    answers.recommendations = "Deshraj has four LinkedIn recommendations, shown word for word in the Recommendations section: Michelle M Licata (Director of Career Services, who managed him at ElevateMe Bootcamp) highlights his K-Means segmentation work capturing 92% of variance; Dr. John A. Lewis (ASU professor) highlights his ASL recognition Master's project; Kaxa Dholakia and Ridham Dholakia recommend him from development projects they worked on together.";

    const searchKeyword = (msg) => {
        const query = msg.toLowerCase();
        
        // 0. Location, Current Role, Best Work & Achievement metrics matching
        if (query.includes("testimonial") || query.includes("reference") || query.includes("what do people say") || query.includes("what others say") || (query.includes("recommend") && !query.includes("accuracy") && !query.includes("engine") && !query.includes("system") && !query.includes("25%"))) return answers.recommendations;
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
        if (query.includes("stem") || query.includes("asl") || query.includes("sign language") || query.includes("tensorflow") || query.includes("keras") || query.includes("mediapipe")) return answers.stem;
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
        
        if (sender === "bot") {
            // Securely escape HTML tags and render simple markdown (bold text, list bullets, newlines)
            let html = text
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/^\s*[-*]\s+(.*)$/gm, "• $1")
                .replace(/\n/g, "<br>");
            msgEl.innerHTML = html;
        } else {
            msgEl.textContent = text;
        }
        
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
                    pushHistory("user", userQuery);
                    pushHistory("assistant", cacheData[0].answer);
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
                body: JSON.stringify({
                    message: userQuery + " (Important: Keep the response concise, professional, and recruiter-friendly. Format the response to align with Professional Competency Profile (PCP), Core Capability Statement (CCS), and Career Performance Portfolio (CPP) standards using the structured STAR format (Situation, Task, Action, Result) for experience descriptions. Use clean bullet points (starting with '-' or '*') for lists, bold key terms/achievements, and keep paragraphs short. Avoid long storytelling narratives.)",
                    history: conversationHistory
                })
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
            pushHistory("user", userQuery);
            pushHistory("assistant", reply);

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
        careerpilot: {
                    "nodes": [
                                {
                                            "id": "cp_ingest",
                                            "label": "Ingest",
                                            "icon": "",
                                            "tags": [
                                                        "Python",
                                                        "REST APIs",
                                                        "7 ATS boards"
                                            ],
                                            "desc": "Polls the public job-board APIs of Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Recruitee and Personio for tracked companies, filtering by title keywords, seniority and location before anything is stored.",
                                            "impact": "One intake path for every source, so new postings arrive without manual searching; company-name cross-checks stop false-positive board matches.",
                                            "inputs": "ATS job-board APIs",
                                            "process": "Keyword & location filters",
                                            "outputs": "Raw postings",
                                            "code": "resp = requests.get(\n    f\"https://boards-api.greenhouse.io/v1/boards/{company.greenhouse_slug}/jobs\",\n    params={\"content\": \"true\"}, timeout=_TIMEOUT,\n)\nfor job in resp.json().get(\"jobs\", []):\n    title = job.get(\"title\", \"\")\n    if not title or not posting_matches(title, keywords, exclusions):\n        continue\n    location = (job.get(\"location\") or {}).get(\"name\")\n    if not location_allowed(location, location_exclusions):\n        continue\n    postings.append(RawPosting(source=SOURCE_NAME, job_title=title, ...))"
                                },
                                {
                                            "id": "cp_score",
                                            "label": "Score",
                                            "icon": "",
                                            "tags": [
                                                        "Python",
                                                        "PostgreSQL"
                                            ],
                                            "desc": "Computes a free mechanical score first (title match, recency, sponsorship signals, company tier) and only then pays for the LLM match score, and only for postings that could clear the tailoring threshold.",
                                            "impact": "Cuts paid LLM calls on postings that could never be tailored; a daily spend cap stops paid calls at the limit.",
                                            "inputs": "Raw postings",
                                            "process": "Mechanical + LLM scoring",
                                            "outputs": "Ranked queue",
                                            "code": "breakdown = compute_score_breakdown(posting, profile)\nif breakdown.max_possible < settings.auto_tailor_threshold:\n    return breakdown          # the paid LLM call is never made\nbreakdown.match_score = llm_match_score(posting, profile)"
                                },
                                {
                                            "id": "cp_tailor",
                                            "label": "Tailor",
                                            "icon": "",
                                            "tags": [
                                                        "Claude API",
                                                        "Prompt caching"
                                            ],
                                            "desc": "Rewrites the summary, skills and bullets for the posting from the candidate's own profile, with prompt caching on the shared profile block.",
                                            "impact": "A tailored resume and cover letter per posting in minutes instead of an hour of manual editing.",
                                            "inputs": "Ranked posting + profile",
                                            "process": "LLM tailoring",
                                            "outputs": "Draft resume",
                                            "code": "raw = llm.complete_json(\n    system=TAILOR_SYSTEM,\n    cacheable_prefix=profile_block,   # cached across calls\n    prompt=build_tailor_prompt(posting, profile),\n)"
                                },
                                {
                                            "id": "cp_guard",
                                            "label": "Guardrail",
                                            "icon": "",
                                            "tags": [
                                                        "Python",
                                                        "Non-LLM checks"
                                            ],
                                            "desc": "Checks every generated claim against the source profile: unchanged companies, roles and dates, no over-claimed years, no unsupported numbers. A 2-pass correction loop fixes what it can; only unresolved findings go to a human.",
                                            "impact": "Stops fabricated skills or metrics from ever reaching an employer.",
                                            "inputs": "Draft resume",
                                            "process": "Fact checks + correction",
                                            "outputs": "Approved documents",
                                            "code": "violations = _verify_structural_fidelity(original_experience, tailored_experience)\nfindings = check_bullet_fabrication(\n    original_experience, tailored_experience,\n    original_projects, tailored_projects, jd_text,\n)\nif violations or findings:\n    tailored = _correct_fabricated_content_pass(...)   # up to 2 passes, then human review"
                                },
                                {
                                            "id": "cp_apply",
                                            "label": "Apply",
                                            "icon": "",
                                            "tags": [
                                                        "Chrome extension",
                                                        "JavaScript"
                                            ],
                                            "desc": "A Manifest V3 extension fills application forms on all 7 platforms in the user's own browser, including iframe-embedded and Shadow-DOM forms, and attaches the tailored PDFs. Nothing is ever submitted automatically.",
                                            "impact": "Applications filled in seconds, with a person always clicking Submit.",
                                            "inputs": "Approved documents",
                                            "process": "Form autofill",
                                            "outputs": "Submitted by a human",
                                            "code": "const file = new File([pdfBytes], filename, { type: \"application/pdf\" });\nconst dt = new DataTransfer();\ndt.items.add(file);\nfileInput.files = dt.files;          // same technique real job-apply extensions use\nfileInput.dispatchEvent(new Event(\"change\", { bubbles: true }));"
                                }
                    ]
        },
        reactive: {
                    "nodes": [
                                {
                                            "id": "rx_post",
                                            "label": "POST API",
                                            "icon": "",
                                            "tags": [
                                                        "Spring WebFlux",
                                                        "Java"
                                            ],
                                            "desc": "A non-blocking REST endpoint accepts job-posting events and returns a Mono, so no thread is held per request.",
                                            "impact": "Handles bursts of incoming events without a thread-per-request bottleneck.",
                                            "inputs": "JSON posting event",
                                            "process": "WebFlux controller",
                                            "outputs": "Mono<JobPostingEvent>",
                                            "code": "@PostMapping\n@ResponseStatus(HttpStatus.CREATED)\npublic Mono<JobPostingEvent> ingest(@Valid @RequestBody JobPostingEvent posting) {\n    return service.ingest(posting);\n}"
                                },
                                {
                                            "id": "rx_persist",
                                            "label": "Persist",
                                            "icon": "",
                                            "tags": [
                                                        "R2DBC",
                                                        "SQL"
                                            ],
                                            "desc": "Saves each event through a reactive R2DBC repository; the server sets received_at so a client cannot leave the NOT NULL column empty.",
                                            "impact": "Durable storage that stays non-blocking end to end.",
                                            "inputs": "Validated event",
                                            "process": "R2DBC save",
                                            "outputs": "job_posting_event row",
                                            "code": "posting.setReceivedAt(Instant.now());\nreturn repository.save(posting)\n        .doOnNext(saved -> liveFeed.tryEmitNext(saved));"
                                },
                                {
                                            "id": "rx_replay",
                                            "label": "Replay Sink",
                                            "icon": "",
                                            "tags": [
                                                        "Project Reactor",
                                                        "Sinks.Many"
                                            ],
                                            "desc": "Publishes every saved posting to a replaying sink that keeps the last 20 events, so a subscriber who connects mid-stream still sees recent history.",
                                            "impact": "Late-joining dashboards are never empty.",
                                            "inputs": "Saved posting",
                                            "process": "Sinks.many().replay().limit(20)",
                                            "outputs": "Live feed",
                                            "code": "private final Sinks.Many<JobPostingEvent> liveFeed =\n        Sinks.many().replay().limit(20);"
                                },
                                {
                                            "id": "rx_sse",
                                            "label": "SSE Stream",
                                            "icon": "",
                                            "tags": [
                                                        "Server-Sent Events",
                                                        "Backpressure"
                                            ],
                                            "desc": "Streams the feed as Server-Sent Events with a bounded per-subscriber buffer (50); a slow subscriber drops its oldest backlog instead of growing memory without limit.",
                                            "impact": "Real-time updates for clients with protection against slow consumers.",
                                            "inputs": "Live feed",
                                            "process": "text/event-stream",
                                            "outputs": "Browser clients",
                                            "code": "@GetMapping(path = \"/stream\", produces = MediaType.TEXT_EVENT_STREAM_VALUE)\npublic Flux<JobPostingEvent> stream() {\n    return service.stream();   // bounded buffer: drop oldest when a subscriber lags\n}"
                                },
                                {
                                            "id": "rx_test",
                                            "label": "Verify",
                                            "icon": "",
                                            "tags": [
                                                        "JUnit",
                                                        "curl"
                                            ],
                                            "desc": "Integration and backpressure tests, plus a run of the packaged app with live curl requests, including an SSE subscriber receiving an event ingested after it connected; 2 bugs the tests missed were found this way and fixed.",
                                            "impact": "Confidence that the stream works as a running service, not only in unit tests.",
                                            "inputs": "Running service",
                                            "process": "Tests + live curl",
                                            "outputs": "Verified behaviour",
                                            "code": "curl -N http://localhost:8080/api/postings/stream &\ncurl -X POST http://localhost:8080/api/postings \\\n  -H 'Content-Type: application/json' \\\n  -d '{\"companyName\":\"Acme\",\"jobTitle\":\"Data Engineer\",\"source\":\"greenhouse\"}'"
                                }
                    ]
        },
        lakehouse: {
                    "nodes": [
                                {
                                            "id": "lh_generate",
                                            "label": "Generate",
                                            "icon": "",
                                            "tags": [
                                                        "Python"
                                            ],
                                            "desc": "Generates 60,000 clearly synthetic postings across 400 companies with a fixed seed, a scale where a Spark pipeline is a real design choice.",
                                            "impact": "Reproducible input for every run and every test.",
                                            "inputs": "Seeded generator",
                                            "process": "CSV writer",
                                            "outputs": "raw_postings, raw_companies",
                                            "code": "random.seed(42)\nCOMPANY_COUNT = 400\nPOSTING_COUNT = 60000"
                                },
                                {
                                            "id": "lh_spark",
                                            "label": "PySpark",
                                            "icon": "",
                                            "tags": [
                                                        "PySpark",
                                                        "Spark SQL",
                                                        "Window functions"
                                            ],
                                            "desc": "Joins postings to companies, aggregates salary statistics per industry and seniority, and ranks postings within each industry with dense_rank().",
                                            "impact": "The same DataFrame code runs locally or on a cluster.",
                                            "inputs": "Raw CSVs",
                                            "process": "groupBy/agg + window",
                                            "outputs": "Parquet outputs",
                                            "code": "industry_window = Window.partitionBy(\"industry\").orderBy(F.desc(\"salary_usd\"))\ntop_postings = (\n    joined.withColumn(\"salary_rank_in_industry\", F.dense_rank().over(industry_window))\n    .filter(F.col(\"salary_rank_in_industry\") <= 5)\n)"
                                },
                                {
                                            "id": "lh_ge",
                                            "label": "Validate",
                                            "icon": "",
                                            "tags": [
                                                        "Great Expectations"
                                            ],
                                            "desc": "11 Great Expectations checks on the Spark output: row counts, allowed category sets, uniqueness, value ranges and a cross-column rule (max salary >= min salary).",
                                            "impact": "Bad output is caught before any dashboard or model reads it.",
                                            "inputs": "Parquet outputs",
                                            "process": "Expectation suites",
                                            "outputs": "Validated data",
                                            "code": "dataset.expect_column_values_to_be_in_set(\"industry\", list(INDUSTRIES))\ndataset.expect_column_pair_values_A_to_be_greater_than_B(\n    \"max_salary\", \"min_salary\", or_equal=True)"
                                },
                                {
                                            "id": "lh_dbt",
                                            "label": "dbt Models",
                                            "icon": "",
                                            "tags": [
                                                        "dbt",
                                                        "Databricks SQL"
                                            ],
                                            "desc": "In the companion dbt project, staging views feed dimension and fact tables on a live Databricks SQL warehouse, including days-to-decision and interview-round counts.",
                                            "impact": "Analytics-ready tables with clear definitions instead of ad-hoc queries.",
                                            "inputs": "Seeded raw tables",
                                            "process": "Staging -> marts",
                                            "outputs": "fct_application, dims",
                                            "code": "datediff(a.decision_date, a.applied_date) as days_to_decision,\ncoalesce(ic.interview_round_count, 0) > 0 as reached_interview,\na.status in ('offer', 'rejected', 'withdrawn') as is_closed"
                                },
                                {
                                            "id": "lh_ci",
                                            "label": "Tests & CI",
                                            "icon": "",
                                            "tags": [
                                                        "dbt tests",
                                                        "GitHub Actions",
                                                        "Airflow"
                                            ],
                                            "desc": "15 dbt tests plus a business-rule test run on every push through CI with repository secrets; the Spark side runs as an Airflow DAG (generate -> transform -> validate).",
                                            "impact": "Every change is rebuilt and tested against the real warehouse automatically.",
                                            "inputs": "Every push",
                                            "process": "dbt seed/run/test",
                                            "outputs": "Green build",
                                            "code": "- run: dbt seed --profiles-dir . --full-refresh\n- run: dbt run --profiles-dir .\n- run: dbt test --profiles-dir ."
                                }
                    ]
        },
        batch: {
            nodes: [
                { 
                    id: "ingest", 
                    label: "Ingest", 
                    icon: "", 
                    tags: ["Python", "yFinance", "Pandas"], 
                    desc: "Fetches raw daily market pricing and transactional telemetry from finance APIs. Standardizes data columns and formats ISO timestamps.",
                    impact: "Replaces manual daily downloading and aggregation: a GitHub Actions job runs it every day at $0 server cost.",
                    inputs: "Yahoo Finance API",
                    process: "yFinance Ingestion",
                    outputs: "Raw Market CSV",
                    code: "import yfinance as yf\nimport pandas as pd\n\ndef ingest_daily_data(ticker='SPY'):\n    data = yf.download(ticker, period='1d', interval='1m')\n    df = pd.DataFrame(data)\n    df.reset_index(inplace=True)\n    df.rename(columns={'Datetime': 'timestamp'}, inplace=True)\n    return df" 
                },
                { 
                    id: "validate", 
                    label: "Validate", 
                    icon: "", 
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
                    icon: "", 
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
                    icon: "", 
                    tags: ["Snowflake", "SQL", "Star Schema"], 
                    desc: "Pipes cleaned data into persistent Snowflake data warehouse dimensions and fact tables.",
                    impact: "Centralizes records into star schemas so analytic queries run on clean, joined data.",
                    inputs: "Flagged anomalies",
                    process: "Snowflake Schema",
                    outputs: "Analytical Tables",
                    code: "INSERT INTO fact_market_sales (timestamp, close_price, volume, anomaly_flag)\nSELECT \n  timestamp, \n  close_price, \n  volume, \n  CASE WHEN anomaly_score < 0 THEN 1 ELSE 0 END\nFROM stg_market_data;" 
                },
                { 
                    id: "bi", 
                    label: "BI Dashboard", 
                    icon: "", 
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
                    icon: "", 
                    tags: ["MQTT", "HTTP", "FastAPI"], 
                    desc: "Receives high-frequency sensor readings (vibration, heat, voltage) in real-time from fleet battery systems.",
                    impact: "Ingests continuous battery and motor telemetry in micro-batches.",
                    inputs: "IoT Telemetry Streams",
                    process: "MQTT Broker Ingest",
                    outputs: "Kafka Event Buffer",
                    code: "@app.post('/api/telemetry')\nasync def ingest_stream(reading: TelemetryReading):\n    await stream_buffer.append(reading)\n    return {'status': 'buffered'}" 
                },
                { 
                    id: "validate", 
                    label: "Validation", 
                    icon: "", 
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
                    icon: "", 
                    tags: ["Scikit-Learn", "Regression"], 
                    desc: "Applies an exponential health decay model to forecast the fleet component's Remaining Useful Life (RUL).",
                    impact: "Estimates each battery's remaining useful life so maintenance can be scheduled before a failure.",
                    inputs: "Validated Signals",
                    process: "RUL Regression Model",
                    outputs: "Failure Projections",
                    code: "import numpy as np\n\ndef estimate_rul(vibration_history):\n    decay_fit = np.polyfit(np.arange(len(vibration_history)), np.log(vibration_history), 1)\n    projected_fail_step = (np.log(MAX_LIMIT) - decay_fit[1]) / decay_fit[0]\n    return max(0, projected_fail_step - len(vibration_history))" 
                },
                { 
                    id: "alert", 
                    label: "Alert Hook", 
                    icon: "", 
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
                    icon: "", 
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
                    icon: "", 
                    tags: ["Python", "Pandas"], 
                    desc: "Calculates net carbon emissions based on land cover type changes (forest loss vs. urban expansion).",
                    impact: "Measures net land-use carbon per state with factors from the EPA's state inventory and compares the yearly total with EPA's figure.",
                    inputs: "Clean GeoDataFrames",
                    process: "Carbon Offset Engine",
                    outputs: "CO2 Delta Matrices",
                    code: "def calculate_emissions(gdf):\n    # Forest: -3.5 tons/ha, Urban: +2.1 tons/ha\n    gdf['co2_delta'] = gdf['area_ha'] * gdf['land_type'].map({\n        'Forest': -3.5,\n        'Urban': 2.1,\n        'Agriculture': 0.8\n    })\n    return gdf" 
                },
                { 
                    id: "model", 
                    label: "ML Forecast", 
                    icon: "", 
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
                    icon: "", 
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
                    icon: "", 
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
            span.style.background = "rgba(242, 169, 59, 0.1)";
            span.style.border = "1px solid rgba(242, 169, 59, 0.2)";
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
                toggleCodeBtn.textContent = isCurrentlyVisible ? "Hide Technical Code Snippet " : "View Technical Code Snippet ";
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
            tourBtn.innerHTML = "Stop Tour ⏹";
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
            tourBtn.innerHTML = "Play Tour ⏯";
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
                toggleCodeBtn.textContent = "Hide Technical Code Snippet ";
            } else {
                codeBox.style.display = "none";
                toggleCodeBtn.textContent = "View Technical Code Snippet ";
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
    renderPipelineFlow("careerpilot");  // newest work first; matches the tab marked active in the template

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
                    businessTitle.textContent = ` High Recall / Low Precision Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags almost all visitors as likely to convert. This triggers aggressive modal popups, newsletter signups, and sales outreach, causing high user bounce rates and user frustration.";
                } else if (t > 0.70) {
                    businessTitle.textContent = ` High Precision / Low Recall Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Only triggers conversion outreach when 100% certain. Genuine recruiters browse in peace, but you miss proactive opportunities to trigger the recruiter tour or AI chatbot, losing warm leads.";
                } else {
                    businessTitle.textContent = ` Optimal Balanced Conversion Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-emerald)";
                    businessDesc.textContent = "Optimal F1-Score trade-off. Automatically triggers the guided tour and AI assistant launcher for high-interest users while keeping background tracking passive and non-intrusive.";
                }
            } else {
                if (t < 0.35) {
                    businessTitle.textContent = ` High Recall / Low Precision Bot Filtering Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Flags almost all sessions as potential bot traffic. Enforces strict CAPTCHA verification challenges for every visitor, causing high friction and driving away real recruiters.";
                } else if (t > 0.65) {
                    businessTitle.textContent = ` High Precision / Low Recall Bot Filtering Threshold (${t.toFixed(2)})`;
                    businessTitle.style.color = "var(--accent-amber)";
                    businessDesc.textContent = "Only blocks sessions that are undeniably bots. Real users experience zero friction, but the backend is flooded with automated scrapers, spam database inserts, and fake analytics logs.";
                } else {
                    businessTitle.textContent = ` Optimal Balanced Bot Security Threshold (${t.toFixed(2)})`;
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
            runABBtn.textContent = "Simulating Traffic... ";
            
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
                    runABBtn.textContent = "Run Experiment Simulation ";
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
    
    const allTourSteps = [
        {
            title: "Quick tour",
            desc: "This tour follows the page from top to bottom: who Deshraj is, his resume, the case studies and projects, the Lab, his experience, skills, certifications, recommendations and the AI assistant. Choose how you would like to go:",
            target: null,
            duration: 0,
            action: async () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                await delay(800);
            }
        },
        {
            title: "Who Deshraj is",
            desc: "A data engineer and machine learning engineer: the roles he works in, the results behind them, and Career Pilot, the AI platform he runs in production.",
            target: "#about",
            duration: 9000,
            action: async () => {
                const el = document.querySelector("#about");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector("#about");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "Resume",
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
                
                const allRolesFilter = document.querySelector('.resume-filter-btn[data-role="all"]');
                if (allRolesFilter) allRolesFilter.click();
                const closeResumeBtn = document.querySelector(".close-resume-btn");
                if (closeResumeBtn) closeResumeBtn.click();
            }
        },
        {
            title: "Selected work",
            desc: "Four projects told end to end: the problem, what was built, the measured result and what he would change. Each card opens its own page.",
            target: ".featured-grid",
            duration: 10000,
            action: async () => {
                const el = document.querySelector(".featured-grid");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector(".featured-grid");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "More projects",
            desc: "Next, we scroll to his projects. Watch as the search category filters cycle dynamically to show Data Engineering, ML, and Analytics projects.",
            target: "#projects",
            duration: 18000,
            action: async () => {
                const section = document.getElementById("projects");
                if (section) {
                    section.classList.add("tour-highlight");
                    const firstFilter = document.querySelector('.filter-btn');
                    (firstFilter ? firstFilter.parentElement : section).scrollIntoView({ behavior: 'smooth', block: 'center' });
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
                // leaving the step early must not leave the project grid filtered to one category
                const allFilter = document.querySelector('.filter-btn[data-filter="all"]');
                if (allFilter && !allFilter.classList.contains("active")) allFilter.click();
            }
        },
        {
            title: "The Lab",
            desc: "Interactive demos you can run in the browser: a SQL playground, a pipeline monitor, an A/B test simulator and more.",
            target: ".lab-cta",
            duration: 7000,
            action: async () => {
                const el = document.querySelector(".lab-cta");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector(".lab-cta");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "Experience",
            desc: "His work history, with the measured results from each role: Technoid, Objectways, Zifatech Solutions and Arizona State University.",
            target: "#experience",
            duration: 10000,
            action: async () => {
                const expSec = document.getElementById("experience");
                if (expSec) {
                    expSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    expSec.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const expSec = document.getElementById("experience");
                if (expSec) expSec.classList.remove("tour-highlight");
            }
        },
        {
            title: "Skills",
            desc: "Skills grouped by area, from data engineering and warehousing to machine learning, LLMs and cloud.",
            target: "#skills",
            duration: 9000,
            action: async () => {
                const el = document.querySelector("#skills");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector("#skills");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "Certifications",
            desc: "Certifications in data, analytics and AI, and what each one covered.",
            target: "#certifications",
            duration: 8000,
            action: async () => {
                const el = document.querySelector("#certifications");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector("#certifications");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "What people say",
            desc: "What managers, professors and colleagues say about working with him.",
            target: "#recommendations",
            duration: 9000,
            action: async () => {
                const el = document.querySelector("#recommendations");
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    el.classList.add("tour-highlight");
                }
            },
            cleanup: () => {
                const el = document.querySelector("#recommendations");
                if (el) el.classList.remove("tour-highlight");
            }
        },
        {
            title: "AI assistant",
            desc: "Finally, let's open the AI assistant. The tour will type and send: 'summarize his 3+ years of experience' so you can see live RAG retrieval in action.",
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
                    const text = "summarize his 3+ years of experience";
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
            title: "That's the tour",
            desc: "That's the whole page. To reach Deshraj, use the contact details below, or ask the AI assistant anything the tour did not cover.",
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
    // Only steps whose target exists on this page (the demos live on /lab/, case studies on their own pages)
    const tourSteps = allTourSteps.filter(step => !step.target || document.querySelector(step.target));

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
            if (pausePlayIcon) pausePlayIcon.textContent = "▶";
            if (pausePlayText) pausePlayText.textContent = "Resume";
        } else {
            if (pausePlayIcon) pausePlayIcon.textContent = "⏸";
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
    // ==========================================================================
    // Small-screen layout (<= 768px): lead bullet + expand, projects 6 at a time, certificate pointers on demand.
    // The buttons always exist; CSS hides them on wider screens, so resizing never leaves the page half-collapsed.
    // ==========================================================================
    const metricValue = (text) => {
        // Strongest bullet = largest measured result: a percentage counts first, then any large number.
        let best = 0;
        (text.match(/(\d[\d,]*(?:\.\d+)?)\s*%/g) || []).forEach(m => { best = Math.max(best, 1000 + parseFloat(m.replace(/[,%\s]/g, ""))); });
        (text.match(/\d[\d,]{2,}\+?/g) || []).forEach(m => { best = Math.max(best, Math.min(999, parseFloat(m.replace(/[,+]/g, "")) / 100)); });
        return best;
    };

    document.querySelectorAll(".experience-card .experience-bullets").forEach(list => {
        const items = [...list.querySelectorAll("li")];
        if (items.length < 2) return;
        let lead = items[0];
        items.forEach(li => { if (metricValue(li.textContent) > metricValue(lead.textContent)) lead = li; });
        lead.classList.add("lead-bullet");
        list.classList.add("is-collapsible");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "collapse-toggle exp-toggle";
        const more = items.length - 1;
        const label = (open) => open ? "Show less ▴" : `Show ${more} more achievement${more > 1 ? "s" : ""} ▾`;
        btn.textContent = label(false);
        btn.setAttribute("aria-expanded", "false");
        btn.addEventListener("click", () => {
            const open = list.classList.toggle("expanded");
            btn.textContent = label(open);
            btn.setAttribute("aria-expanded", String(open));
        });
        list.insertAdjacentElement("afterend", btn);
    });

    const PROJECT_STEP = 6;
    let projectLimit = PROJECT_STEP;
    const projectsGrid = document.querySelector(".projects-grid");
    const moreProjectsBtn = document.createElement("button");
    moreProjectsBtn.type = "button";
    moreProjectsBtn.className = "collapse-toggle projects-more-btn";
    const applyProjectLimit = () => {
        const visible = [...document.querySelectorAll(".projects-grid:not(.team-grid) .project-card")].filter(c => !c.classList.contains("hidden"));
        visible.forEach((c, i) => c.classList.toggle("beyond-limit", i >= projectLimit));
        const remaining = visible.length - Math.min(projectLimit, visible.length);
        moreProjectsBtn.style.visibility = remaining > 0 ? "visible" : "hidden";
        moreProjectsBtn.textContent = `Show more projects (${remaining}) ▾`;
    };
    if (projectsGrid) {
        projectsGrid.insertAdjacentElement("afterend", moreProjectsBtn);
        moreProjectsBtn.addEventListener("click", () => { projectLimit += PROJECT_STEP; applyProjectLimit(); });
        document.querySelectorAll(".filter-btn").forEach(b => b.addEventListener("click", () => { projectLimit = PROJECT_STEP; applyProjectLimit(); }));
        applyProjectLimit();
    }
    document.querySelectorAll(".project-card .card-desc").forEach(desc => {
        desc.addEventListener("click", () => desc.classList.toggle("expanded"));
    });

    document.querySelectorAll(".cert-card").forEach(card => {
        const list = card.querySelector("ul");
        if (!list) return;
        list.classList.add("cert-points");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "collapse-toggle cert-toggle";
        btn.textContent = "What it covered ▾";
        btn.setAttribute("aria-expanded", "false");
        btn.addEventListener("click", () => {
            const open = list.classList.toggle("expanded");
            btn.textContent = open ? "Hide details ▴" : "What it covered ▾";
            btn.setAttribute("aria-expanded", String(open));
        });
        list.insertAdjacentElement("beforebegin", btn);
    });

});

// Header brand: hide the name next to the DJ badge while the hero is visible, show it once the hero scrolls away
(() => {
    const hero = document.getElementById("about");
    if (!hero || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(([entry]) => document.body.classList.toggle("at-hero", entry.isIntersecting), { threshold: 0.25 }).observe(hero);
})();

// Engagement events (anonymous, same random visitor ID as the visit log): how far the page is scrolled, which sections are
// seen, and which key links are clicked. Each scroll depth and section is sent once per page view.
(() => {
    const URL = "https://mtvcrttbdjwcixzhlkvo.supabase.co/rest/v1/portfolio_events";
    const KEY = "sb_publishable_ZuB30vNfc-7b7Pr6ebZNqQ_sXjox-wu";
    const vid = (() => { try { return localStorage.getItem("portfolio_visitor_id") || "anon"; } catch (e) { return "anon"; } })();
    const sent = new Set();
    const send = (event, detail) => {
        const key = event + ":" + detail;
        if (event !== "click" && sent.has(key)) return;
        sent.add(key);
        fetch(URL, { method: "POST", keepalive: true,
            headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
            body: JSON.stringify({ visitor_id: vid.slice(0, 40), event, detail: String(detail).slice(0, 80), page_path: location.pathname.slice(0, 120) })
        }).catch(() => {});
    };
    window.addEventListener("scroll", () => {
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max <= 0) return;
        const pct = (scrollY / max) * 100;
        [25, 50, 75, 100].forEach(m => { if (pct >= m - 1) send("scroll", m); });
    }, { passive: true });
    if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { send("section", en.target.id); io.unobserve(en.target); } }), { rootMargin: "-45% 0px -45% 0px" });
        document.querySelectorAll("main section[id]").forEach(s => io.observe(s));
    }
    document.addEventListener("click", e => {
        const el = e.target.closest("a, button");
        if (!el) return;
        const label = el.dataset.track || (el.id ? "#" + el.id : "") || (el.getAttribute("href") || "").replace(/^https?:\/\//, "");
        if (/resume|tour|ask-ai|case|projects\/|github\.com|demo\.|lab|contact|mailto|linkedin/i.test(label + " " + el.textContent)) {
            send("click", (label || el.textContent.trim()).slice(0, 80));
        }
    });
})();
