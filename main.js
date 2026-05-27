(function () {
    "use strict";

    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function scrollBehavior() {
        return prefersReducedMotion ? "instant" : "smooth";
    }

    function pad2(n) {
        return n < 10 ? "0" + n : String(n);
    }

    function getHMSInZone(timeZone) {
        var parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timeZone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
        }).formatToParts(new Date());
        var h = 0,
            m = 0,
            s = 0;
        parts.forEach(function (p) {
            if (p.type === "hour") h = parseInt(p.value, 10);
            if (p.type === "minute") m = parseInt(p.value, 10);
            if (p.type === "second") s = parseInt(p.value, 10);
        });
        return { h: h, m: m, s: s };
    }

    function shortTimeZoneName(timeZone) {
        var tzParts = new Intl.DateTimeFormat("en-GB", {
            timeZone: timeZone,
            timeZoneName: "short",
        }).formatToParts(new Date());
        var name = "";
        tzParts.forEach(function (p) {
            if (p.type === "timeZoneName") name = p.value;
        });
        return name || "";
    }

    function initClocks() {
        var laTime = document.getElementById("clock-time-la");
        var mtlTime = document.getElementById("clock-time-mtl");
        var parisTime = document.getElementById("clock-time-paris");
        var laTz = document.getElementById("clock-tz-la");
        var mtlTz = document.getElementById("clock-tz-mtl");
        var parisTz = document.getElementById("clock-tz-paris");
        if (!laTime || !mtlTime || !parisTime) return;

        function tick() {
            var tLa = getHMSInZone("America/Los_Angeles");
            var tMtl = getHMSInZone("America/Toronto");
            var tPar = getHMSInZone("Europe/Paris");
            laTime.textContent = pad2(tLa.h) + ":" + pad2(tLa.m) + ":" + pad2(tLa.s);
            mtlTime.textContent = pad2(tMtl.h) + ":" + pad2(tMtl.m) + ":" + pad2(tMtl.s);
            parisTime.textContent = pad2(tPar.h) + ":" + pad2(tPar.m) + ":" + pad2(tPar.s);
            var laCode = shortTimeZoneName("America/Los_Angeles");
            var mtlCode = shortTimeZoneName("America/Toronto");
            var parCode = shortTimeZoneName("Europe/Paris");
            if (laTz && laCode) laTz.textContent = laCode;
            if (mtlTz && mtlCode) mtlTz.textContent = mtlCode;
            if (parisTz) parisTz.textContent = parCode || parisTz.textContent || "CET";
        }
        tick();
        setInterval(tick, 1000);
    }

    function initContactForm() {
        var form = document.getElementById("contact-form");
        if (!form) return;

        var emailInput = form.querySelector("#contact-sender-email");
        var phoneInput = form.querySelector("#contact-sender-phone");
        var messageInput = form.querySelector("#contact-message");

        form.addEventListener("submit", function (event) {
            event.preventDefault();
            if (!emailInput || !messageInput) return;

            if (!emailInput.checkValidity()) {
                emailInput.reportValidity();
                return;
            }

            var message = messageInput.value.trim();
            if (!message) {
                messageInput.setCustomValidity("Please enter a message.");
                messageInput.reportValidity();
                messageInput.setCustomValidity("");
                return;
            }

            var senderEmail = emailInput.value.trim();
            var phone = phoneInput ? phoneInput.value.trim() : "";
            var bodyLines = ["From: " + senderEmail];
            if (phone) bodyLines.push("Phone: " + phone);
            bodyLines.push("", message);

            var mailto =
                "mailto:contact@christianneri.com" +
                "?subject=" +
                encodeURIComponent("Portfolio message from " + senderEmail) +
                "&body=" +
                encodeURIComponent(bodyLines.join("\n"));

            window.location.href = mailto;
        });
    }

    function initSectionNav() {
        var header = document.querySelector(".site-header");
        var links = Array.prototype.slice.call(document.querySelectorAll("[data-section-nav]"));
        if (!links.length) return;

        var track = document.querySelector("[data-section-nav-track]");
        var thumb = track ? track.querySelector(".section-nav-thumb") : null;
        /** Skip scroll-driven active updates briefly after a toggle click so smooth-scroll doesn’t fight the bounce. */
        var navInteractLockUntil = 0;

        var sectionIds = links.map(function (l) {
            return l.getAttribute("href").replace(/^#/, "");
        });
        var sections = sectionIds.map(function (id) {
            return document.getElementById(id);
        }).filter(Boolean);

        function headerOffset() {
            if (header && header.offsetHeight > 12) return header.offsetHeight;
            /* Homepage: sticky section toggle — offset matches stick area + inset. */
            var slot = document.querySelector(".hero-nav-slot");
            if (slot) {
                var cs = window.getComputedStyle(slot);
                var insetTop = parseFloat(cs.top);
                if (isNaN(insetTop)) insetTop = 14;
                return Math.round(slot.offsetHeight + insetTop);
            }
            return 24;
        }

        function measureThumbTarget(activeLink) {
            if (!track || !activeLink) return null;
            var tr = track.getBoundingClientRect();
            var lr = activeLink.getBoundingClientRect();
            return {
                left: lr.left - tr.left + track.scrollLeft,
                top: lr.top - tr.top + track.scrollTop,
                width: lr.width,
                height: lr.height,
            };
        }

        function applyThumbInstant(m) {
            if (!thumb || !m) return;
            if (thumb._anim) {
                thumb._anim.cancel();
                thumb._anim = null;
            }
            thumb.style.left = m.left + "px";
            thumb.style.top = m.top + "px";
            thumb.style.width = m.width + "px";
            thumb.style.height = m.height + "px";
            thumb.style.transform = "";
        }

        function syncThumb(activeLink, animated) {
            if (!thumb || !activeLink) return;
            var m = measureThumbTarget(activeLink);
            if (!m) return;

            if (!animated || prefersReducedMotion) {
                applyThumbInstant(m);
                return;
            }

            var prev = thumb.getBoundingClientRect();

            thumb.style.left = m.left + "px";
            thumb.style.top = m.top + "px";
            thumb.style.width = m.width + "px";
            thumb.style.height = m.height + "px";

            var curr = thumb.getBoundingClientRect();
            if (prev.width < 4 || prev.height < 4) {
                thumb.style.transform = "";
                return;
            }

            var dx = prev.left - curr.left;
            var dy = prev.top - curr.top;
            var sx = prev.width / curr.width || 1;
            var sy = prev.height / curr.height || 1;

            if (
                Math.abs(dx) < 0.75 &&
                Math.abs(dy) < 0.75 &&
                Math.abs(sx - 1) < 0.03 &&
                Math.abs(sy - 1) < 0.03
            ) {
                thumb.style.transform = "";
                return;
            }

            if (thumb._anim) thumb._anim.cancel();

            thumb.style.transform = "";

            /* FLIP inverted pose at t=0 → cling / peel / snap home (sticky + bounce) */
            var keyframes = [
                {
                    transform:
                        "translate(" + dx + "px," + dy + "px) scale(" + sx + "," + sy + ")",
                },
                {
                    transform:
                        "translate(" +
                        dx +
                        "px," +
                        dy +
                        "px) scale(" +
                        sx * 1.09 +
                        "," +
                        sy +
                        ")",
                    offset: 0.07,
                },
                {
                    transform:
                        "translate(" +
                        dx +
                        "px," +
                        dy +
                        "px) scale(" +
                        sx * 0.9 +
                        "," +
                        sy * 0.995 +
                        ")",
                    offset: 0.2,
                },
                {
                    transform:
                        "translate(" +
                        dx * 0.42 +
                        "px," +
                        dy * 0.42 +
                        "px) scale(" +
                        (1 + (sx - 1) * 0.45) +
                        "," +
                        (1 + (sy - 1) * 0.45) +
                        ")",
                    offset: 0.52,
                },
                { transform: "translate(0,0) scale(1,1)", offset: 1 },
            ];

            thumb._anim = thumb.animate(keyframes, {
                duration: 440,
                easing: "cubic-bezier(0.19, 1.02, 0.37, 1)",
                fill: "forwards",
            });
            thumb._anim.onfinish = function () {
                thumb.style.transform = "";
                thumb._anim = null;
            };
        }

        function setActive(activeLink, animateThumbMotion) {
            links.forEach(function (l) {
                var on = l === activeLink;
                if (on) l.setAttribute("aria-current", "true");
                else l.removeAttribute("aria-current");
            });
            if (activeLink) syncThumb(activeLink, animateThumbMotion);
            else if (thumb) {
                thumb.style.width = "0";
                thumb.style.height = "0";
            }
        }

        function getActiveNavLink() {
            for (var i = 0; i < links.length; i++) {
                if (links[i].getAttribute("aria-current") === "true") return links[i];
            }
            return links[0] || null;
        }

        function repositionThumbInstant() {
            var cur = getActiveNavLink();
            if (cur && thumb) applyThumbInstant(measureThumbTarget(cur));
            else if (thumb) {
                thumb.style.width = "0";
                thumb.style.height = "0";
            }
        }

        var lastMatchedHref = "";

        links.forEach(function (link) {
            link.addEventListener("click", function (e) {
                var id = link.getAttribute("href");
                var target =
                    id && id.charAt(0) === "#" ? document.getElementById(id.slice(1)) : null;
                if (!target) return;
                e.preventDefault();
                navInteractLockUntil = Date.now() + (prefersReducedMotion ? 120 : 720);
                target.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
                history.replaceState(null, "", id);
                setActive(link, true);
                lastMatchedHref = link.getAttribute("href") || "";
            });
        });

        function pickActiveFromScroll() {
            if (Date.now() < navInteractLockUntil) return;

            var oy = headerOffset();
            var currentSlug = "";

            sections.forEach(function (section) {
                var rect = section.getBoundingClientRect();
                if (rect.top - oy <= 56) currentSlug = section.id;
            });

            var matched = null;
            links.forEach(function (l) {
                if (l.getAttribute("href") === "#" + currentSlug) matched = l;
            });
            if (!matched) {
                if (lastMatchedHref !== "") {
                    lastMatchedHref = "";
                    setActive(null, false);
                }
                return;
            }
            var href = matched.getAttribute("href") || "";
            if (href !== lastMatchedHref) {
                lastMatchedHref = href;
                setActive(matched, false);
            }
        }

        var ticking = false;
        function onScrollWindow() {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(function () {
                pickActiveFromScroll();
                ticking = false;
            });
        }

        window.addEventListener("scroll", onScrollWindow, { passive: true });
        window.addEventListener("resize", function () {
            lastMatchedHref = "";
            pickActiveFromScroll();
            repositionThumbInstant();
        });
        if (track) track.addEventListener("scroll", repositionThumbInstant, { passive: true });

        pickActiveFromScroll();
    }

    /* —— Lightbox (case study pages) —— */
    var lightboxLastFocus = null;

    function getOpenLightbox() {
        var list = document.querySelectorAll("[data-lightbox-root]");
        for (var i = 0; i < list.length; i++) {
            if (!list[i].hidden) return list[i];
        }
        return null;
    }

    function setupLightbox(box) {
        var openSel = box.getAttribute("data-open-button");
        var openBtn = null;
        if (openSel) {
            openBtn = openSel.indexOf("#") === 0
                ? document.querySelector(openSel)
                : document.getElementById(openSel);
        }
        var vp = box.querySelector(".lightbox-viewport");
        var toolbar = box.querySelector(".lightbox-toolbar");
        var dotsWrap = toolbar ? toolbar.querySelector(".lightbox-dots") : null;
        var prevBtn = toolbar ? toolbar.querySelector(".lightbox-arrow--prev") : null;
        var nextBtn = toolbar ? toolbar.querySelector(".lightbox-arrow--next") : null;
        var slides = vp ? vp.querySelectorAll(".lightbox-slide") : [];

        function slideWidth() {
            return vp ? vp.clientWidth : 0;
        }

        function maxIdx() {
            return Math.max(0, slides.length - 1);
        }

        function currentIndex() {
            var w = slideWidth();
            if (w <= 0 || !vp) return 0;
            return Math.round(vp.scrollLeft / w);
        }

        function goTo(i) {
            if (!vp) return;
            var w = slideWidth();
            vp.scrollTo({ left: i * w, behavior: prefersReducedMotion ? "instant" : "smooth" });
            syncDots();
        }

        function syncDots() {
            if (!dotsWrap) return;
            var idx = currentIndex();
            var dots = dotsWrap.querySelectorAll(".lightbox-dot");
            dots.forEach(function (d, j) {
                var on = j === idx;
                d.classList.toggle("lightbox-dot--active", on);
                if (on) d.setAttribute("aria-current", "true");
                else d.removeAttribute("aria-current");
            });
        }

        function buildDots() {
            if (!dotsWrap) return;
            dotsWrap.innerHTML = "";
            for (var i = 0; i < slides.length; i++) {
                var b = document.createElement("button");
                b.type = "button";
                b.className = "lightbox-dot";
                b.setAttribute("aria-label", "Image " + (i + 1) + " of " + slides.length);
                b.addEventListener(
                    "click",
                    (function (idx) {
                        return function () {
                            goTo(idx);
                        };
                    })(i)
                );
                dotsWrap.appendChild(b);
            }
            syncDots();
        }

        function open() {
            lightboxLastFocus = document.activeElement;
            box.hidden = false;
            document.body.classList.add("lightbox-open");
            buildDots();
            if (vp) vp.scrollLeft = 0;
            syncDots();
            var closeBtn = box.querySelector(".lightbox-close");
            if (closeBtn) closeBtn.focus();
        }

        function close() {
            box.hidden = true;
            if (!getOpenLightbox()) document.body.classList.remove("lightbox-open");
            if (lightboxLastFocus && typeof lightboxLastFocus.focus === "function")
                lightboxLastFocus.focus();
            lightboxLastFocus = null;
        }

        if (openBtn) openBtn.addEventListener("click", open);

        box.querySelectorAll("[data-lightbox-close]").forEach(function (el) {
            el.addEventListener("click", close);
        });

        if (vp) {
            vp.addEventListener("scroll", function () {
                window.requestAnimationFrame(syncDots);
            });
        }
        if (prevBtn)
            prevBtn.addEventListener("click", function () {
                goTo(Math.max(0, currentIndex() - 1));
            });
        if (nextBtn)
            nextBtn.addEventListener("click", function () {
                goTo(Math.min(maxIdx(), currentIndex() + 1));
            });

        window.addEventListener("resize", function () {
            if (box.hidden || !vp) return;
            goTo(currentIndex());
        });
    }

    function initLightboxes() {
        document.querySelectorAll("[data-lightbox-root]").forEach(setupLightbox);

        document.addEventListener("keydown", function (e) {
            var lb = getOpenLightbox();
            if (!lb) return;
            var vp = lb.querySelector(".lightbox-viewport");
            var slidesList = vp ? vp.querySelectorAll(".lightbox-slide") : [];
            var maxI = Math.max(0, slidesList.length - 1);
            function idx() {
                if (!vp) return 0;
                var w = vp.clientWidth;
                if (w <= 0) return 0;
                return Math.round(vp.scrollLeft / w);
            }
            function go(i) {
                if (!vp) return;
                vp.scrollTo({
                    left: i * vp.clientWidth,
                    behavior: prefersReducedMotion ? "instant" : "smooth",
                });
                var dots = lb.querySelectorAll(".lightbox-dot");
                dots.forEach(function (d, j) {
                    d.classList.toggle("lightbox-dot--active", j === i);
                    if (j === i) d.setAttribute("aria-current", "true");
                    else d.removeAttribute("aria-current");
                });
            }
            if (e.key === "Escape") {
                e.preventDefault();
                lb.hidden = true;
                if (!getOpenLightbox()) document.body.classList.remove("lightbox-open");
                if (lightboxLastFocus && typeof lightboxLastFocus.focus === "function")
                    lightboxLastFocus.focus();
                lightboxLastFocus = null;
                return;
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(Math.max(0, idx() - 1));
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                go(Math.min(maxI, idx() + 1));
            }
        });
    }

    function initReducedMotionListen() {
        var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
        function onChange(evt) {
            prefersReducedMotion = evt.matches;
        }
        if (mq.addEventListener) mq.addEventListener("change", onChange);
        else if (mq.addListener) mq.addListener(onChange);
    }

    function revealPanel(el) {
        el.classList.add("is-revealed");
    }

    /** Homepage: stagger by tier — section toggle (0), hero (1), then lower panels together (2). Scroll targets stay optional via [data-scroll-reveal]. */
    function initPanelReveals() {
        var loadEls = Array.prototype.slice.call(document.querySelectorAll("[data-load-reveal]"));
        var byTier = {};
        loadEls.forEach(function (el) {
            var t = parseInt(el.getAttribute("data-load-reveal"), 10);
            if (isNaN(t)) return;
            if (!byTier[t]) byTier[t] = [];
            byTier[t].push(el);
        });
        var tierKeys = Object.keys(byTier)
            .map(function (k) {
                return parseInt(k, 10);
            })
            .filter(function (n) {
                return !isNaN(n);
            })
            .sort(function (a, b) {
                return a - b;
            });
        var scrollEls = Array.prototype.slice.call(document.querySelectorAll("[data-scroll-reveal]"));

        function revealAllImmediately() {
            tierKeys.forEach(function (k) {
                byTier[k].forEach(revealPanel);
            });
            scrollEls.forEach(revealPanel);
        }

        if (prefersReducedMotion) {
            revealAllImmediately();
            return;
        }

        if (!tierKeys.length && !scrollEls.length) return;
        document.documentElement.classList.add("js-scroll-reveal");

        /** Milliseconds between tier beats — spaced for longer slide so panels don’t stack. */
        var loadStaggerMs = 280;
        tierKeys.forEach(function (tier) {
            window.setTimeout(function () {
                byTier[tier].forEach(revealPanel);
            }, tier * loadStaggerMs);
        });

        if (!scrollEls.length) return;

        if (typeof IntersectionObserver === "undefined") {
            scrollEls.forEach(revealPanel);
            return;
        }

        var observer = new IntersectionObserver(
            function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    var t = entry.target;
                    revealPanel(t);
                    observer.unobserve(t);
                });
            },
            { rootMargin: "0px 0px -6% 0px", threshold: 0.06 }
        );

        scrollEls.forEach(function (el) {
            observer.observe(el);
        });
    }

    function initFeaturedWorkMacbook() {
        var root = document.querySelector("[data-work-macbook]");
        if (!root) return;

        var unit = root.querySelector(".work-macbook__unit");
        var slidesTrack = root.querySelector(".work-macbook__slides");
        var slides = Array.prototype.slice.call(root.querySelectorAll("[data-macbook-slide]"));
        var dots = Array.prototype.slice.call(root.querySelectorAll("[data-macbook-index]"));
        var prevBtn = root.querySelector("[data-macbook-prev]");
        var nextBtn = root.querySelector("[data-macbook-next]");
        var idx = 0;
        var openHoldMs = 320;

        function setSlide(i) {
            if (i < 0 || i >= slides.length) return;
            idx = i;
            // Slide the carousel track horizontally — slides translate in/out
            // like a macOS spaces swipe rather than dissolving.
            if (slidesTrack) {
                slidesTrack.style.transform = "translate3d(" + (-i * 100) + "%, 0, 0)";
            }
            slides.forEach(function (el, j) {
                var on = j === i;
                el.classList.toggle("is-active", on);
                el.setAttribute("aria-hidden", on ? "false" : "true");
                if (on) el.removeAttribute("inert");
                else el.setAttribute("inert", "");
            });
            dots.forEach(function (btn, j) {
                var on = j === i;
                btn.classList.toggle("is-active", on);
                btn.setAttribute("aria-selected", on ? "true" : "false");
            });
        }

        dots.forEach(function (btn, j) {
            btn.addEventListener("click", function () {
                setSlide(j);
            });
        });

        if (prevBtn) {
            prevBtn.addEventListener("click", function () {
                setSlide((idx - 1 + slides.length) % slides.length);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener("click", function () {
                setSlide((idx + 1) % slides.length);
            });
        }

        root.addEventListener("keydown", function (e) {
            if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
            e.preventDefault();
            if (e.key === "ArrowRight") setSlide((idx + 1) % slides.length);
            else setSlide((idx - 1 + slides.length) % slides.length);
        });

        function openMacbook() {
            if (!unit) return;
            unit.classList.add("work-macbook__unit--open");
            unit.classList.add("work-macbook__unit--lift");
        }

        setSlide(0);

        if (prefersReducedMotion) {
            openMacbook();
            return;
        }

        // The lid opens only after the user has scrolled AND the laptop is meaningfully
        // in view, so most visitors get to see the unfold animation rather than missing it
        // on initial load.
        var openTriggered = false;
        function triggerOpen() {
            if (openTriggered) return;
            openTriggered = true;
            window.setTimeout(openMacbook, openHoldMs);
        }

        var userHasScrolled = false;
        function markScrolled() { userHasScrolled = true; }
        var scrollOpts = { passive: true, once: true };
        window.addEventListener("scroll", markScrolled, scrollOpts);
        window.addEventListener("wheel", markScrolled, scrollOpts);
        window.addEventListener("touchmove", markScrolled, scrollOpts);
        window.addEventListener(
            "keydown",
            function (e) {
                if (
                    e.key === "PageDown" ||
                    e.key === "PageUp" ||
                    e.key === "ArrowDown" ||
                    e.key === "ArrowUp" ||
                    e.key === "End" ||
                    e.key === "Home" ||
                    e.key === " "
                ) {
                    markScrolled();
                }
            },
            { once: true }
        );

        // Observe the outer container (frost-tilt--work-shell) so the threshold
        // reflects how much of the entire "Featured work" panel is in view — the
        // laptop opens only when ~90% of that container has scrolled past the fold.
        var observeTarget = root.closest(".frost-tilt--work-shell") || unit;

        if (typeof IntersectionObserver !== "undefined" && observeTarget) {
            var io = new IntersectionObserver(
                function (entries) {
                    entries.forEach(function (entry) {
                        if (!entry.isIntersecting) return;
                        if (entry.intersectionRatio < 0.9) return;
                        if (!userHasScrolled) return;
                        io.disconnect();
                        triggerOpen();
                    });
                },
                { threshold: [0, 0.5, 0.75, 0.9, 1.0] }
            );
            io.observe(observeTarget);
        } else {
            // Fallback: open when the container's bottom edge is near the viewport bottom.
            var onScroll = function () {
                if (!observeTarget) return;
                var rect = observeTarget.getBoundingClientRect();
                var vh = window.innerHeight || document.documentElement.clientHeight;
                if (rect.bottom < vh * 1.05 && rect.top < vh) {
                    window.removeEventListener("scroll", onScroll);
                    triggerOpen();
                }
            };
            window.addEventListener("scroll", onScroll, { passive: true });
        }

        /** “View case study” — expand MacBook display rect to full viewport, then navigate */
        (function initMacbookCaseStudyZoom() {
            var displayEl = root.querySelector(".work-macbook__display");
            if (!displayEl) return;

            var zoomMs = 640;
            var ease = "cubic-bezier(0.22, 1, 0.28, 1)";

            root.addEventListener("click", function (e) {
                var a = e.target && e.target.closest && e.target.closest("a.work-macbook__cta");
                if (!a || !root.contains(a)) return;

                var href = a.getAttribute("href");
                if (!href || href.charAt(0) === "#") return;
                if (e.defaultPrevented) return;
                if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
                if (typeof e.button === "number" && e.button !== 0) return;

                if (prefersReducedMotion) return;

                e.preventDefault();

                var r = displayEl.getBoundingClientRect();
                var br = window.getComputedStyle(displayEl).borderRadius || "10px";

                var curtain = document.createElement("div");
                curtain.className = "work-macbook-zoom-curtain";
                curtain.setAttribute("aria-hidden", "true");
                curtain.style.cssText = [
                    "position:fixed",
                    "left:" + r.left + "px",
                    "top:" + r.top + "px",
                    "width:" + r.width + "px",
                    "height:" + r.height + "px",
                    "border-radius:" + br,
                    "background:#fbfbfa",
                    "z-index:2147483646",
                    "will-change:left,top,width,height,border-radius",
                    "pointer-events:none",
                    "box-sizing:border-box",
                    "overflow:hidden",
                ].join(";");

                // Clone the active slide's screen-grid into the curtain (sans CTA).
                // During the zoom we also transition the clone's padding from the
                // MacBook screen layout to the case-hero-screen layout so that when
                // the destination page is revealed the content is ALREADY at its final
                // position — no jump.
                var activeSlide = root.querySelector(".work-macbook-slide.is-active");
                var srcGrid = activeSlide && activeSlide.querySelector(".work-macbook__screen-grid");
                var clone = null;
                if (srcGrid) {
                    clone = srcGrid.cloneNode(true);
                    var cta = clone.querySelector(".work-macbook__cta");
                    if (cta && cta.parentNode) cta.parentNode.removeChild(cta);
                    clone.style.width = "100%";
                    clone.style.height = "100%";
                    clone.style.boxSizing = "border-box";
                    clone.setAttribute("aria-hidden", "true");
                    var cloneInputs = clone.querySelectorAll("a, button, [tabindex]");
                    for (var ci = 0; ci < cloneInputs.length; ci++) {
                        cloneInputs[ci].setAttribute("tabindex", "-1");
                    }
                    curtain.appendChild(clone);
                }

                document.body.appendChild(curtain);
                document.documentElement.classList.add("work-macbook-zoom-active");
                document.body.style.overflow = "hidden";

                // Compute the case-hero-screen__inner's final padding so the clone
                // can transition into it during the zoom.  These mirror the CSS:
                //   padding-top:  max(64px, 9vh)
                //   padding-left/right: margin-auto centering + clamp(24px, 5vw, 64px)
                var vpW = window.innerWidth;
                var vpH = window.innerHeight;
                var heroMaxW = 1280;
                var heroPadH = Math.min(Math.max(24, vpW * 0.05), 64);
                var heroPadV = Math.max(64, vpH * 0.09);
                var heroMarginH = Math.max(0, (vpW - heroMaxW) / 2);
                var finalPadLeft = heroMarginH + heroPadH;
                var finalPadTop  = heroPadV;

                var done = false;
                function go() {
                    if (done) return;
                    done = true;
                    window.location.href = href;
                }

                function onEnd(ev) {
                    if (ev.target !== curtain) return;
                    curtain.removeEventListener("transitionend", onEnd);
                    go();
                }

                curtain.addEventListener("transitionend", onEnd);
                window.setTimeout(go, zoomMs + 200);

                var propEase = zoomMs + "ms " + ease;
                curtain.style.transition =
                    "left " + propEase +
                    ",top " + propEase +
                    ",width " + propEase +
                    ",height " + propEase +
                    ",border-radius " + propEase;

                // Transition clone content layout simultaneously with the curtain.
                // padding-left/right uses the same ease; padding-top slightly delayed
                // so the vertical shift reads as the content "settling" as it opens up.
                if (clone) {
                    clone.style.transition =
                        "padding-top " + propEase +
                        ",padding-left " + propEase +
                        ",padding-right " + propEase;
                }

                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        curtain.style.left = "0";
                        curtain.style.top = "0";
                        curtain.style.width = "100vw";
                        curtain.style.height = "100vh";
                        curtain.style.borderRadius = "0";
                        // Drive clone content to final hero-matching position
                        if (clone) {
                            clone.style.paddingTop   = finalPadTop  + "px";
                            clone.style.paddingLeft  = finalPadLeft + "px";
                            clone.style.paddingRight = finalPadLeft + "px";
                        }
                    });
                });
            });
        })();
    }

    /* —— About map: hover or focus a country to reveal its detail card —— */
    function initAboutMap() {
        var map = document.getElementById("about-map");
        if (!map) return;

        var countries = Array.prototype.slice.call(map.querySelectorAll(".country"));
        var cards     = Array.prototype.slice.call(map.querySelectorAll(".about-map__card"));

        function activate(loc) {
            map.setAttribute("data-active", loc);
            countries.forEach(function (c) {
                var on = c.getAttribute("data-loc") === loc;
                c.classList.toggle("is-active", on);
                c.setAttribute("aria-pressed", on ? "true" : "false");
            });
            cards.forEach(function (card) {
                card.setAttribute("aria-hidden", card.getAttribute("data-loc") === loc ? "false" : "true");
            });
        }

        function deactivate() {
            map.removeAttribute("data-active");
            countries.forEach(function (c) {
                c.classList.remove("is-active");
                c.setAttribute("aria-pressed", "false");
            });
            cards.forEach(function (card) { card.setAttribute("aria-hidden", "true"); });
        }

        countries.forEach(function (c) {
            var loc = c.getAttribute("data-loc");

            c.addEventListener("mouseenter", function () { activate(loc); });
            c.addEventListener("focus",      function () { activate(loc); });

            /* On touch + keyboard: click toggles open/closed */
            c.addEventListener("click", function (e) {
                e.preventDefault();
                if (c.classList.contains("is-active")) deactivate();
                else activate(loc);
            });

            c.addEventListener("keydown", function (e) {
                if (e.key === "Escape") { deactivate(); c.blur(); }
            });
        });

        /* Leave the row → close any active card (but keep cards visible if user
           moved their pointer ONTO a card — cards are inside .about-map__cards
           which is outside the row, so that's safe). */
        var row = map.querySelector(".about-map__row");
        if (row) row.addEventListener("mouseleave", deactivate);
    }

    /**
     * Hover-zoom lens for content-dense case-study screenshots.
     * Any <img data-magnify> gets a circular lens overlay that follows the
     * cursor and shows the underlying pixels at higher zoom — handy for the
     * Paradigm research artifacts (literature review, survey, journey map,
     * prioritization matrices, low/hi-fi prototypes).
     *
     * Skipped on touch-only devices where hover is not a primary input.
     */
    function initImageMagnify() {
        if (window.matchMedia && window.matchMedia("(hover: none)").matches) return;

        var imgs = Array.prototype.slice.call(document.querySelectorAll("img[data-magnify]"));
        if (!imgs.length) return;

        var LENS = 200;
        var ZOOM = 2.16;

        imgs.forEach(function (img) {
            var figure = img.closest("figure");
            if (!figure) return;

            figure.classList.add("case-figure--magnify");

            var lens = document.createElement("div");
            lens.className = "magnify-lens";
            lens.style.width = LENS + "px";
            lens.style.height = LENS + "px";
            figure.appendChild(lens);

            function applyBg() {
                var src = img.currentSrc || img.src;
                if (!src) return;
                lens.style.backgroundImage = 'url("' + src + '")';
            }
            if (img.complete && img.naturalWidth) applyBg();
            else img.addEventListener("load", applyBg);

            function onMove(e) {
                var rect = img.getBoundingClientRect();
                var x = e.clientX - rect.left;
                var y = e.clientY - rect.top;

                if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
                    lens.classList.remove("is-active");
                    return;
                }
                lens.classList.add("is-active");

                /* Position lens center directly under the cursor (figure-relative).
                   overflow:visible on .case-figure--magnify lets the lens hang
                   slightly past the image edge without being clipped. */
                var fr = figure.getBoundingClientRect();
                lens.style.left = (e.clientX - fr.left) + "px";
                lens.style.top  = (e.clientY - fr.top) + "px";

                /* Scale background to the image's displayed size × ZOOM, then
                   offset so the cursor's image-space point lands at the lens
                   center (LENS/2, LENS/2). */
                lens.style.backgroundSize =
                    (rect.width * ZOOM) + "px " + (rect.height * ZOOM) + "px";
                lens.style.backgroundPosition =
                    (LENS / 2 - x * ZOOM) + "px " + (LENS / 2 - y * ZOOM) + "px";
            }

            img.addEventListener("mouseenter", onMove);
            img.addEventListener("mousemove", onMove);
            img.addEventListener("mouseleave", function () {
                lens.classList.remove("is-active");
            });
        });
    }

    /**
     * Paradigm capstone PDF — custom page-by-page canvas viewer (PDF.js).
     */
    function initParadigmPdfViewer() {
        var root = document.querySelector("[data-paradigm-pdf]");
        if (!root || typeof pdfjsLib === "undefined") return;

        var srcAttr = root.getAttribute("data-pdf-src");
        if (!srcAttr) return;

        var src = new URL(srcAttr, window.location.href).href;
        var canvas = root.querySelector("[data-pdf-canvas]");
        var loadingEl = root.querySelector("[data-pdf-loading]");
        var errorEl = root.querySelector("[data-pdf-error]");
        var currentEl = root.querySelector("[data-pdf-current]");
        var totalEl = root.querySelector("[data-pdf-total]");
        var prevBtn = root.querySelector("[data-pdf-prev]");
        var nextBtn = root.querySelector("[data-pdf-next]");
        var stage = root.querySelector(".case-pdf-viewer__stage");

        if (!canvas || !stage || !prevBtn || !nextBtn) return;

        var ctx = canvas.getContext("2d");
        var pdfDoc = null;
        var pageNum = 1;
        var rendering = false;
        var pendingPage = null;
        var resizeTimer = null;

        canvas.hidden = true;

        function setControls() {
            prevBtn.disabled = !pdfDoc || pageNum <= 1;
            nextBtn.disabled = !pdfDoc || pageNum >= pdfDoc.numPages;
            if (currentEl) currentEl.textContent = String(pageNum);
        }

        function showError() {
            if (loadingEl) loadingEl.hidden = true;
            canvas.hidden = true;
            if (errorEl) errorEl.hidden = false;
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        }

        function renderPage(num) {
            if (!pdfDoc) return;

            var containerWidth = stage.clientWidth;
            if (containerWidth < 1) {
                window.requestAnimationFrame(function () {
                    renderPage(num);
                });
                return;
            }

            rendering = true;

            pdfDoc.getPage(num).then(function (page) {
                var baseViewport = page.getViewport({ scale: 1 });
                var scale = containerWidth / baseViewport.width;
                var outputScale = window.devicePixelRatio || 1;
                var viewport = page.getViewport({ scale: scale * outputScale });

                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.width = (viewport.width / outputScale) + "px";
                canvas.style.height = (viewport.height / outputScale) + "px";

                return page.render({ canvasContext: ctx, viewport: viewport }).promise;
            }).then(function () {
                rendering = false;
                canvas.hidden = false;
                if (loadingEl) loadingEl.hidden = true;
                if (pendingPage !== null) {
                    var queued = pendingPage;
                    pendingPage = null;
                    renderPage(queued);
                }
            }).catch(function (err) {
                rendering = false;
                if (typeof console !== "undefined" && console.error) {
                    console.error("Paradigm PDF render:", err);
                }
                showError();
            });
        }

        function queueRenderPage(num) {
            if (rendering) pendingPage = num;
            else renderPage(num);
        }

        function goToPage(num) {
            if (!pdfDoc || num < 1 || num > pdfDoc.numPages) return;
            pageNum = num;
            setControls();
            queueRenderPage(pageNum);
        }

        prevBtn.addEventListener("click", function () {
            goToPage(pageNum - 1);
        });

        nextBtn.addEventListener("click", function () {
            goToPage(pageNum + 1);
        });

        root.addEventListener("keydown", function (e) {
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                goToPage(pageNum - 1);
            } else if (e.key === "ArrowRight") {
                e.preventDefault();
                goToPage(pageNum + 1);
            }
        });

        window.addEventListener("resize", function () {
            if (!pdfDoc) return;
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                queueRenderPage(pageNum);
            }, 150);
        });

        fetch(src)
            .then(function (res) {
                if (!res.ok) throw new Error("HTTP " + res.status);
                return res.arrayBuffer();
            })
            .then(function (buffer) {
                return pdfjsLib.getDocument({ data: buffer }).promise;
            })
            .then(function (pdf) {
                pdfDoc = pdf;
                if (totalEl) totalEl.textContent = String(pdf.numPages);
                setControls();
                renderPage(pageNum);
            })
            .catch(function (err) {
                if (typeof console !== "undefined" && console.error) {
                    console.error("Paradigm PDF viewer:", err);
                }
                showError();
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        initReducedMotionListen();
        initPanelReveals();
        initFeaturedWorkMacbook();
        initClocks();
        initSectionNav();
        initContactForm();
        initLightboxes();
        initAboutMap();
        initImageMagnify();
        initParadigmPdfViewer();
    });
})();
