import "./style.css";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";

import { initWebGL } from "./webgl.js";
import { initCursor, initMagnetic } from "./cursor.js";
import {
  revealHero,
  initScrollAnimations,
  initCounters,
  initMarquee,
  initWorkReveal,
} from "./animations.js";

gsap.registerPlugin(ScrollTrigger);
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Pre-hide hero pieces immediately (covered by loader) to avoid a flash on reveal
if (!reduce) {
  gsap.set(".hero__title [data-stagger]", { yPercent: 115 });
  gsap.set(
    ".hero__top .reveal-line, .hero__bottom .reveal-line, .hero__scroll",
    { opacity: 0, y: 24 }
  );
}

/* -------------------------------------------------- Smooth scroll (Lenis) */
const lenis = new Lenis({
  duration: 1.1,
  easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  smoothWheel: !reduce,
});
lenis.on("scroll", ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.stop(); // resume after preloader

// Anchor links → smooth scroll
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    lenis.scrollTo(el, { offset: 0, duration: 1.3 });
  });
});

/* -------------------------------------------------- Live clock (Lisbon) */
function startClock() {
  const els = document.querySelectorAll("[data-clock]");
  if (!els.length) return;
  const fmt = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Europe/Lisbon",
  });
  const update = () => {
    const t = fmt.format(new Date());
    els.forEach((el) => (el.textContent = t));
  };
  update();
  setInterval(update, 1000);
}

/* -------------------------------------------------- Nav scrolled state */
function initNav() {
  const nav = document.querySelector("#nav");
  let hidden = false;
  ScrollTrigger.create({
    start: "top -80",
    end: "max",
    onUpdate: (self) => {
      const down = self.direction === 1;
      const y = self.scroll();
      if (down && y > 300 && !hidden) {
        hidden = true;
        gsap.to(nav, { yPercent: -130, duration: 0.5, ease: "power3.out" });
      } else if ((!down || y < 300) && hidden) {
        hidden = false;
        gsap.to(nav, { yPercent: 0, duration: 0.5, ease: "power3.out" });
      }
    },
  });
}

/* -------------------------------------------------- Preloader */
function runPreloader() {
  const loader = document.querySelector("#loader");
  const fill = document.querySelector("#loaderFill");
  const count = document.querySelector("#loaderCount");
  const words = document.querySelectorAll(".loader__word");

  const finish = () => {
    lenis.start();
    startClock();
    initWebGL(document.querySelector("#webgl"));
    initScrollAnimations();
    initCounters();
    initMarquee();
    initWorkReveal();
    initCursor();
    initMagnetic();
    initNav();
    revealHero();
    ScrollTrigger.refresh();
  };

  if (reduce || !loader) {
    if (loader) loader.style.display = "none";
    finish();
    return;
  }

  const counter = { v: 0 };
  const tl = gsap.timeline();

  tl.to(words, {
    yPercent: -100,
    duration: 1,
    ease: "expo.out",
    stagger: 0.08,
  })
    .to(
      fill,
      { scaleX: 1, duration: 2.1, ease: "power2.inOut" },
      0
    )
    .to(
      counter,
      {
        v: 100,
        duration: 2.1,
        ease: "power2.inOut",
        onUpdate: () => {
          count.textContent = Math.round(counter.v);
        },
      },
      0
    )
    .addLabel("out", "+=0.15")
    .to(".loader__inner", { y: -30, opacity: 0, duration: 0.6, ease: "power2.in" }, "out")
    .to(
      loader,
      {
        yPercent: -100,
        duration: 1,
        ease: "expo.inOut",
        onComplete: () => {
          loader.style.display = "none";
        },
      },
      "out+=0.2"
    )
    .add(finish, "out+=0.55");
}

/* -------------------------------------------------- Boot */
window.scrollTo(0, 0);
// Start the branded intro as soon as fonts are ready (capped), rather than
// waiting on every asset — keeps the preloader snappy and avoids font swap.
let booted = false;
const boot = () => {
  if (booted) return;
  booted = true;
  runPreloader();
};
if (document.fonts && document.fonts.ready) {
  Promise.race([
    document.fonts.ready,
    new Promise((r) => setTimeout(r, 1500)),
  ]).then(boot);
} else {
  window.addEventListener("load", boot, { once: true });
}
