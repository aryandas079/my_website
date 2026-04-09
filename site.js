document.addEventListener("DOMContentLoaded", () => {
    initRevealObservers();
    initDeckNavigation();
    initContactProfile();
    initSkillsBurst();
});

/* ── REVEAL (block animation trigger) ─────────────────────────── */
function initRevealObservers() {
    const revealTargets = Array.from(document.querySelectorAll("[data-reveal]"));
    if (!revealTargets.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, { threshold: 0.25 });

    revealTargets.forEach((target, index) => {
        // First slide starts visible immediately
        if (index === 0) target.classList.add("visible");
        observer.observe(target);
    });
}

/* ── DECK NAVIGATION (scroll-snap + dots + keyboard) ──────────── */
function initDeckNavigation() {
    const deck       = document.querySelector("[data-deck]");
    const slides     = Array.from(document.querySelectorAll("[data-slide]")); 
    const navButtons = Array.from(document.querySelectorAll("[data-slide-nav]"));

    if (!deck || !slides.length) return;

    let activeIndex  = 0;
    let isAnimating  = false;
    const desktopMedia = window.matchMedia("(min-width: 1201px)");

    const updateActiveState = (index) => {
        activeIndex = index;
        navButtons.forEach((btn) => {
            btn.classList.toggle("active", Number(btn.dataset.slideNav) === index);
        });
    };

    const easeInOut = (p) => p < 0.5
        ? 4 * p * p * p
        : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const smoothScrollTo = (targetIndex) => {
        const bounded   = Math.max(0, Math.min(targetIndex, slides.length - 1));
        const targetTop = slides[bounded].offsetTop;
        const startTop  = deck.scrollTop;
        const distance  = targetTop - startTop;

        if (!distance) { updateActiveState(bounded); return; }

        if (!desktopMedia.matches) {
            deck.scrollTo({ top: targetTop, behavior: "smooth" });
            updateActiveState(bounded);
            return;
        }

        const duration  = 900;
        const startTime = performance.now();
        isAnimating     = true;

        const animate = (timestamp) => {
            const elapsed  = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            deck.scrollTop = startTop + distance * easeInOut(progress);

            if (progress < 1) {
                window.requestAnimationFrame(animate);
                return;
            }
            isAnimating = false;
            updateActiveState(bounded);
        };
        window.requestAnimationFrame(animate);
    };

    navButtons.forEach((btn) => {
        btn.addEventListener("click", () => smoothScrollTo(Number(btn.dataset.slideNav)));
    });

    const slideObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const index = slides.indexOf(entry.target);
            if (index >= 0) updateActiveState(index);
        });
    }, { root: deck, threshold: 0.62 });

    slides.forEach((slide) => slideObserver.observe(slide));

    const hashTarget = window.location.hash.replace("#", "");
    if (hashTarget) {
        const hashIndex = slides.findIndex((s) => s.id === hashTarget);
        if (hashIndex >= 0) window.requestAnimationFrame(() => smoothScrollTo(hashIndex));
    }

    deck.addEventListener("wheel", (event) => {
        if (!desktopMedia.matches) return;
        event.preventDefault();
        if (isAnimating || Math.abs(event.deltaY) < 12) return;
        if (event.deltaY > 0 && activeIndex < slides.length - 1) smoothScrollTo(activeIndex + 1);
        else if (event.deltaY < 0 && activeIndex > 0)            smoothScrollTo(activeIndex - 1);
    }, { passive: false });

    window.addEventListener("keydown", (event) => {
        if (!desktopMedia.matches || isAnimating) return;
        if (["ArrowDown", "PageDown", " "].includes(event.key) && activeIndex < slides.length - 1) {
            event.preventDefault();
            smoothScrollTo(activeIndex + 1);
        }
        if (["ArrowUp", "PageUp"].includes(event.key) && activeIndex > 0) {
            event.preventDefault();
            smoothScrollTo(activeIndex - 1);
        }
        if (event.key === "Home") { event.preventDefault(); smoothScrollTo(0); }
        if (event.key === "End")  { event.preventDefault(); smoothScrollTo(slides.length - 1); }

        if (event.key === "Escape") {
            const profileOverlay = document.getElementById("profile");
            const skillsOverlay  = document.getElementById("skills-overlay");
            if (profileOverlay && profileOverlay.classList.contains("slide-profile--visible")) {
                const closeBtn = document.getElementById("profile-close-btn");
                if (closeBtn) closeBtn.click();
            }
            if (skillsOverlay && skillsOverlay.classList.contains("--visible")) {
                const closeBtn = document.getElementById("skills-close-btn");
                if (closeBtn) closeBtn.click();
            }
        }
    });
}

/* ── CONTACT PROFILE OVERLAY ───────────────────────────────────── */
function initContactProfile() {
    const profileSlide = document.getElementById("profile");
    const openBtn      = document.getElementById("hero-contact-btn");
    const closeBtn     = document.getElementById("profile-close-btn");

    if (!profileSlide) return;

    function openProfile() {
        profileSlide.classList.remove("slide-profile--hidden");
        profileSlide.classList.add("slide-profile--visible");
        setTimeout(() => profileSlide.classList.add("visible"), 60);
        document.body.style.overflow = "hidden";
        profileSlide.scrollTop = 0;
    }

    function closeProfile() {
        profileSlide.classList.remove("slide-profile--visible");
        profileSlide.classList.remove("visible");
        document.body.style.overflow = "";
    }

    if (openBtn)  openBtn.addEventListener("click", openProfile);
    if (closeBtn) closeBtn.addEventListener("click", closeProfile);
}

/* ── SKILLS BURST LOGIC ────────────────────────────────────────── */
function initSkillsBurst() {
    const overlay  = document.getElementById("skills-overlay");
    const trigger  = document.getElementById("skills-trigger");
    const closeBtn = document.getElementById("skills-close-btn");
    const pills    = Array.from(document.querySelectorAll(".skill-pill"));

    if (!overlay || !trigger) return;

    // Distribute pills randomly across the screen bounds
    const scatterPills = () => {
        pills.forEach((pill, i) => {
            // Random position between 10% and 90%
            const x = 10 + Math.random() * 80;
            const y = 15 + Math.random() * 75;
            const rot = (Math.random() - 0.5) * 15; // -7.5 to 7.5 deg
            
            // Staggered burst delays
            const delay = Math.random() * 0.4;

            pill.style.left = `${x}%`;
            pill.style.top  = `${y}%`;
            pill.style.transitionDelay = `${delay}s`;
            pill.style.transform = `translate(-50%, -50%) rotate(${rot}deg) scale(1)`;
        });
    };

    const resetPills = () => {
        pills.forEach(pill => {
            pill.style.transitionDelay = '0s'; // Reset delay for instant hide
            pill.style.transform = `translate(-50%, -50%) scale(0.2)`;
            pill.style.opacity = "0";
        });
    };

    trigger.addEventListener("click", () => {
        overlay.classList.add("--visible");
        document.body.style.overflow = "hidden";
        // Small delay to ensure display property doesn't interfere with transition
        setTimeout(scatterPills, 50);
    });

    closeBtn.addEventListener("click", () => {
        overlay.classList.remove("--visible");
        document.body.style.overflow = "";
        resetPills();
    });
}
