import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---- Hero intro (runs after preloader) ---- */
export function revealHero() {
  const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

  if (reduce) {
    gsap.set(".hero__title [data-stagger]", { yPercent: 0, opacity: 1 });
    gsap.set(
      ".hero__top .reveal-line, .hero__bottom .reveal-line, .hero__scroll",
      { opacity: 1, y: 0 }
    );
    return tl;
  }

  tl.set(".hero", { autoAlpha: 1 })
    .set(".hero__title [data-stagger]", { yPercent: 115 })
    .to(".hero__title [data-stagger]", {
      yPercent: 0,
      duration: 1.2,
      stagger: 0.12,
    })
    .to(
      ".hero__top .reveal-line",
      { opacity: 1, y: 0, duration: 1, stagger: 0.1 },
      "-=0.9"
    )
    .to(
      ".hero__bottom .reveal-line",
      { opacity: 1, y: 0, duration: 1 },
      "-=0.85"
    )
    .to(".hero__scroll", { opacity: 1, y: 0, duration: 1 }, "<");

  return tl;
}

/* ---- Generic scroll reveals + per-section choreography ---- */
export function initScrollAnimations() {
  if (reduce) return;

  // pre-state for hero reveal-lines (animated by revealHero)
  gsap.set(".hero__top .reveal-line, .hero__bottom .reveal-line", {
    opacity: 0,
    y: 24,
  });
  gsap.set(".hero__scroll", { opacity: 0, y: 24 });

  // Section headings: index + label slide/clip in
  gsap.utils.toArray(".section-head").forEach((head) => {
    gsap.from(head.children, {
      yPercent: 120,
      opacity: 0,
      duration: 1,
      ease: "expo.out",
      stagger: 0.08,
      scrollTrigger: { trigger: head, start: "top 88%" },
    });
  });

  // About statement: word-by-word brighten on scrub
  const aboutEl = document.querySelector("[data-words]");
  if (aboutEl) {
    const split = new SplitType(aboutEl, { types: "words", tagName: "span" });
    gsap.set(split.words, { opacity: 0.14 });
    gsap.to(split.words, {
      opacity: 1,
      ease: "none",
      stagger: 0.5,
      scrollTrigger: {
        trigger: aboutEl,
        start: "top 78%",
        end: "bottom 62%",
        scrub: true,
      },
    });
  }

  // About aside (portrait + meta)
  gsap.from(".about__aside > *", {
    y: 50,
    opacity: 0,
    duration: 1.1,
    ease: "expo.out",
    stagger: 0.12,
    scrollTrigger: { trigger: ".about__aside", start: "top 82%" },
  });

  // Work items rise in
  gsap.from(".work__item", {
    yPercent: 40,
    opacity: 0,
    duration: 1,
    ease: "expo.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".work__list", start: "top 80%" },
  });

  // Generic [data-reveal] (cards, stats)
  ScrollTrigger.batch("[data-reveal]", {
    start: "top 88%",
    onEnter: (batch) =>
      gsap.to(batch, {
        y: 0,
        opacity: 1,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.1,
        overwrite: true,
      }),
  });
  gsap.set("[data-reveal]", { y: 60, opacity: 0 });

  // Contact title clip-up + eyebrow/email
  gsap.set(".contact__title [data-stagger]", { yPercent: 115 });
  gsap.set(".contact__eyebrow, .contact__email", { opacity: 0, y: 30 });
  const ctl = gsap.timeline({
    scrollTrigger: { trigger: ".contact__top", start: "top 75%" },
    defaults: { ease: "expo.out" },
  });
  ctl
    .to(".contact__eyebrow", { opacity: 1, y: 0, duration: 1 })
    .to(
      ".contact__title [data-stagger]",
      { yPercent: 0, duration: 1.2, stagger: 0.1 },
      "-=0.8"
    )
    .to(".contact__email", { opacity: 1, y: 0, duration: 1 }, "-=0.7");

  // Footer wordmark drift
  gsap.to("[data-marquee-foot]", {
    xPercent: -12,
    ease: "none",
    scrollTrigger: {
      trigger: ".contact__wordmark",
      start: "top bottom",
      end: "bottom top",
      scrub: 0.6,
    },
  });

  // Hero parallax on scroll
  gsap.to(".hero__title", {
    yPercent: -14,
    opacity: 0.55,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
  gsap.to(".hero__canvas", {
    yPercent: 12,
    ease: "none",
    scrollTrigger: {
      trigger: ".hero",
      start: "top top",
      end: "bottom top",
      scrub: true,
    },
  });
}

/* ---- Animated number counters ---- */
export function initCounters() {
  gsap.utils.toArray("[data-count]").forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    if (reduce) {
      el.textContent = end + suffix;
      return;
    }
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el,
      start: "top 88%",
      once: true,
      onEnter: () =>
        gsap.to(obj, {
          v: end,
          duration: 1.8,
          ease: "power3.out",
          onUpdate: () => {
            el.textContent = Math.round(obj.v) + suffix;
          },
        }),
    });
  });
}

/* ---- Header marquee with velocity boost + footer ---- */
export function initMarquee() {
  const track = document.querySelector("#marquee");
  if (!track || reduce) return;

  const loop = gsap.to(track, {
    xPercent: -50,
    repeat: -1,
    duration: 22,
    ease: "none",
  });

  const base = 1;
  let target = base;
  ScrollTrigger.create({
    onUpdate: (self) => {
      target = base + Math.min(Math.abs(self.getVelocity()) / 450, 5);
    },
  });
  gsap.ticker.add(() => {
    target += (base - target) * 0.045;
    loop.timeScale(target);
  });
}

/* ---- Cursor-following project image reveal ---- */
export function initWorkReveal() {
  const reveal = document.querySelector("#workReveal");
  const inner = reveal?.querySelector(".work__reveal-inner");
  const items = gsap.utils.toArray("[data-project]");
  if (!reveal || !inner || window.matchMedia("(pointer: coarse)").matches)
    return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const xTo = gsap.quickTo(reveal, "x", { duration: 0.5, ease: "power3" });
  const yTo = gsap.quickTo(reveal, "y", { duration: 0.5, ease: "power3" });
  let active = false;

  window.addEventListener(
    "pointermove",
    (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      if (active) {
        xTo(pos.x);
        yTo(pos.y);
      }
    },
    { passive: true }
  );

  items.forEach((item) => {
    const img = item.dataset.img;
    const color = item.dataset.color || "#c7f546";
    item.addEventListener("mouseenter", () => {
      active = true;
      inner.style.backgroundColor = color;
      inner.style.backgroundImage = `url(${img})`;
      gsap.set(reveal, { x: pos.x, y: pos.y });
      gsap.to(reveal, {
        opacity: 1,
        scale: 1,
        duration: 0.6,
        ease: "expo.out",
        overwrite: true,
      });
    });
    item.addEventListener("mouseleave", () => {
      active = false;
      gsap.to(reveal, {
        opacity: 0,
        scale: 0.8,
        duration: 0.4,
        ease: "power3.out",
        overwrite: true,
      });
    });
  });
}
