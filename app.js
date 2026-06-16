/* ==========================================================================
   JavaScript Functionality for Deshraj Jogiya's Portfolio Website
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
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
});
