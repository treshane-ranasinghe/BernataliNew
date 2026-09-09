/* =====================================================================
   BERNATALI — Interaction & animation engine
   Vanilla JS, no dependencies. Every effect degrades gracefully and
   is disabled when the visitor prefers reduced motion.
   ===================================================================== */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function $$(sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  }

  /* ------------------------------------------------------------------
     1. PRELOADER
     ------------------------------------------------------------------ */
  function initPreloader() {
    var pre = $("[data-preloader]");
    if (!pre) return;

    var bar = $(".preloader__bar span", pre);
    var pct = 0;

    var tick = setInterval(function () {
      pct = Math.min(pct + Math.random() * 18, 92);
      if (bar) bar.style.width = pct + "%";
    }, 130);

    function finish() {
      clearInterval(tick);
      if (bar) bar.style.width = "100%";
      setTimeout(function () {
        pre.classList.add("is-done");
        document.body.classList.remove("is-locked");
        document.body.classList.add("is-loaded");
      }, 260);
    }

    window.addEventListener("load", finish);
    // Never trap the visitor if a video or font stalls.
    setTimeout(finish, 3500);
  }

  /* ------------------------------------------------------------------
     2. HEADER — sticky state + hide on scroll down
     ------------------------------------------------------------------ */
  function initHeader() {
    var header = $("[data-header]");
    if (!header) return;

    var last = 0;

    function onScroll() {
      var y = window.pageYOffset;

      header.classList.toggle("is-stuck", y > 60);

      // Hide when scrolling down past the hero, show on scroll up.
      if (y > 400 && y > last && !document.body.classList.contains("nav-open")) {
        header.classList.add("is-hidden");
      } else {
        header.classList.remove("is-hidden");
      }
      last = y;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ------------------------------------------------------------------
     3. MOBILE NAV
     ------------------------------------------------------------------ */
  function initNav() {
    var burger = $("[data-nav-toggle]");
    var panel = $("[data-nav-panel]");
    if (!burger || !panel) return;

    function setOpen(open) {
      document.body.classList.toggle("nav-open", open);
      document.body.classList.toggle("is-locked", open);
      burger.setAttribute("aria-expanded", String(open));
    }

    burger.addEventListener("click", function () {
      setOpen(!document.body.classList.contains("nav-open"));
    });

    $$("a", panel).forEach(function (link) {
      link.addEventListener("click", function () {
        setOpen(false);
      });
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /* ------------------------------------------------------------------
     4. SCROLL PROGRESS + GO TOP RING
     ------------------------------------------------------------------ */
  function initProgress() {
    var bar = $("[data-progress]");
    var goTop = $("[data-go-top]");
    var ring = goTop ? $(".go-top__ring circle", goTop) : null;
    var CIRC = 151; // 2πr with r = 24

    function onScroll() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var p = h > 0 ? Math.min(window.pageYOffset / h, 1) : 0;

      if (bar) bar.style.transform = "scaleX(" + p + ")";
      if (goTop) goTop.classList.toggle("is-visible", window.pageYOffset > 500);
      if (ring) ring.style.strokeDashoffset = String(CIRC - CIRC * p);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    if (goTop) {
      goTop.addEventListener("click", function (e) {
        e.preventDefault();
        window.scrollTo({
          top: 0,
          behavior: reduced ? "auto" : "smooth",
        });
      });
    }
  }

  /* ------------------------------------------------------------------
     5. REVEAL ON SCROLL
     Elements marked [data-reveal] animate in once. A parent marked
     [data-reveal-group] staggers its children automatically.
     ------------------------------------------------------------------ */
  function initReveal() {
    var items = $$("[data-reveal]");

    // Auto-stagger children of a group.
    $$("[data-reveal-group]").forEach(function (group) {
      var step = parseFloat(group.dataset.revealStep) || 0.09;
      $$("[data-reveal]", group).forEach(function (child, i) {
        if (!child.style.getPropertyValue("--delay")) {
          child.style.setProperty("--delay", (i * step).toFixed(2) + "s");
        }
      });
    });

    if (reduced || !("IntersectionObserver" in window)) {
      items.forEach(function (el) {
        el.classList.add("is-revealed");
      });
      $$(".reveal-lines").forEach(function (el) {
        el.classList.add("is-revealed");
      });
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    items.forEach(function (el) {
      io.observe(el);
    });
    $$(".reveal-lines").forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     6. COUNTERS
     ------------------------------------------------------------------ */
  function initCounters() {
    var counters = $$("[data-count]");
    if (!counters.length) return;

    function run(el) {
      var target = parseFloat(el.dataset.count) || 0;
      var dur = parseInt(el.dataset.countDuration, 10) || 1900;

      if (reduced) {
        el.textContent = target.toLocaleString();
        return;
      }

      var start = null;

      function frame(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / dur, 1);
        // easeOutExpo
        var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        el.textContent = Math.round(target * eased).toLocaleString();
        if (t < 1) requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }

    if (!("IntersectionObserver" in window)) {
      counters.forEach(run);
      return;
    }

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          run(entry.target);
          io.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );

    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ------------------------------------------------------------------
     7. SLIDESHOW
     ------------------------------------------------------------------ */
  function initSlider() {
    var slider = $("[data-slider]");
    if (!slider) return;

    var slides = $$(".slider__slide", slider);
    var dotsWrap = $("[data-slider-dots]", slider);
    if (slides.length < 2) return;

    var index = 0;
    var timer = null;
    var DELAY = 5200;

    var dots = slides.map(function (_, i) {
      var dot = document.createElement("button");
      dot.className = "slider__dot" + (i === 0 ? " is-active" : "");
      dot.type = "button";
      dot.setAttribute("aria-label", "Go to slide " + (i + 1));
      dot.addEventListener("click", function () {
        go(i);
        restart();
      });
      if (dotsWrap) dotsWrap.appendChild(dot);
      return dot;
    });

    function go(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (s, i) {
        s.classList.toggle("is-active", i === index);
        s.setAttribute("aria-hidden", String(i !== index));
      });
      dots.forEach(function (d, i) {
        d.classList.toggle("is-active", i === index);
      });
    }

    function restart() {
      clearInterval(timer);
      if (!reduced) {
        timer = setInterval(function () {
          go(index + 1);
        }, DELAY);
      }
    }

    $$("[data-slider-prev]", slider).forEach(function (btn) {
      btn.addEventListener("click", function () {
        go(index - 1);
        restart();
      });
    });
    $$("[data-slider-next]", slider).forEach(function (btn) {
      btn.addEventListener("click", function () {
        go(index + 1);
        restart();
      });
    });

    slider.addEventListener("mouseenter", function () {
      clearInterval(timer);
    });
    slider.addEventListener("mouseleave", restart);

    // Touch swipe
    var startX = null;
    slider.addEventListener(
      "touchstart",
      function (e) {
        startX = e.touches[0].clientX;
      },
      { passive: true }
    );
    slider.addEventListener(
      "touchend",
      function (e) {
        if (startX === null) return;
        var dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 45) go(dx < 0 ? index + 1 : index - 1);
        startX = null;
        restart();
      },
      { passive: true }
    );

    go(0);
    restart();
  }

  /* ------------------------------------------------------------------
     8. MARQUEE — duplicate the group so the loop is seamless
     ------------------------------------------------------------------ */
  function initMarquee() {
    $$("[data-marquee]").forEach(function (track) {
      var group = $(".marquee__group, .ribbon__group", track);
      if (!group) return;
      var clone = group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
  }

  /* ------------------------------------------------------------------
     9. 3D TILT
     ------------------------------------------------------------------ */
  function initTilt() {
    if (reduced || !fine) return;

    $$("[data-tilt]").forEach(function (el) {
      var max = parseFloat(el.dataset.tilt) || 8;
      var raf = null;

      function move(e) {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(function () {
          var r = el.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width - 0.5;
          var py = (e.clientY - r.top) / r.height - 0.5;
          el.style.transform =
            "perspective(1000px) rotateX(" +
            (-py * max).toFixed(2) +
            "deg) rotateY(" +
            (px * max).toFixed(2) +
            "deg) translateY(-8px)";
        });
      }

      function reset() {
        if (raf) cancelAnimationFrame(raf);
        el.style.transform = "";
      }

      el.addEventListener("mousemove", move);
      el.addEventListener("mouseleave", reset);
    });
  }

  /* ------------------------------------------------------------------
     10. MAGNETIC BUTTONS
     ------------------------------------------------------------------ */
  function initMagnetic() {
    if (reduced || !fine) return;

    $$("[data-magnetic]").forEach(function (el) {
      var strength = parseFloat(el.dataset.magnetic) || 0.28;

      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left - r.width / 2) * strength;
        var y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = "translate(" + x + "px," + y + "px)";
      });

      el.addEventListener("mouseleave", function () {
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------
     11. CUSTOM CURSOR
     ------------------------------------------------------------------ */
  function initCursor() {
    if (reduced || !fine) return;

    var dot = document.createElement("div");
    var ring = document.createElement("div");
    dot.className = "cursor-dot";
    ring.className = "cursor-ring";
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = window.innerWidth / 2;
    var my = window.innerHeight / 2;
    var rx = mx;
    var ry = my;

    document.addEventListener("mousemove", function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = "translate(" + mx + "px," + my + "px)";
      document.body.classList.add("cursor-ready");
    });

    (function loop() {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      ring.style.transform = "translate(" + rx + "px," + ry + "px)";
      requestAnimationFrame(loop);
    })();

    var hot = "a, button, [data-tilt], .partner, .chip, .tile, input, textarea";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(hot)) document.body.classList.add("cursor-hover");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(hot)) document.body.classList.remove("cursor-hover");
    });

    document.addEventListener("mouseleave", function () {
      document.body.classList.remove("cursor-ready");
    });
  }

  /* ------------------------------------------------------------------
     12. PARALLAX — subtle, transform-only
     ------------------------------------------------------------------ */
  function initParallax() {
    var items = $$("[data-parallax]");
    if (reduced || !items.length) return;

    var ticking = false;

    function update() {
      var vh = window.innerHeight;
      items.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.dataset.parallax) || 0.12;
        var offset = (r.top + r.height / 2 - vh / 2) * speed;
        el.style.transform = "translate3d(0," + offset.toFixed(1) + "px,0)";
      });
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  }

  /* ------------------------------------------------------------------
     13. SCROLLSPY — highlight the nav link for the visible section
     ------------------------------------------------------------------ */
  function initScrollSpy() {
    var links = $$("[data-spy]");
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = {};
    var sections = [];

    links.forEach(function (link) {
      var id = (link.getAttribute("href") || "").replace(/^.*#/, "");
      var section = id ? document.getElementById(id) : null;
      if (!section) return;
      map[id] = link;
      sections.push(section);
    });

    if (!sections.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (l) {
            l.classList.remove("is-active");
          });
          var active = map[entry.target.id];
          if (active) active.classList.add("is-active");
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    sections.forEach(function (s) {
      io.observe(s);
    });
  }

  /* ------------------------------------------------------------------
     14. HERO TITLE — wrap words for the staggered reveal
     ------------------------------------------------------------------ */
  function initSplitText() {
    $$("[data-split]").forEach(function (el) {
      var words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      words.forEach(function (word, i) {
        var outer = document.createElement("span");
        var inner = document.createElement("span");
        outer.className = "word";
        outer.style.setProperty("--i", String(i));
        inner.style.setProperty("--i", String(i));
        inner.textContent = word;
        outer.appendChild(inner);
        el.appendChild(outer);
        if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
      });
    });
  }

  /* ------------------------------------------------------------------
     15. VIDEO — make sure autoplay actually starts
     ------------------------------------------------------------------ */
  function initVideo() {
    $$("video[autoplay]").forEach(function (v) {
      v.muted = true;
      var p = v.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {
          /* Autoplay blocked — the poster/scrim still looks right. */
        });
      }
    });
  }

  /* ------------------------------------------------------------------
     BOOT
     ------------------------------------------------------------------ */
  function boot() {
    initSplitText();
    initPreloader();
    initHeader();
    initNav();
    initProgress();
    initReveal();
    initCounters();
    initSlider();
    initMarquee();
    initTilt();
    initMagnetic();
    initCursor();
    initParallax();
    initScrollSpy();
    initVideo();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
