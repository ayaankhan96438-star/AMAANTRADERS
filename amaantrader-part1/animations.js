/* ===== PART 1 =====
 * AMAANTRADER — small vanilla-DOM motion foundation.
 * Vite/npm entry: npm install motion@14.10.0 lenis@1.3.27
 * This module does not read or modify cart, wishlist, search, filters or catalogue state.
 */

import { animate, inView, stagger, frame, cancelFrame } from "motion";
import Lenis from "lenis";

const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealEase = "cubic-bezier(0.22, 1, 0.36, 1)";

const REVEAL_SELECTORS = [
  // Homepage/editorial sections. The hero remains immediately visible.
  "main > section:not(.hero):not(.hero-section):not(.ticker-bar):not([data-no-reveal])",
  // Product detail layout and its supporting sections.
  "main .product-layout > .product-gallery",
  "main .product-layout > .product-info",
  "main .product-detail-sections > section",
  "main .related-products",
  // Policy pages.
  "main .policy-section"
].join(",");

const NESTED_SCROLL_SELECTORS = [
  "#filterSidebar",
  "#cartDrawer",
  "#wishlistModal",
  "#quickView",
  "#checkoutModal",
  "#accountModal",
  "#productZoomBackdrop .zoom-dialog",
  "#imageZoomBackdrop .zoom-modal",
  ".cart-items",
  ".search-suggestions",
  ".filter-sidebar",
  ".wishlist-modal",
  ".quick-view-modal",
  ".small-modal",
  ".zoom-modal",
  ".product-3d-modal"
].join(",");

const activeAnimations = new Set();
const revealCleanups = new Set();

let lenis = null;
let lenisFrameCallback = null;
let bodyClassObserver = null;
let pageMutationObserver = null;
let revealScanQueued = false;
let started = false;
let pageIsActive = true;

function clearMotionStyles(element) {
  if (!element) return;
  element.style.opacity = "";
  element.style.transform = "";
  element.style.willChange = "";
  delete element.dataset.motionRevealReady;
}

function revealImmediately(element) {
  clearMotionStyles(element);
  element.dataset.motionRevealDone = "true";
}

/*
 * inView() is backed by IntersectionObserver. Each section is observed once,
 * then Motion changes only opacity and transform (not layout dimensions).
 */
function prepareReveal(element) {
  if (!element || !element.isConnected) return;
  if (element.dataset.motionRevealReady === "true" || element.dataset.motionRevealDone === "true") return;
  if (element.closest("[hidden]")) return;
  if (element.getClientRects().length === 0) return;

  if (reducedMotionQuery.matches) {
    revealImmediately(element);
    return;
  }

  element.dataset.motionRevealReady = "true";
  element.style.opacity = "0";
  element.style.transform = "translate3d(0, 22px, 0)";
  element.style.willChange = "transform, opacity";

  try {
    const stopObserving = inView(
      element,
      (enteredElement) => {
        if (reducedMotionQuery.matches) {
          revealImmediately(enteredElement);
          return;
        }

        let controls;
        controls = animate(
          enteredElement,
          {
            opacity: [0, 1],
            transform: ["translate3d(0, 22px, 0)", "translate3d(0, 0, 0)"]
          },
          {
            duration: window.matchMedia("(max-width: 640px)").matches ? 0.55 : 0.7,
            ease: revealEase,
            onComplete: () => {
              clearMotionStyles(enteredElement);
              enteredElement.dataset.motionRevealDone = "true";
              activeAnimations.delete(controls);
            }
          }
        );

        activeAnimations.add(controls);
      },
      { amount: 0.12, margin: "0px 0px -4% 0px" }
    );

    revealCleanups.add(stopObserving);
  } catch (error) {
    console.warn("AmaanTrader reveal skipped; content remains visible:", error);
    revealImmediately(element);
  }
}


/* Free splitText fallback for the vanilla homepage. Motion+ splitText() is paid.
 * If a React root is present, leave its DOM ownership alone and skip this optional effect.
 */
function splitTextManually(element) {
  const accessibleText = (element.innerText || element.textContent || "")
    .replace(/\s+/gu, " ")
    .trim();
  if (!accessibleText) return [];

  const existingCharacters = Array.from(element.querySelectorAll(".motion-manual-char"));
  if (existingCharacters.length) {
    element.setAttribute("aria-label", accessibleText);
    return existingCharacters;
  }
  if (element.dataset.motionTextSplit === "true") return [];

  element.setAttribute("aria-label", accessibleText);
  element.dataset.motionTextSplit = "true";

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim()) textNodes.push(node);
  }

  const characters = [];
  textNodes.forEach((textNode) => {
    const pieces = textNode.nodeValue.match(/\s+|[^\s]+/gu) || [];
    const fragment = document.createDocumentFragment();

    pieces.forEach((piece) => {
      if (/^\s+$/u.test(piece)) {
        fragment.appendChild(document.createTextNode(piece));
        return;
      }

      const word = document.createElement("span");
      word.className = "motion-manual-word";
      word.setAttribute("aria-hidden", "true");
      word.style.display = "inline-block";
      word.style.whiteSpace = "nowrap";

      Array.from(piece).forEach((character) => {
        const span = document.createElement("span");
        span.className = "motion-manual-char";
        span.textContent = character;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(0.65em)";
        span.style.willChange = "transform, opacity";
        word.appendChild(span);
        characters.push(span);
      });
      fragment.appendChild(word);
    });
    textNode.parentNode.replaceChild(fragment, textNode);
  });
  return characters;
}

async function animateHeroHeadline() {
  const headline = document.querySelector("#heroTitle");
  // Don't rewrite React-owned text nodes. This optional split is for the vanilla page.
  if (!headline || document.getElementById("root") || reducedMotionQuery.matches) return;

  try {
    if (document.fonts?.ready) await document.fonts.ready;
    if (reducedMotionQuery.matches || !headline.isConnected) return;

    const characters = splitTextManually(headline);
    if (!characters.length) return;

    let controls;
    controls = animate(
      characters,
      {
        opacity: [0, 1],
        transform: ["translateY(0.65em)", "translateY(0em)"]
      },
      {
        duration: 0.52,
        delay: stagger(0.022, { startDelay: 0.08 }),
        ease: revealEase,
        onComplete: () => {
          characters.forEach((character) => {
            character.style.opacity = "";
            character.style.transform = "";
            character.style.willChange = "";
          });
          activeAnimations.delete(controls);
        }
      }
    );
    activeAnimations.add(controls);
  } catch (error) {
    console.warn("AmaanTrader headline animation skipped:", error);
    headline.querySelectorAll(".motion-manual-char").forEach(clearMotionStyles);
  }
}

function clearHeadlineStyles() {
  document.querySelectorAll(".motion-manual-char").forEach((character) => {
    character.style.opacity = "";
    character.style.transform = "";
    character.style.willChange = "";
  });
}

function scanRevealTargets() {
  if (reducedMotionQuery.matches || !pageIsActive) return;
  document.querySelectorAll(REVEAL_SELECTORS).forEach(prepareReveal);
}

function queueRevealScan() {
  if (revealScanQueued || reducedMotionQuery.matches || !pageIsActive) return;
  revealScanQueued = true;
  requestAnimationFrame(() => {
    revealScanQueued = false;
    scanRevealTargets();
  });
}

/*
 * Lenis runs inside Motion's setup phase so scroll position is updated before
 * Motion reads it. syncTouch:false intentionally keeps native mobile touch scroll.
 */
function setupSmoothScroll() {
  if (reducedMotionQuery.matches || lenis) return;

  try {
    lenis = new Lenis({
      autoRaf: false,
      anchors: false,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.09
    });

    lenisFrameCallback = ({ timestamp }) => {
      if (lenis) lenis.raf(timestamp);
    };
    frame.setup(lenisFrameCallback, true);

    const syncBodyScrollLock = () => {
      if (!lenis) return;
      if (document.body.classList.contains("no-scroll")) lenis.stop();
      else lenis.start();
    };

    bodyClassObserver = new MutationObserver(syncBodyScrollLock);
    bodyClassObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncBodyScrollLock();
  } catch (error) {
    console.warn("Lenis unavailable; native scrolling remains active:", error);
    stopSmoothScroll();
  }
}

function stopSmoothScroll() {
  if (bodyClassObserver) {
    bodyClassObserver.disconnect();
    bodyClassObserver = null;
  }
  if (lenisFrameCallback) {
    cancelFrame(lenisFrameCallback);
    lenisFrameCallback = null;
  }
  if (lenis) {
    lenis.destroy();
    lenis = null;
  }
}

function markNestedScrollAreas() {
  document.querySelectorAll(NESTED_SCROLL_SELECTORS).forEach((element) => {
    element.setAttribute("data-lenis-prevent", "");
  });
}

function observeDynamicSections() {
  if (pageMutationObserver) pageMutationObserver.disconnect();

  pageMutationObserver = new MutationObserver((mutations) => {
    const needsScan = mutations.some((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "hidden") return true;
      return mutation.type === "childList" && mutation.addedNodes.length > 0;
    });
    if (needsScan) queueRevealScan();
  });

  pageMutationObserver.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["hidden"]
  });
}

function stopReveals(clearStyles = true) {
  if (pageMutationObserver) {
    pageMutationObserver.disconnect();
    pageMutationObserver = null;
  }

  revealCleanups.forEach((cleanup) => {
    try { cleanup(); } catch { /* cleanup during page lifecycle */ }
  });
  revealCleanups.clear();

  activeAnimations.forEach((controls) => controls.stop());
  activeAnimations.clear();

  if (clearStyles) {
    document.querySelectorAll("[data-motion-reveal-ready='true']").forEach((element) => {
      clearMotionStyles(element);
      delete element.dataset.motionRevealDone;
    });
  }
}

function startPartOne() {
  if (started || !pageIsActive || reducedMotionQuery.matches) return;
  started = true;
  markNestedScrollAreas();
  setupSmoothScroll();
  scanRevealTargets();
  animateHeroHeadline();
  observeDynamicSections();
}

function stopPartOne() {
  started = false;
  stopReveals(true);
  clearHeadlineStyles();
  stopSmoothScroll();
}

function handleReducedMotionChange(event) {
  if (event.matches) stopPartOne();
  else startPartOne();
}

if (reducedMotionQuery.addEventListener) {
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
} else if (reducedMotionQuery.addListener) {
  reducedMotionQuery.addListener(handleReducedMotionChange);
}

function initialise() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPartOne, { once: true });
  } else {
    startPartOne();
  }
}

window.addEventListener("pagehide", () => {
  pageIsActive = false;
  stopPartOne();
}, { once: false });

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    pageIsActive = true;
    startPartOne();
  }
});

initialise();

/* ===== END PART 1 ===== */
