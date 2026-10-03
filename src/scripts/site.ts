import Lenis from "lenis";

const on = <T extends Element>(selector: string, callback: (element: T) => void) => {
  document.querySelectorAll<T>(selector).forEach(callback);
};

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const prefersReducedMotion = () => reducedMotionQuery.matches;

const nestedScrollSelector = "input, textarea, select, button, [contenteditable='true']";
const markNestedScrollAreas = () => {
  document.querySelectorAll<HTMLElement>("*").forEach((element) => {
    if (element.matches(nestedScrollSelector)) {
      element.removeAttribute("data-lenis-prevent");
      return;
    }
    const styles = window.getComputedStyle(element);
    const scrollableY = ["auto", "scroll"].includes(styles.overflowY) && element.scrollHeight > element.clientHeight;
    const scrollableX = ["auto", "scroll"].includes(styles.overflowX) && element.scrollWidth > element.clientWidth;
    element.toggleAttribute("data-lenis-prevent", scrollableY || scrollableX);
  });
};

let smoothScroll: Lenis | null = null;
if (!prefersReducedMotion()) {
  markNestedScrollAreas();
  smoothScroll = new Lenis({ duration: 1 });
  (window as Window & { lenisVersion?: string }).lenisVersion = "1.1.2";
  smoothScroll.scrollTo(0, { immediate: true });

  let smoothScrollFrame = 0;
  const updateSmoothScroll = (time: number) => {
    smoothScroll?.raf(time);
    smoothScrollFrame = window.requestAnimationFrame(updateSmoothScroll);
  };
  smoothScrollFrame = window.requestAnimationFrame(updateSmoothScroll);

  const syncScrollLock = () => {
    if (!smoothScroll) return;
    if (document.body.classList.contains("menu-open") || document.documentElement.style.overflow === "hidden") smoothScroll.stop();
    else smoothScroll.start();
  };
  const scrollLockObserver = new MutationObserver(syncScrollLock);
  scrollLockObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  scrollLockObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest<HTMLAnchorElement>("a[href]");
    if (!anchor || anchor.hasAttribute("data-scroll-link")) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin || url.pathname !== window.location.pathname || !url.hash) return;
    const targetElement = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!targetElement) return;
    event.preventDefault();
    const scrollMarginTop = Number.parseInt(window.getComputedStyle(targetElement).scrollMarginTop, 10) || 0;
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    smoothScroll?.scrollTo(targetElement, { offset: -scrollMarginTop });
  }, true);

  window.addEventListener("resize", markNestedScrollAreas, { passive: true });
  window.addEventListener("pagehide", () => {
    window.cancelAnimationFrame(smoothScrollFrame);
    scrollLockObserver.disconnect();
    smoothScroll?.destroy();
    smoothScroll = null;
  }, { once: true });
}

const menuToggle = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const mobileMenu = document.querySelector<HTMLElement>("[data-mobile-menu]");

const setMenu = (open: boolean) => {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  mobileMenu.hidden = !open;
  document.body.classList.toggle("menu-open", open);
};

menuToggle?.addEventListener("click", () => {
  setMenu(menuToggle.getAttribute("aria-expanded") !== "true");
});

mobileMenu?.addEventListener("click", (event) => {
  if ((event.target as Element).closest("a")) setMenu(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || mobileMenu?.hidden) return;
  const focusWasInMenu = mobileMenu?.contains(document.activeElement);
  setMenu(false);
  if (focusWasInMenu) menuToggle?.focus();
});

document.addEventListener("focusin", (event) => {
  if (!mobileMenu?.hidden && !document.querySelector("[data-header]")?.contains(event.target as Node)) {
    setMenu(false);
  }
});

window.matchMedia("(max-width: 1199px)").addEventListener("change", (event) => {
  if (event.matches || mobileMenu?.hidden) return;
  const focusWillBeHidden = mobileMenu?.contains(document.activeElement) || document.activeElement === menuToggle;
  setMenu(false);
  if (focusWillBeHidden) document.querySelector<HTMLAnchorElement>(".site-nav .brand")?.focus();
});

const resourceToggle = document.querySelector<HTMLButtonElement>("[data-resource-toggle]");
const resourceMenu = document.querySelector<HTMLElement>("[data-resource-menu]");
const resourceRoot = resourceToggle?.closest<HTMLElement>('.resource-menu');
let resourceOpenedByHover = false;
const setResources = (open:boolean) => {
  resourceToggle?.setAttribute('aria-expanded', String(open));
  resourceMenu?.classList.toggle('open', open);
};
resourceRoot?.addEventListener('pointerenter', () => {
  resourceOpenedByHover = resourceToggle?.getAttribute('aria-expanded') !== 'true';
  setResources(true);
});
resourceRoot?.addEventListener('pointerleave', () => {
  if (!resourceRoot.contains(document.activeElement)) setResources(false);
});
resourceRoot?.addEventListener('focusout', event => {
  if (!resourceRoot.contains(event.relatedTarget as Node | null)) setResources(false);
});
resourceRoot?.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    setResources(false);
    resourceToggle?.focus();
    resourceOpenedByHover = false;
  }
  if (event.key === 'ArrowDown' && event.target === resourceToggle) {
    event.preventDefault();
    setResources(true);
    resourceMenu?.querySelector<HTMLAnchorElement>('a')?.focus();
  }
});
resourceToggle?.addEventListener("click", () => {
  setResources(resourceOpenedByHover || resourceToggle.getAttribute('aria-expanded') !== 'true');
  resourceOpenedByHover = false;
});

document.addEventListener("click", (event) => {
  if (!(event.target as Element).closest(".resource-menu")) {
    setResources(false);
  }
});

const panelTransitions = new WeakMap<HTMLElement, Animation[]>();
on<HTMLButtonElement>("[data-tabs] [role='tab']", (tab) => {
  tab.addEventListener("click", () => {
    const tabs = tab.closest<HTMLElement>("[data-tabs]");
    const target = tab.dataset.tab;
    if (!tabs || !target || tab.getAttribute("aria-selected") === "true") return;

    panelTransitions.get(tabs)?.forEach((animation) => animation.cancel());
    panelTransitions.delete(tabs);

    tabs.querySelectorAll<HTMLElement>("[role='tab']").forEach((candidate) => {
      const selected = candidate === tab;
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
    });
    const panels = [...tabs.querySelectorAll<HTMLElement>("[role='tabpanel']")];
    const incoming = panels.find((panel) => panel.dataset.panel === target);
    const outgoing = panels.find((panel) => !panel.hidden && panel !== incoming);

    if (!incoming) return;
    panels.forEach((panel) => {
      panel.inert = panel !== incoming;
      delete panel.dataset.motionState;
      if (panel !== incoming && panel !== outgoing) panel.hidden = true;
    });
    if (prefersReducedMotion() || !incoming.hasAttribute("data-motion-panel")) {
      panels.forEach((panel) => { panel.hidden = panel !== incoming; });
      return;
    }

    incoming.hidden = false;
    incoming.dataset.motionState = "entering";
    const enter = incoming.animate(
      [{ opacity: 0, transform: "translateY(12px) scale(.985)" }, { opacity: 1, transform: "none" }],
      { duration: 400, easing: "cubic-bezier(.44,0,.56,1)", fill: "both" },
    );
    const transitions = [enter];
    panelTransitions.set(tabs, transitions);
    if (outgoing) {
      const exit = outgoing.animate(
        [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(-8px) scale(.99)" }],
        { duration: 180, easing: "cubic-bezier(.44,0,.56,1)", fill: "both" },
      );
      transitions.push(exit);
      exit.finished.then(() => {
        if (panelTransitions.get(tabs) !== transitions) return;
        outgoing.hidden = true;
        exit.cancel();
      }).catch(() => undefined);
    }
    enter.finished.then(() => {
      if (panelTransitions.get(tabs) !== transitions) return;
      panels.forEach((panel) => { panel.hidden = panel !== incoming; });
      delete incoming.dataset.motionState;
      panelTransitions.delete(tabs);
      enter.cancel();
    }).catch(() => undefined);
  });

  tab.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const tabs = [...(tab.closest("[data-tabs]")?.querySelectorAll<HTMLButtonElement>("[role='tab']") ?? [])];
    const current = tabs.indexOf(tab);
    const next = event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1
      : (current + (["ArrowDown", "ArrowRight"].includes(event.key) ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next]?.focus();
    tabs[next]?.click();
  });
});

// The source account preview reveals the bottom of its tall form after its
// third one-second appear state. Align by the measured overflow so the motion
// also works when the preview changes size at a breakpoint.
on<HTMLElement>(".workflow-tabs .signup-panel", (panel) => {
  const stage = panel.querySelector<HTMLElement>(".workflow-preview-stage");
  const card = stage?.querySelector<HTMLElement>(".auth-card");
  const tab = document.getElementById(panel.getAttribute("aria-labelledby") ?? "");
  if (!stage || !card || !tab) return;

  let active = false;
  let timer = 0;
  panel.dataset.signupStage = "top";

  const measureOverflow = () => {
    const overflow = Math.max(0, card.getBoundingClientRect().height - stage.getBoundingClientRect().height);
    panel.style.setProperty("--signup-overflow", `${overflow}px`);
  };
  const reset = () => {
    window.clearTimeout(timer);
    // An interrupted or reversed tab should show the beginning immediately.
    card.style.transition = "none";
    panel.dataset.signupStage = "top";
    void card.offsetHeight;
    card.style.removeProperty("transition");
    active = false;
  };
  const sync = () => {
    const shouldPlay = !panel.hidden && tab.getAttribute("aria-selected") === "true"
      && window.innerWidth >= 810 && !prefersReducedMotion();
    if (!shouldPlay) {
      if (active) reset();
      return;
    }
    if (active) {
      if (panel.dataset.signupStage === "bottom") measureOverflow();
      return;
    }
    active = true;
    measureOverflow();
    timer = window.setTimeout(() => {
      if (!active) return;
      measureOverflow();
      panel.dataset.signupStage = "bottom";
    }, 3000);
  };

  const selection = new MutationObserver(sync);
  selection.observe(tab, { attributes: true, attributeFilter: ["aria-selected"] });
  selection.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
  const size = new ResizeObserver(() => {
    if (panel.dataset.signupStage === "bottom") measureOverflow();
  });
  size.observe(stage);
  size.observe(card);
  window.addEventListener("resize", sync, { passive: true });
  reducedMotionQuery.addEventListener("change", sync);
  sync();
  window.addEventListener("pagehide", () => {
    reset();
    selection.disconnect();
    size.disconnect();
    window.removeEventListener("resize", sync);
    reducedMotionQuery.removeEventListener("change", sync);
  }, { once: true });
});

on<HTMLElement>("[data-scroll-sections]", (root) => {
  const links = [...root.querySelectorAll<HTMLAnchorElement>("[data-scroll-link]")];
  const sections = [...root.querySelectorAll<HTMLElement>("[data-scroll-section]")];
  if (!links.length || !sections.length) return;

  const setActive = (id: string | null) => {
    links.forEach((link) => {
      const active = id !== null && link.hash === `#${id}`;
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };

  const sectionForHash = (hash: string) => {
    if (!hash.startsWith("#")) return null;
    const id = decodeURIComponent(hash.slice(1));
    return sections.find((section) => section.id === id) ?? null;
  };

  const scrollToSection = (section: HTMLElement) => {
    if (smoothScroll) smoothScroll.scrollTo(section);
    else section.scrollIntoView({ behavior: "auto", block: "start", inline: "nearest" });
    setActive(section.id);
  };

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      const section = sectionForHash(link.hash);
      if (!section) return;
      event.preventDefault();
      if (window.location.hash !== link.hash) {
        window.history.pushState({}, "", `${window.location.pathname}${window.location.search}${link.hash}`);
      }
      scrollToSection(section);
    });
  });

  window.addEventListener("hashchange", () => {
    const section = sectionForHash(window.location.hash);
    if (section) scrollToSection(section);
  });

  let scrollFrame = 0;
  const updateScrollSpy = () => {
    scrollFrame = 0;
    const activationLine = window.innerHeight * 0.6;
    let current: HTMLElement | null = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= activationLine) current = section;
    }
    setActive(current ? current.id : null);
  };

  window.addEventListener("scroll", () => {
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(updateScrollSpy);
  }, { passive: true });

  const initialSection = sectionForHash(window.location.hash);
  if (initialSection) window.requestAnimationFrame(() => scrollToSection(initialSection));
});

type AnimatedDetails = HTMLDetailsElement & { detailsAnimation?: Animation; detailsTargetOpen?: boolean };
const animateDetails = (details: AnimatedDetails, open: boolean) => {
  const summary = details.querySelector<HTMLElement>("summary");
  if (!summary) return;
  const startHeight = details.getBoundingClientRect().height;
  details.detailsAnimation?.cancel();
  details.detailsTargetOpen = open;
  if (prefersReducedMotion()) {
    details.open = open;
    details.detailsTargetOpen = undefined;
    return;
  }

  details.dataset.animating = "true";
  if (open) details.open = true;
  const endHeight = open ? details.scrollHeight : summary.getBoundingClientRect().height;
  const animation = details.animate(
    { height: [`${startHeight}px`, `${endHeight}px`] },
    { duration: 400, easing: "cubic-bezier(.44,0,.56,1)" },
  );
  details.detailsAnimation = animation;
  animation.finished.then(() => {
    if (details.detailsAnimation !== animation) return;
    details.open = open;
    delete details.dataset.animating;
    details.detailsAnimation = undefined;
    details.detailsTargetOpen = undefined;
    animation.cancel();
  }).catch(() => undefined);
};

on<HTMLDetailsElement>("details[data-accordion]", (details) => {
  details.querySelector("summary")?.addEventListener("click", (event) => {
    event.preventDefault();
    const animatedDetails = details as AnimatedDetails;
    const opening = !(animatedDetails.detailsTargetOpen ?? details.open);
    if (opening) {
      const group = details.closest("[data-accordion-group]");
      group?.querySelectorAll<AnimatedDetails>("details[data-accordion][open]").forEach((item) => {
        if (item !== details) animateDetails(item, false);
      });
    }
    animateDetails(details, opening);
  });
});

on<HTMLButtonElement>("[data-billing-toggle]", (toggle) => {
  toggle.addEventListener("click", () => {
    const yearly = toggle.dataset.billingToggle === "yearly";
    document.querySelectorAll<HTMLButtonElement>("[data-billing-toggle]").forEach((button) => {
      button.classList.toggle("active", button === toggle);
      button.setAttribute("aria-pressed", String(button === toggle));
    });
    document.querySelectorAll<HTMLElement>("[data-monthly-price]").forEach((price) => {
      price.textContent = yearly ? (price.dataset.yearlyPrice ?? "") : (price.dataset.monthlyPrice ?? "");
      price.toggleAttribute("data-price-animating", true);
      window.setTimeout(() => price.removeAttribute("data-price-animating"), 420);
    });
    document.querySelectorAll<HTMLElement>("[data-billing-period]").forEach((period) => {
      period.textContent = yearly ? "/year" : "/month";
    });
  });
});

on<HTMLElement>("[data-carousel]", (carouselRoot) => {
  const track = carouselRoot.querySelector<HTMLElement>("[data-carousel-track]");
  if (!track) return;
  const previous = carouselRoot.querySelector<HTMLButtonElement>("[data-carousel-button='previous']");
  const next = carouselRoot.querySelector<HTMLButtonElement>("[data-carousel-button='next']");
  const items = [...track.querySelectorAll<HTMLElement>("[data-carousel-item]")];
  let dragging = false;
  let startX = 0;
  let startScroll = 0;

  const updateCarousel = () => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    previous?.toggleAttribute("disabled", track.scrollLeft <= 2);
    next?.toggleAttribute("disabled", track.scrollLeft >= max - 2);
    items.forEach((item) => {
      const outsideViewport = item.offsetLeft + item.offsetWidth < track.scrollLeft
        || item.offsetLeft > track.scrollLeft + track.clientWidth;
      item.setAttribute("aria-hidden", String(outsideViewport));
    });
  };

  // Framer's carousel derives the number of pages from the content and viewport,
  // then distributes the full scroll range evenly between those pages.
  const scrollPage = (direction: -1 | 1) => {
    const max = Math.max(0, track.scrollWidth - track.clientWidth);
    if (max === 0 || items.length === 0) return;
    let pageCount = Math.ceil(track.scrollWidth / track.clientWidth);
    if (pageCount / items.length > 0.65) pageCount = items.length;
    pageCount = Math.max(2, pageCount);
    const currentSegment = max / pageCount;
    const currentPage = Math.min(pageCount - 1, Math.floor(track.scrollLeft / currentSegment));
    const targetPage = Math.min(pageCount - 1, Math.max(0, currentPage + direction));
    const target = targetPage * (max / (pageCount - 1));
    track.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  carouselRoot.querySelectorAll<HTMLButtonElement>("[data-carousel-button]").forEach((button) => {
    button.addEventListener("click", () => {
      scrollPage(button.dataset.carouselButton === "next" ? 1 : -1);
    });
  });
  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollPage(event.key === "ArrowRight" ? 1 : -1);
  });
  track.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    startX = event.clientX;
    startScroll = track.scrollLeft;
    track.classList.add("dragging");
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener("pointermove", (event) => {
    if (!dragging) return;
    track.scrollLeft = startScroll - (event.clientX - startX);
  });
  const stopDrag = (event: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    track.classList.remove("dragging");
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  };
  track.addEventListener("pointerup", stopDrag);
  track.addEventListener("pointercancel", stopDrag);
  track.addEventListener("scroll", updateCarousel, { passive: true });
  window.addEventListener("resize", updateCarousel, { passive: true });
  updateCarousel();
});

type MotionHost = HTMLElement & { motionTimers?: number[] };
const stopMotionSequence = (host: MotionHost) => {
  host.motionTimers?.forEach((timer) => window.clearTimeout(timer));
  host.motionTimers = [];
  host.dataset.motionStep = "0";
  host.removeAttribute("data-motion-running");
};

const startMotionSequence = (host: MotionHost) => {
  if (prefersReducedMotion() || window.innerWidth < 1200 || host.dataset.motionPaused === "true") return;
  stopMotionSequence(host);
  const delays = (host.dataset.motionDelays ?? "500").split(",").map(Number).filter(Number.isFinite);
  host.dataset.motionRunning = "true";
  host.dataset.motionStep = "1";
  let elapsed = 0;
  host.motionTimers = delays.map((delay, index) => {
    elapsed += delay;
    return window.setTimeout(() => { host.dataset.motionStep = String(index + 2); }, elapsed);
  });
};

on<MotionHost>("[data-motion-sequence]", (host) => {
  const pointerTrigger = host.closest<HTMLElement>("[data-motion-card]") ?? host;
  pointerTrigger.addEventListener("pointerenter", () => startMotionSequence(host));
  pointerTrigger.addEventListener("pointerleave", () => {
    if (!host.matches(":focus-within")) stopMotionSequence(host);
  });
  host.addEventListener("focusin", () => startMotionSequence(host));
  host.addEventListener("focusout", (event) => {
    if (!host.contains(event.relatedTarget as Node | null)) stopMotionSequence(host);
  });
  window.addEventListener("resize", () => {
    if (window.innerWidth < 1200) stopMotionSequence(host);
  }, { passive: true });
});

on<HTMLElement>("[data-control-scene]", (scene) => {
  const visual = scene.querySelector<HTMLElement>("[data-control-visual]");
  const toggle = scene.querySelector<HTMLButtonElement>("[data-control-notification-toggle]");
  const panel = scene.querySelector<HTMLElement>("[data-control-notifications]");
  if (!visual || !toggle || !panel) return;

  const setNotificationsOpen = (open: boolean) => {
    visual.dataset.notificationOpen = String(open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close notifications" : "Open notifications");
    panel.setAttribute("aria-hidden", String(!open));
  };

  const syncControlMode = () => {
    const desktop = window.innerWidth >= 1200;
    toggle.disabled = !desktop;
    toggle.setAttribute("aria-hidden", String(!desktop));
    if (!desktop) {
      visual.dataset.controlVisible = "true";
      setNotificationsOpen(false);
    }
  };

  toggle.addEventListener("click", () => {
    if (toggle.disabled) return;
    setNotificationsOpen(visual.dataset.notificationOpen !== "true");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setNotificationsOpen(false);
  });
  document.addEventListener("pointerdown", (event) => {
    if (visual.dataset.notificationOpen !== "true") return;
    if (!(event.target as Element).closest("[data-control-visual]")) setNotificationsOpen(false);
  });

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    visual.dataset.controlVisible = "true";
  } else {
    const controlObserver = new IntersectionObserver(([entry]) => {
      visual.dataset.controlVisible = String(entry?.isIntersecting && entry.intersectionRatio >= .5);
    }, { threshold: [.5] });
    controlObserver.observe(visual);
  }

  window.addEventListener("resize", syncControlMode, { passive: true });
  syncControlMode();
});

// Workflow 04 has its own six one-second appear states. It is not the
// feature card's hover sequence; compact breakpoints use the source static stack.
on<HTMLElement>('[data-workflow-analytics]', (scene) => {
  let visible = false;
  let timer = 0;
  const reset = () => {
    window.clearTimeout(timer);
    scene.dataset.workflowStep = '0';
  };
  const sync = () => {
    reset();
    if (!visible || window.innerWidth < 1200 || prefersReducedMotion()) return;
    const advance = () => {
      const step = Number(scene.dataset.workflowStep ?? 0) + 1;
      scene.dataset.workflowStep = String(step);
      if (step < 6) timer = window.setTimeout(advance, 1000);
    };
    timer = window.setTimeout(advance, 1000);
  };
  const observer = new IntersectionObserver(([entry]) => {
    const nextVisible = entry.isIntersecting;
    if (nextVisible === visible) return;
    visible = nextVisible;
    sync();
  });
  observer.observe(scene);
  window.addEventListener('resize', sync, { passive:true });
  reducedMotionQuery.addEventListener('change', sync);
  window.addEventListener('pagehide', () => { reset(); observer.disconnect(); }, { once:true });
});

const hero = document.querySelector<HTMLElement>("[data-hero]");
if (hero) {
  const heroDashboard = hero.querySelector<HTMLElement>("[data-hero-dashboard]");
  let lastScrollY = window.scrollY;
  let heroTicking = false;
  const heroBreakpoint = () => window.innerWidth < 810 ? "Phone" : window.innerWidth < 1200 ? "Tablet" : "Desktop";
  const updateHeroVariant = () => {
    const delta = window.scrollY - lastScrollY;
    const current = hero.dataset.motionVariant?.endsWith("On Scroll") ?? false;
    const rect = heroDashboard?.getBoundingClientRect();
    const visibleHeight = rect ? Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0)) : 0;
    const meetsSourceThreshold = rect ? visibleHeight / rect.height >= .5 : false;
    const scrolled = window.scrollY > 0 && meetsSourceThreshold && (delta > 0 || (current && delta === 0));
    hero.dataset.motionVariant = `${heroBreakpoint()}${scrolled ? "/On Scroll" : ""}`;
    lastScrollY = window.scrollY;
    heroTicking = false;
  };
  window.addEventListener("scroll", () => {
    if (heroTicking) return;
    heroTicking = true;
    requestAnimationFrame(updateHeroVariant);
  }, { passive: true });
  window.addEventListener("resize", updateHeroVariant, { passive: true });
  updateHeroVariant();
}

const animateCounter = (element: HTMLElement) => {
  if (element.dataset.counted === "true") return;
  element.dataset.counted = "true";
  const target = Number(element.dataset.countValue ?? 0);
  const decimals = Number(element.dataset.countDecimals ?? (Number.isInteger(target) ? 0 : 2));
  const prefix = element.dataset.countPrefix ?? "";
  const suffix = element.dataset.countSuffix ?? "";
  const useGrouping = element.dataset.countGrouping !== "false";
  if (prefersReducedMotion()) {
    element.textContent = `${prefix}${target.toLocaleString("en-US", { useGrouping, minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    return;
  }
  const start = performance.now();
  const duration = 1000;
  const tick = (now: number) => {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = target * eased;
    element.textContent = `${prefix}${value.toLocaleString("en-US", { useGrouping, minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

if ("IntersectionObserver" in window) {
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      animateCounter(entry.target as HTMLElement);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: .45 });
  on<HTMLElement>("[data-count-value]", (element) => counterObserver.observe(element));

  const motionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const host = entry.target as MotionHost;
      const focused = host.matches(":focus-within");
      const paused = !entry.isIntersecting && !focused;
      host.dataset.motionPaused = String(paused);
      if (paused) stopMotionSequence(host);
      else if (focused && host.dataset.motionRunning !== "true") startMotionSequence(host);
    });
  }, { rootMargin: "120px", threshold: 0 });
  on<MotionHost>("[data-motion-sequence]", (host) => motionObserver.observe(host));
} else {
  on<HTMLElement>("[data-count-value]", animateCounter);
}

if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
  on<HTMLElement>("[data-reveal]", (element) => element.classList.add("revealed"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4%" },
  );
  const revealElements = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
  revealElements.forEach((element, index) => {
    const parentGrid = element.closest(".feature-grid, .why-grid, .testimonial-grid, .team-grid, .pricing-grid, .blog-grid, .addon-list");
    if (parentGrid) element.style.transitionDelay = `${Math.min(index % 6, 5) * 55}ms`;
    observer.observe(element);
  });
}
