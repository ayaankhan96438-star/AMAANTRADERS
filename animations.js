/* ===== PART 1 =====
 * AMAANTRADER vanilla-JS motion layer.
 * Uses Motion's free JavaScript API + Lenis from pinned ES-module CDN URLs.
 * This file is intentionally independent from cart, wishlist, filters and product logic.
 */

import {
  animate,
  inView,
  stagger,
  cubicBezier,
  frame,
  cancelFrame
} from "https://cdn.jsdelivr.net/npm/motion@14.9.0/+esm";

import Lenis from "https://cdn.jsdelivr.net/npm/lenis@1.3.27/+esm";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const luxuryEase = cubicBezier(0.22, 1, 0.36, 1);
const activeAnimations = new Set();
const cleanupTasks = [];

let lenis = null;
let lenisFrame = null;
let bodyClassObserver = null;
let pageMutationObserver = null;
let revealScanQueued = false;
let hasReducedMotion = reduceMotion.matches;

const REVEAL_SELECTORS = [
  "main > section:not(.hero)",
  "main > .product-layout > .product-gallery",
  "main > .product-layout > .product-info",
  "main .product-detail-sections > section",
  "main .related-products",
  "main .policy-section"
].join(",");

const NESTED_SCROLL_SELECTORS = [
  "#filterSidebar",
  "#cartDrawer",
  "#wishlistModal",
  "#quickView",
  "#checkoutModal",
  "#accountModal",
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

function clearMotionStyles(element) {
  if (!element) return;
  element.style.opacity = "";
  element.style.transform = "";
  element.style.willChange = "";
}

function revealImmediately(element) {
  clearMotionStyles(element);
  element.dataset.motionRevealDone = "true";
}

/*
 * Motion's inView() is IntersectionObserver-based and fires once by default.
 * Each section starts in a hidden visual state only after this module has loaded,
 * so if the CDN is unavailable the original page remains fully visible.
 */
function prepareReveal(element) {
  if (!element || element.dataset.motionRevealReady === "true") return;
  if (element.closest("[hidden]")) return;
  if (!element.isConnected || element.getClientRects().length === 0) return;

  if (hasReducedMotion) {
    revealImmediately(element);
    return;
  }

  element.dataset.motionRevealReady = "true";
  element.style.opacity = "0";
  element.style.transform = "translateY(24px)";
  element.style.willChange = "transform, opacity";

  try {
    const stopObserving = inView(
      element,
      (enteredElement) => {
        if (hasReducedMotion) {
          revealImmediately(enteredElement);
          return;
        }

        let controls;
        controls = animate(
          enteredElement,
          {
            opacity: [0, 1],
            transform: ["translateY(24px)", "translateY(0px)"]
          },
          {
            duration: window.matchMedia("(max-width: 640px)").matches ? 0.56 : 0.72,
            ease: luxuryEase,
            onComplete: () => {
              clearMotionStyles(enteredElement);
              activeAnimations.delete(controls);
            }
          }
        );

        activeAnimations.add(controls);
      },
      { amount: 0.12, margin: "0px 0px -4% 0px" }
    );

    cleanupTasks.push(stopObserving);
  } catch (error) {
    console.warn("AmaanTrader section reveal skipped:", error);
    revealImmediately(element);
  }
}

function scanRevealTargets() {
  if (hasReducedMotion) return;
  document.querySelectorAll(REVEAL_SELECTORS).forEach(prepareReveal);
}

function queueRevealScan() {
  if (revealScanQueued) return;
  revealScanQueued = true;
  requestAnimationFrame(() => {
    revealScanQueued = false;
    scanRevealTargets();
  });
}

/*
 * Motion+ splitText() is paid. This free fallback wraps existing text nodes
 * in word/character spans, preserving <em>, <br>, whitespace and screen-reader text.
 */
function splitTextManually(element) {
  const accessibleText = (element.innerText || element.textContent || "")
    .replace(/\s+/gu, " ")
    .trim();

  if (!accessibleText || element.dataset.motionTextSplit === "true") return [];

  element.setAttribute("aria-label", accessibleText);
  element.dataset.motionTextSplit = "true";

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
  const textNodes = [];
  let currentNode;

  while ((currentNode = walker.nextNode())) {
    if (currentNode.nodeValue && currentNode.nodeValue.trim()) {
      textNodes.push(currentNode);
    }
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
        const characterSpan = document.createElement("span");
        characterSpan.className = "motion-manual-char";
        characterSpan.textContent = character;
        characterSpan.style.display = "inline-block";
        characterSpan.style.opacity = "0";
        characterSpan.style.transform = "translateY(0.65em)";
        characterSpan.style.willChange = "transform, opacity";
        word.appendChild(characterSpan);
        characters.push(characterSpan);
      });

      fragment.appendChild(word);
    });

    textNode.parentNode.replaceChild(fragment, textNode);
  });

  return characters;
}

async function animateHeroHeadline() {
  const headline = document.querySelector("#heroTitle");
  if (!headline || hasReducedMotion) return;

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    if (hasReducedMotion || !headline.isConnected) return;

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
        ease: luxuryEase,
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
    console.warn("AmaanTrader hero text animation skipped:", error);
    headline.querySelectorAll(".motion-manual-char").forEach(clearMotionStyles);
  }
}

/*
 * Lenis is driven by Motion's frame.setup() so its scroll position is written
 * before Motion's read phase. Touch scrolling stays native on mobile.
 */
function setupSmoothScroll() {
  if (hasReducedMotion) return;

  try {
    lenis = new Lenis({
      autoRaf: false,
      anchors: true,
      smoothWheel: true,
      syncTouch: false,
      lerp: 0.09
    });

    lenisFrame = ({ timestamp }) => lenis && lenis.raf(timestamp);
    frame.setup(lenisFrame, true);

    // Preserve the store's existing modal/body scroll-lock behavior.
    const syncBodyScrollLock = () => {
      if (!lenis) return;
      if (document.body.classList.contains("no-scroll")) {
        lenis.stop();
      } else {
        lenis.start();
      }
    };

    bodyClassObserver = new MutationObserver(syncBodyScrollLock);
    bodyClassObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"]
    });
    syncBodyScrollLock();
  } catch (error) {
    console.warn("Lenis smooth scroll unavailable; native scrolling remains active:", error);
    if (lenisFrame) cancelFrame(lenisFrame);
    if (lenis) lenis.destroy();
    lenis = null;
    lenisFrame = null;
  }
}

function markNestedScrollAreas() {
  document.querySelectorAll(NESTED_SCROLL_SELECTORS).forEach((element) => {
    element.setAttribute("data-lenis-prevent", "");
  });
}

function handleReducedMotionChange(event) {
  hasReducedMotion = event.matches;
  if (!hasReducedMotion) return;

  activeAnimations.forEach((controls) => controls.stop());
  activeAnimations.clear();

  document.querySelectorAll(
    '[data-motion-reveal-ready="true"], .motion-manual-char'
  ).forEach(clearMotionStyles);

  if (bodyClassObserver) bodyClassObserver.disconnect();
  if (lenisFrame) cancelFrame(lenisFrame);
  if (lenis) lenis.destroy();
  lenis = null;
  lenisFrame = null;
}

function cleanupPartOne() {
  if (pageMutationObserver) pageMutationObserver.disconnect();
  if (bodyClassObserver) bodyClassObserver.disconnect();
  cleanupTasks.forEach((cleanup) => {
    try { cleanup(); } catch { /* no-op during page teardown */ }
  });
  activeAnimations.forEach((controls) => controls.stop());
  activeAnimations.clear();
  if (lenisFrame) cancelFrame(lenisFrame);
  if (lenis) lenis.destroy();
  lenis = null;
  lenisFrame = null;
}

function initPartOne() {
  if (hasReducedMotion) return;

  markNestedScrollAreas();
  setupSmoothScroll();
  scanRevealTargets();
  animateHeroHeadline();

  // Product pages reveal #productContent only after product.js finishes fetching.
  // Watch only DOM/hidden changes; never rewrite or bind the store's shopping controls.
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

if (reduceMotion.addEventListener) {
  reduceMotion.addEventListener("change", handleReducedMotionChange);
} else if (reduceMotion.addListener) {
  reduceMotion.addListener(handleReducedMotionChange);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initPartOne, { once: true });
} else {
  initPartOne();
}

window.addEventListener("pagehide", cleanupPartOne, { once: true });

/* ===== END PART 1 ===== */
