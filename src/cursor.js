import { gsap } from "gsap";

/* Custom cursor with hover states + magnetic buttons */
export function initCursor() {
  const cursor = document.querySelector(".cursor");
  if (!cursor || window.matchMedia("(pointer: coarse)").matches) return;

  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const ringPos = { ...pos };

  const xSet = gsap.quickSetter(dot, "x", "px");
  const ySet = gsap.quickSetter(dot, "y", "px");
  const rxSet = gsap.quickSetter(ring, "x", "px");
  const rySet = gsap.quickSetter(ring, "y", "px");

  window.addEventListener(
    "pointermove",
    (e) => {
      pos.x = e.clientX;
      pos.y = e.clientY;
      xSet(pos.x);
      ySet(pos.y);
    },
    { passive: true }
  );

  gsap.ticker.add(() => {
    ringPos.x += (pos.x - ringPos.x) * 0.18;
    ringPos.y += (pos.y - ringPos.y) * 0.18;
    rxSet(ringPos.x);
    rySet(ringPos.y);
  });

  // hover states via delegation
  const viewEls = document.querySelectorAll('[data-cursor="view"]');
  const hideEls = document.querySelectorAll('[data-cursor="hide"]');
  const hoverEls = document.querySelectorAll(
    "a:not([data-cursor]), button:not([data-cursor]), [data-link]"
  );

  viewEls.forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-view"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-view"));
  });
  hideEls.forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hidden"));
    el.addEventListener("mouseleave", () =>
      cursor.classList.remove("is-hidden")
    );
  });
  hoverEls.forEach((el) => {
    el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
    el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
  });

  document.addEventListener("mouseleave", () =>
    gsap.to(cursor, { opacity: 0, duration: 0.3 })
  );
  document.addEventListener("mouseenter", () =>
    gsap.to(cursor, { opacity: 1, duration: 0.3 })
  );
}

/* Magnetic effect for [data-magnetic] elements */
export function initMagnetic() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const els = document.querySelectorAll("[data-magnetic]");

  els.forEach((el) => {
    const strength = 0.4;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      gsap.to(el, {
        x: x * strength,
        y: y * strength,
        duration: 0.6,
        ease: "power3.out",
      });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: 0.7,
        ease: "elastic.out(1, 0.4)",
      });
    });
  });
}
