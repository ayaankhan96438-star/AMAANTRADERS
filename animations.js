/* ===== PART 1 =====
 * AMAANTRADER — small vanilla-DOM motion foundation.
 * Vite/npm entry: npm install motion@14.9.0 lenis@1.3.27
 * This module does not read or modify cart, wishlist, search, filters or catalogue state.
 */

import { animate } from "motion/mini";
import { inView, stagger, frame, cancelFrame } from "motion";
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

/* ===== PART 3 =====
 * AMAANTRADER — vanilla Motion interactions for the React/Vite storefront.
 * Part 1 stays untouched. Part 2's existing React effects stay untouched.
 * Uses the React store's at_cart / at_admin_products keys; does not mutate store data.
 */
import { animate as part3Animate, animateLayout as part3AnimateLayout, animateView as part3AnimateView, scroll as part3Scroll } from "motion";
import { flushSync as part3FlushSync } from "react-dom";
import part3Catalogue from "./src/data/products.json";

const part3ReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const part3ShowcaseCleanups = new Map();
let part3DomObserver = null;
let part3DomScanQueued = false;
let part3ReplayingRouteClick = false;
let part3CartLayer = null;
let part3CartTrigger = null;
let part3CartAnimations = [];
let part3CartGeneration = 0;
let part3BadgeObserver = null;
const part3BadgeValues = new WeakMap();

const part3Spring = { type: "spring", stiffness: 290, damping: 31 };

function part3SafeJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function part3Escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function part3ImageURL(value) {
  try {
    const url = new URL(String(value || ""), window.location.href);
    if (url.protocol === "http:" || url.protocol === "https:") return part3Escape(url.href);
  } catch { /* Invalid or missing photo: use the visual fallback. */ }
  return "";
}

function part3GetCartSnapshot() {
  const cart = part3SafeJSON("at_cart", []);
  const editedProducts = part3SafeJSON("at_admin_products", null);
  const products = Array.isArray(editedProducts)
    ? editedProducts
    : (Array.isArray(part3Catalogue) ? part3Catalogue : []);
  const lines = Array.isArray(cart) ? cart : [];
  const count = lines.reduce((sum, line) => sum + Math.max(0, Number(line.quantity) || 0), 0);
  const items = lines.map((line) => {
    const product = products.find((item) => Number(item.id) === Number(line.id));
    if (!product) return null;
    const quantity = Math.max(1, Number(line.quantity) || 1);
    const price = Number(product.sizePrices?.[line.size] ?? product.price) || 0;
    const image = product.colorImages?.[line.color] || product.image;
    return {
      name: product.name || "Jacket",
      category: product.category || "Outerwear",
      size: line.size || "—",
      color: line.color || "—",
      quantity,
      price,
      lineTotal: price * quantity,
      image: part3ImageURL(image)
    };
  }).filter(Boolean);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return { count, items, subtotal };
}

function part3RenderCartDrawer() {
  const snapshot = part3GetCartSnapshot();
  const rows = snapshot.items.map((item, index) => `
    <article class="at-part3-cart-item">
      <div class="at-part3-cart-image">
        ${item.image ? `<img src="${item.image}" alt="${part3Escape(item.name)}" loading="lazy">` : "<span>AT</span>"}
      </div>
      <div class="at-part3-cart-copy">
        <span class="at-part3-cart-kicker">0${index + 1} / ${part3Escape(item.category)}</span>
        <strong>${part3Escape(item.name)}</strong>
        <small>${part3Escape(item.color)} · Size ${part3Escape(item.size)} · Qty ${item.quantity}</small>
      </div>
      <b>${part3Escape(new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.lineTotal))}</b>
    </article>
  `).join("");
  const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
  const body = snapshot.items.length
    ? `<div class="at-part3-cart-items" data-lenis-prevent>${rows}</div>
       <div class="at-part3-cart-summary"><span>Subtotal <b>${money.format(snapshot.subtotal)}</b></span><small>Shipping and final totals are confirmed in checkout.</small></div>
       <div class="at-part3-cart-actions">
         <a href="#/cart" class="at-part3-cart-secondary">View full bag <span aria-hidden="true">↗</span></a>
         <a href="#/checkout" class="at-part3-cart-primary">Continue to checkout <span aria-hidden="true">↗</span></a>
       </div>`
    : `<div class="at-part3-cart-empty"><span class="at-part3-cart-empty-mark">AT</span><p>YOUR BAG IS TAKING A BREATHER</p><h3>A good layer is still out there.</h3><a href="#/shop" class="at-part3-cart-primary">Explore jackets <span aria-hidden="true">↗</span></a></div>`;

  if (!part3CartLayer) {
    part3CartLayer = document.createElement("div");
    part3CartLayer.id = "at-part3-cart-layer";
    part3CartLayer.className = "at-part3-cart-layer";
    part3CartLayer.hidden = true;
    part3CartLayer.setAttribute("aria-hidden", "true");
    part3CartLayer.innerHTML = `
      <button type="button" class="at-part3-cart-backdrop" data-at-cart-close aria-label="Close shopping bag"></button>
      <aside class="at-part3-cart-panel" role="dialog" aria-modal="true" aria-labelledby="atPart3CartTitle" tabindex="-1">
        <div class="at-part3-cart-head">
          <div><span class="at-part3-cart-eyebrow">AMAANTRADER / YOUR EDIT</span><h2 id="atPart3CartTitle">Your <em>bag.</em></h2><p class="at-part3-cart-count"></p></div>
          <button type="button" class="at-part3-cart-close" data-at-cart-close aria-label="Close shopping bag">×</button>
        </div>
        <div class="at-part3-cart-content"></div>
      </aside>`;
    document.body.appendChild(part3CartLayer);
    part3CartLayer.addEventListener("click", (event) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-at-cart-close]")) {
        event.preventDefault();
        void part3CloseCartDrawer();
      }
    });
  }

  part3CartLayer.querySelector(".at-part3-cart-count").textContent = `${snapshot.count} ${snapshot.count === 1 ? "PIECE" : "PIECES"} IN YOUR BAG`;
  part3CartLayer.querySelector(".at-part3-cart-content").innerHTML = body;
  return part3CartLayer;
}

function part3StopCartAnimations() {
  part3CartAnimations.forEach((controls) => {
    try { controls.stop(); } catch { /* An interrupted drawer animation is harmless. */ }
  });
  part3CartAnimations = [];
}

function part3LockScroll() {
  document.body.classList.add("no-scroll");
}

function part3UnlockScroll() {
  const anotherOverlayIsOpen = document.querySelector(
    ".modal-backdrop.is-open, .quick-view-backdrop.is-open, .mobile-scrim"
  );
  if (!anotherOverlayIsOpen) document.body.classList.remove("no-scroll");
}

function part3OpenCartDrawer(trigger) {
  const layer = part3RenderCartDrawer();
  part3CartTrigger = trigger || document.activeElement;
  part3CartGeneration += 1;
  part3StopCartAnimations();
  layer.hidden = false;
  layer.setAttribute("aria-hidden", "false");
  layer.classList.add("is-open");
  part3LockScroll();

  const backdrop = layer.querySelector(".at-part3-cart-backdrop");
  const panel = layer.querySelector(".at-part3-cart-panel");
  if (part3ReducedMotion.matches) {
    backdrop.style.opacity = "1";
    panel.style.opacity = "1";
    panel.style.transform = "translateX(0%)";
  } else {
    part3CartAnimations = [
      part3Animate(backdrop, { opacity: [0, 1] }, { duration: 0.2, ease: "easeOut" }),
      part3Animate(panel, { opacity: [0.9, 1], transform: ["translateX(100%)", "translateX(0%)"] }, part3Spring)
    ];
  }
  requestAnimationFrame(() => layer.querySelector(".at-part3-cart-close")?.focus());
}

async function part3CloseCartDrawer(options = {}) {
  if (!part3CartLayer || part3CartLayer.hidden) return;
  const layer = part3CartLayer;
  const generation = ++part3CartGeneration;
  part3StopCartAnimations();
  layer.classList.remove("is-open");
  layer.setAttribute("aria-hidden", "true");

  if (!options.immediate && !part3ReducedMotion.matches) {
    const backdrop = layer.querySelector(".at-part3-cart-backdrop");
    const panel = layer.querySelector(".at-part3-cart-panel");
    const backdropAnimation = part3Animate(backdrop, { opacity: [1, 0] }, { duration: 0.18, ease: "easeOut" });
    const panelAnimation = part3Animate(panel, { opacity: [1, 0.92], transform: ["translateX(0%)", "translateX(100%)"] }, part3Spring);
    part3CartAnimations = [backdropAnimation, panelAnimation];
    await Promise.all([backdropAnimation.finished, panelAnimation.finished].map((promise) => promise.catch(() => undefined)));
  }

  if (generation !== part3CartGeneration || layer !== part3CartLayer) return;
  layer.hidden = true;
  layer.classList.remove("is-open");
  layer.querySelector(".at-part3-cart-backdrop").style.opacity = "";
  layer.querySelector(".at-part3-cart-panel").style.opacity = "";
  layer.querySelector(".at-part3-cart-panel").style.transform = "";
  part3CartAnimations = [];
  part3UnlockScroll();

  if (options.restoreFocus !== false && part3CartTrigger instanceof HTMLElement && part3CartTrigger.isConnected) {
    part3CartTrigger.focus({ preventScroll: true });
  }
}

function part3RoutePath() {
  const route = (window.location.hash || "#/").slice(1).split("#")[0] || "/";
  try { return new URL(route, window.location.origin).pathname; }
  catch { return "/"; }
}

function part3DispatchRouterClick(anchor) {
  part3ReplayingRouteClick = true;
  window.__AT_PART3_VIEW_ACTIVE__ = typeof document.startViewTransition === "function";
  try {
    part3FlushSync(() => {
      anchor.dispatchEvent(new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window,
        button: 0
      }));
    });
  } finally {
    window.__AT_PART3_VIEW_ACTIVE__ = false;
    part3ReplayingRouteClick = false;
  }
}

function part3HandleRouteClick(event) {
  if (part3ReplayingRouteClick || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof Element)) return;
  const anchor = target.closest("a[href]");
  if (!anchor || anchor.hasAttribute("download") || (anchor.target && anchor.target !== "_self")) return;

  let url;
  try { url = new URL(anchor.href, window.location.href); }
  catch { return; }
  if (url.origin !== window.location.origin || !url.hash.startsWith("#/")) return;

  let destination;
  try { destination = new URL(url.hash.slice(1).split("#")[0], window.location.origin); }
  catch { return; }
  const nextPath = destination.pathname;
  const currentPath = part3RoutePath();

  const isBagTrigger = anchor.matches('.badge-anchor[aria-label="Shopping bag"], .mobile-bag');
  if (nextPath === "/cart" && isBagTrigger) {
    event.preventDefault();
    event.stopImmediatePropagation();
    part3OpenCartDrawer(anchor);
    return;
  }

  if (nextPath === currentPath) return;
  event.preventDefault();
  event.stopImmediatePropagation();

  let routeUpdated = false;
  const updateRoute = () => {
    if (routeUpdated) return;
    routeUpdated = true;
    if (part3CartLayer && !part3CartLayer.hidden && anchor.closest("#at-part3-cart-layer")) {
      void part3CloseCartDrawer({ immediate: true, restoreFocus: false });
    }
    part3DispatchRouterClick(anchor);
  };

  if (part3ReducedMotion.matches) {
    updateRoute();
    return;
  }

  try {
    const transition = part3AnimateView(updateRoute, { type: "spring", stiffness: 260, damping: 30 });
    transition.old({ opacity: 0 }, { duration: 0.18 });
    transition.new({ opacity: 1 }, { duration: 0.28 });
  } catch (error) {
    console.warn("AmaanTrader view transition fell back to the existing route transition:", error);
    updateRoute();
  }
}

function part3TagProductCards() {
  document.querySelectorAll(".shop-product-grid .shop-layout-item").forEach((card) => {
    if (!card.hasAttribute("data-layout")) card.setAttribute("data-layout", "");
  });
}

/* ShopPage calls this bridge around flushSync(setState), so Motion can measure
 * the old and new grid positions in the same synchronous layout update. */
window.__AT_PART3_LAYOUT__ = (commit) => {
  if (typeof commit !== "function") return;
  if (part3ReducedMotion.matches) { commit(); return; }
  try {
    void part3AnimateLayout(commit, { type: "spring", stiffness: 270, damping: 32 });
  } catch (error) {
    console.warn("AmaanTrader layout animation fell back to an immediate update:", error);
    commit();
  }
};

function part3InitShowcase(section) {
  if (part3ShowcaseCleanups.has(section)) return;
  const cleanups = [];
  const image = section.querySelector("[data-at-showcase-image]");

  if (part3ReducedMotion.matches) {
    section.querySelectorAll("[data-at-showcase-feature]").forEach((feature) => {
      feature.style.opacity = "";
      feature.style.transform = "";
    });
    if (image) image.style.transform = "";
    part3ShowcaseCleanups.set(section, () => {});
    return;
  }

  if (image) {
    const imageAnimation = part3Animate(
      image,
      { transform: ["translate3d(0, -3%, 0) scale(1.04)", "translate3d(0, 3%, 0) scale(1.12)"] },
      { ease: "linear" }
    );
    const stopScroll = part3Scroll(imageAnimation, {
      target: section,
      offset: ["start end", "end start"]
    });
    cleanups.push(() => stopScroll());
  }

  section.querySelectorAll("[data-at-showcase-feature]").forEach((feature) => {
    feature.style.opacity = "0";
    feature.style.transform = "translate3d(0, 18px, 0)";
    const stopInView = inView(feature, (element) => {
      if (part3ReducedMotion.matches) {
        element.style.opacity = "";
        element.style.transform = "";
        return;
      }
      const controls = part3Animate(
        element,
        { opacity: [0, 1], transform: ["translate3d(0, 18px, 0)", "translate3d(0, 0, 0)"] },
        { duration: 0.48, ease: revealEase }
      );
      return () => controls.stop();
    }, { amount: 0.2, margin: "0px 0px -5% 0px" });
    cleanups.push(stopInView);
  });

  part3ShowcaseCleanups.set(section, () => cleanups.forEach((cleanup) => {
    try { cleanup(); } catch { /* Route unmount cleanup. */ }
  }));
}

function part3ScanDOM() {
  part3TagProductCards();
  document.querySelectorAll("[data-at-showcase]").forEach(part3InitShowcase);
  for (const [element, cleanup] of part3ShowcaseCleanups) {
    if (!element.isConnected) {
      cleanup();
      part3ShowcaseCleanups.delete(element);
    }
  }
  part3AnimateCartBadges();
}

function part3QueueDOMScan() {
  if (part3DomScanQueued) return;
  part3DomScanQueued = true;
  requestAnimationFrame(() => {
    part3DomScanQueued = false;
    part3ScanDOM();
  });
}

function part3AnimateCartBadges() {
  document.querySelectorAll('.site-header .badge-anchor[aria-label="Shopping bag"] i, .mobile-bag i').forEach((badge) => {
    const count = badge.textContent || "";
    const previous = part3BadgeValues.get(badge);
    part3BadgeValues.set(badge, count);
    if (previous === undefined || previous === count || part3ReducedMotion.matches) return;
    part3Animate(badge, {
      opacity: [0.65, 1],
      transform: ["scale(0.72)", "scale(1)"]
    }, { type: "spring", stiffness: 520, damping: 25 });
  });
}

function part3HandleReducedMotionChange(event) {
  if (event.matches) {
    part3ShowcaseCleanups.forEach((cleanup, section) => {
      cleanup();
      section.querySelectorAll("[data-at-showcase-feature]").forEach((feature) => {
        feature.style.opacity = "";
        feature.style.transform = "";
      });
      const image = section.querySelector("[data-at-showcase-image]");
      if (image) image.style.transform = "";
    });
    part3ShowcaseCleanups.clear();
    part3StopCartAnimations();
  } else {
    part3ShowcaseCleanups.clear();
    part3QueueDOMScan();
  }
}

function part3Start() {
  if (part3DomObserver) return;
  document.addEventListener("click", part3HandleRouteClick, true);
  document.addEventListener("keydown", (event) => {
    if (!part3CartLayer || part3CartLayer.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      void part3CloseCartDrawer();
      return;
    }
    if (event.key !== "Tab") return;
    const panel = part3CartLayer.querySelector(".at-part3-cart-panel");
    const controls = [...panel.querySelectorAll("a[href], button:not([disabled]), [tabindex='0']")]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
    if (!controls.length) return;
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  }, true);

  const root = document.getElementById("root") || document.body;
  part3DomObserver = new MutationObserver(part3QueueDOMScan);
  part3DomObserver.observe(root, { subtree: true, childList: true, characterData: true });
  part3ScanDOM();

  if (part3ReducedMotion.addEventListener) {
    part3ReducedMotion.addEventListener("change", part3HandleReducedMotionChange);
  } else if (part3ReducedMotion.addListener) {
    part3ReducedMotion.addListener(part3HandleReducedMotionChange);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", part3Start, { once: true });
} else {
  part3Start();
}

/* BONUS: a subtle badge pulse helps confirm that the bag count changed. */
/* ===== END PART 3 ===== */
/* ===== PART 4 =====
 * AmaanTrader final vanilla-DOM enhancements.
 * Uses the `animate` function already imported by PART 1 from Motion.
 * No new runtime library, no product/cart state changes, no HTML rewrites.
 */
(() => {
  "use strict";

  // Guard against accidental duplicate module execution / repeated paste.
  if (window.__amaanTraderPart4Started) return;
  window.__amaanTraderPart4Started = true;

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const activeControls = new Set();
  const boundGalleryStages = new WeakSet();
  const boundCountdownDigits = new WeakSet();
  const countdownValues = new WeakMap();
  const countdownRewriteGuard = new WeakSet();
  const marqueeStates = new Set();

  const MAIN_IMAGE_SELECTOR = [
    "#productMainImage",
    "#pdpMainImage",
    "main .product-detail-layout .gallery-main img",
    "main .product-gallery-main img",
    "main .product-gallery img[data-main-image]"
  ].join(",");

  const COUNTDOWN_SELECTOR = [
    "#countDays", "#countHours", "#countMinutes", "#countSeconds",
    "#dropDays", "#dropHours", "#dropMinutes", "#dropSeconds",
    "#dropCountdown .countdown-unit strong",
    "#dropCountdown .countdown-item strong",
    "#dropCountdown .countdown > div > strong"
  ].join(",");

  const MARQUEE_SELECTOR = ".ticker-track, .endless-line-track";
  const injectedStyleId = "amaantrader-part4-motion-styles";

  let domObserver = null;
  let scanFrame = 0;
  let pageActive = true;
  let cursorState = null;

  function addControl(control) {
    if (control) activeControls.add(control);
    return control;
  }

  function cancelControl(control) {
    if (!control) return;
    try { control.cancel?.(); } catch { /* ignore stale playback controls */ }
    activeControls.delete(control);
  }

  function animateElement(element, keyframes, options = {}) {
    if (!element || reducedMotionQuery.matches) return null;
    let control;
    const callerComplete = options.onComplete;
    try {
      control = animate(element, keyframes, {
        ...options,
        onComplete: () => {
          if (control) activeControls.delete(control);
          if (typeof callerComplete === "function") callerComplete();
        }
      });
      addControl(control);
      return control;
    } catch (error) {
      console.warn("AmaanTrader Part 4 animation skipped:", error);
      return null;
    }
  }

  function injectStyles() {
    if (document.getElementById(injectedStyleId)) return;
    const style = document.createElement("style");
    style.id = injectedStyleId;
    style.textContent = `
      .at-p4-gallery-stage { position: relative; overflow: hidden; }
      .at-p4-gallery-main-image { transform-origin: 50% 50%; }
      .at-p4-image-ghost {
        position: absolute !important;
        inset: 0 !important;
        z-index: 1 !important;
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        max-width: none !important;
        margin: 0 !important;
        pointer-events: none !important;
      }
      .at-p4-countdown-window {
        display: inline-grid;
        overflow: hidden;
        vertical-align: baseline;
        line-height: 1.05;
        perspective: 360px;
      }
      .at-p4-countdown-old,
      .at-p4-countdown-next {
        display: block;
        grid-area: 1 / 1;
        transform-style: preserve-3d;
        backface-visibility: hidden;
      }
      .at-p4-cursor {
        position: fixed;
        top: 0;
        left: 0;
        z-index: 10000;
        width: 26px;
        height: 26px;
        display: grid;
        place-items: center;
        pointer-events: none;
        opacity: 0;
        will-change: transform, opacity;
        mix-blend-mode: difference;
      }
      .at-p4-cursor.is-visible { opacity: 1; }
      .at-p4-cursor-core {
        width: 9px;
        height: 9px;
        border: 1px solid rgba(255,255,255,.95);
        border-radius: 50%;
        background: rgba(255,255,255,.85);
        transform: scale(1);
        will-change: transform;
      }
      body.at-p4-cursor-active a,
      body.at-p4-cursor-active button,
      body.at-p4-cursor-active [role="button"] { cursor: none !important; }
      @media (hover: none), (pointer: coarse), (prefers-reduced-motion: reduce) {
        .at-p4-cursor { display: none !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function isMainProductImage(image) {
    return image instanceof HTMLImageElement && image.matches(MAIN_IMAGE_SELECTOR);
  }

  function bindGalleryZoom(image) {
    if (!isMainProductImage(image)) return;
    image.classList.add("at-p4-gallery-main-image");

    const stage = image.closest(".gallery-main, .product-gallery-main, #productMainImageButton, #pdpMainImageButton") || image.parentElement;
    if (!stage || boundGalleryStages.has(stage)) return;
    boundGalleryStages.add(stage);
    stage.classList.add("at-p4-gallery-stage");

    let zoomControl = null;
    stage.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch" || !finePointerQuery.matches || reducedMotionQuery.matches) return;
      if (zoomControl) cancelControl(zoomControl);
      zoomControl = animateElement(image, { transform: ["scale(1)", "scale(1.045)"] }, {
        duration: 0.42,
        ease: "easeOut"
      });
    });

    stage.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch" || !finePointerQuery.matches || reducedMotionQuery.matches) return;
      if (zoomControl) cancelControl(zoomControl);
      zoomControl = animateElement(image, { transform: "scale(1)" }, {
        duration: 0.34,
        ease: "easeOut"
      });
    });
  }

  function animateGalleryImageChange(image, previousSource) {
    if (!isMainProductImage(image) || !previousSource) return;
    const nextSource = image.getAttribute("src");
    if (!nextSource || nextSource === previousSource || /placeholder/i.test(previousSource)) return;

    const stage = image.parentElement;
    if (!stage) return;

    // Remove an unfinished previous overlay before starting a newer colour change.
    stage.querySelectorAll(":scope > .at-p4-image-ghost").forEach(node => node.remove());
    const ghost = image.cloneNode(false);
    ghost.removeAttribute("id");
    ghost.removeAttribute("srcset");
    ghost.removeAttribute("sizes");
    ghost.setAttribute("aria-hidden", "true");
    ghost.alt = "";
    ghost.src = previousSource;
    ghost.classList.add("at-p4-image-ghost");

    const imageStyle = getComputedStyle(image);
    ghost.style.objectFit = imageStyle.objectFit;
    ghost.style.objectPosition = imageStyle.objectPosition;
    ghost.style.borderRadius = imageStyle.borderRadius;

    stage.classList.add("at-p4-gallery-stage");
    stage.appendChild(ghost);

    animateElement(ghost, {
      opacity: [1, 0],
      transform: ["scale(1)", "scale(1.018)"]
    }, {
      duration: 0.34,
      ease: "easeOut",
      onComplete: () => ghost.remove()
    });

    animateElement(image, { opacity: [0.78, 1] }, {
      duration: 0.28,
      ease: "easeOut"
    });
  }

  function bindCountdownDigit(digit) {
    if (!(digit instanceof HTMLElement) || !digit.matches(COUNTDOWN_SELECTOR)) return;
    if (boundCountdownDigits.has(digit)) return;
    boundCountdownDigits.add(digit);
    countdownValues.set(digit, digit.textContent.trim());
  }

  function updateCountdownDigit(digit) {
    if (!(digit instanceof HTMLElement) || !digit.matches(COUNTDOWN_SELECTOR)) return;
    if (countdownRewriteGuard.has(digit)) {
      countdownRewriteGuard.delete(digit);
      return;
    }

    const nextValue = digit.textContent.trim();
    const previousValue = countdownValues.get(digit);
    if (previousValue === undefined) {
      bindCountdownDigit(digit);
      return;
    }
    if (nextValue === previousValue) return;
    countdownValues.set(digit, nextValue);

    // Only animate actual numeric countdown updates, not the initial placeholder.
    if (!/^\d{1,4}$/.test(previousValue) || !/^\d{1,4}$/.test(nextValue)) return;

    const windowNode = document.createElement("span");
    windowNode.className = "at-p4-countdown-window";
    const oldNode = document.createElement("span");
    oldNode.className = "at-p4-countdown-old";
    oldNode.textContent = previousValue;
    const nextNode = document.createElement("span");
    nextNode.className = "at-p4-countdown-next";
    nextNode.textContent = nextValue;
    windowNode.append(oldNode, nextNode);

    countdownRewriteGuard.add(digit);
    digit.replaceChildren(windowNode);
    digit.setAttribute("aria-label", nextValue);

    let completed = 0;
    const finish = () => {
      completed += 1;
      if (completed !== 2 || !digit.isConnected) return;
      countdownRewriteGuard.add(digit);
      digit.replaceChildren(document.createTextNode(nextValue));
    };

    animateElement(oldNode, {
      transform: ["translateY(0%) rotateX(0deg)", "translateY(-110%) rotateX(62deg)"],
      opacity: [1, 0]
    }, { duration: 0.32, ease: "easeIn", onComplete: finish });

    animateElement(nextNode, {
      transform: ["translateY(105%) rotateX(-62deg)", "translateY(0%) rotateX(0deg)"],
      opacity: [0, 1]
    }, { duration: 0.38, ease: "easeOut", onComplete: finish });
  }

  function readTranslateX(transform) {
    if (!transform || transform === "none") return 0;
    try {
      if (typeof DOMMatrixReadOnly === "function") return new DOMMatrixReadOnly(transform).m41 || 0;
    } catch { /* fall through to matrix parsing */ }
    const values = transform.match(/matrix(?:3d)?\(([^)]+)\)/);
    if (!values) return 0;
    const numbers = values[1].split(",").map(Number);
    return numbers.length === 16 ? (numbers[12] || 0) : (numbers[4] || 0);
  }

  function rampMarqueeSpeed(state, targetSpeed) {
    if (!state?.control || reducedMotionQuery.matches) return;
    if (state.speedFrame) cancelAnimationFrame(state.speedFrame);
    const from = Number(state.control.speed) || 1;
    const startTime = performance.now();
    const duration = 280;
    const tick = (time) => {
      if (reducedMotionQuery.matches || !state.control) return;
      const progress = Math.min(1, (time - startTime) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      state.control.speed = from + (targetSpeed - from) * eased;
      if (progress < 1) state.speedFrame = requestAnimationFrame(tick);
      else state.speedFrame = 0;
    };
    state.speedFrame = requestAnimationFrame(tick);
  }

  function bindMarquee(track) {
    if (!(track instanceof HTMLElement) || track.dataset.atP4MarqueeBound === "true") return;
    const children = Array.from(track.children);
    if (children.length < 2) return;

    const segmentWidth = track.scrollWidth / children.length;
    const viewportWidth = track.parentElement?.clientWidth || window.innerWidth;
    if (!Number.isFinite(segmentWidth) || segmentWidth <= 0 || track.scrollWidth < viewportWidth * 1.15) return;

    const initialTransform = getComputedStyle(track).transform;
    const startX = readTranslateX(initialTransform);
    const originalInlineAnimation = track.style.animation;
    const originalInlineTransform = track.style.transform;

    // Keep the present CSS-animation position, then hand the same transform to Motion.
    track.style.animation = "none";
    const duration = window.matchMedia("(max-width: 600px)").matches ? 34 : 40;
    const control = animateElement(track, {
      transform: [`translateX(${startX}px)`, `translateX(${startX - segmentWidth}px)`]
    }, { duration, ease: "linear", repeat: Infinity });

    if (!control) {
      track.style.animation = originalInlineAnimation;
      track.style.transform = originalInlineTransform;
      return;
    }

    track.dataset.atP4MarqueeBound = "true";
    const state = {
      track,
      control,
      speedFrame: 0,
      originalInlineAnimation,
      originalInlineTransform,
      onEnter: null,
      onLeave: null,
      cleanup: null
    };
    state.onEnter = (event) => {
      if (event.pointerType === "touch" || !finePointerQuery.matches) return;
      rampMarqueeSpeed(state, 0.58);
    };
    state.onLeave = (event) => {
      if (event.pointerType === "touch" || !finePointerQuery.matches) return;
      rampMarqueeSpeed(state, 1);
    };
    track.addEventListener("pointerenter", state.onEnter);
    track.addEventListener("pointerleave", state.onLeave);
    track.addEventListener("focusin", () => rampMarqueeSpeed(state, 0.72));
    track.addEventListener("focusout", () => rampMarqueeSpeed(state, 1));
    state.cleanup = () => {
      if (state.speedFrame) cancelAnimationFrame(state.speedFrame);
      cancelControl(state.control);
      track.removeEventListener("pointerenter", state.onEnter);
      track.removeEventListener("pointerleave", state.onLeave);
      track.style.animation = state.originalInlineAnimation;
      track.style.transform = state.originalInlineTransform;
      delete track.dataset.atP4MarqueeBound;
    };
    marqueeStates.add(state);
  }

  function createCustomCursor() {
    if (!finePointerQuery.matches || reducedMotionQuery.matches || cursorState || !document.body) return;

    const cursor = document.createElement("span");
    cursor.className = "at-p4-cursor";
    cursor.setAttribute("aria-hidden", "true");
    const core = document.createElement("span");
    core.className = "at-p4-cursor-core";
    cursor.appendChild(core);
    document.body.appendChild(cursor);
    document.body.classList.add("at-p4-cursor-active");

    const state = { cursor, core, x: -40, y: -40, frame: 0, scaleControl: null, activeTarget: null };
    const move = (event) => {
      if (event.pointerType === "touch") return;
      state.x = event.clientX;
      state.y = event.clientY;
      if (state.frame) return;
      state.frame = requestAnimationFrame(() => {
        state.frame = 0;
        cursor.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) translate(-50%, -50%)`;
        cursor.classList.add("is-visible");
      });
    };
    const over = (event) => {
      const target = event.target?.closest?.("a, button, [role='button'], .product-card, .category-tile");
      if (!target || target === state.activeTarget) return;
      state.activeTarget = target;
      if (state.scaleControl) cancelControl(state.scaleControl);
      state.scaleControl = animateElement(core, { transform: "scale(1.72)" }, { duration: 0.2, ease: "easeOut" });
    };
    const out = (event) => {
      const from = event.target?.closest?.("a, button, [role='button'], .product-card, .category-tile");
      const to = event.relatedTarget?.closest?.("a, button, [role='button'], .product-card, .category-tile");
      if (!from || from === to) return;
      state.activeTarget = to || null;
      if (state.scaleControl) cancelControl(state.scaleControl);
      state.scaleControl = animateElement(core, { transform: "scale(1)" }, { duration: 0.2, ease: "easeOut" });
    };
    const hide = () => cursor.classList.remove("is-visible");

    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerover", over, { passive: true });
    document.addEventListener("pointerout", out, { passive: true });
    window.addEventListener("blur", hide);
    state.cleanup = () => {
      if (state.frame) cancelAnimationFrame(state.frame);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerover", over);
      document.removeEventListener("pointerout", out);
      window.removeEventListener("blur", hide);
      cancelControl(state.scaleControl);
      cursor.remove();
      document.body.classList.remove("at-p4-cursor-active");
    };
    cursorState = state;
  }

  function scanPage() {
    if (reducedMotionQuery.matches || !pageActive) return;
    document.querySelectorAll(MAIN_IMAGE_SELECTOR).forEach(bindGalleryZoom);
    document.querySelectorAll(COUNTDOWN_SELECTOR).forEach(bindCountdownDigit);
    document.querySelectorAll(MARQUEE_SELECTOR).forEach(bindMarquee);
    createCustomCursor();
  }

  function scheduleScan() {
    if (scanFrame || reducedMotionQuery.matches || !pageActive) return;
    scanFrame = requestAnimationFrame(() => {
      scanFrame = 0;
      scanPage();
    });
  }

  function observePage() {
    if (domObserver || !document.body) return;
    domObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "attributes" && record.attributeName === "src") {
          animateGalleryImageChange(record.target, record.oldValue);
        }
        if (record.type === "childList") {
          const target = record.target instanceof HTMLElement ? record.target : record.target.parentElement;
          if (target?.matches?.(COUNTDOWN_SELECTOR)) updateCountdownDigit(target);
        }
      });
      scheduleScan();
    });
    domObserver.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: ["src"]
    });
  }

  function settleCountdownDigits() {
    document.querySelectorAll(".at-p4-countdown-window").forEach((windowNode) => {
      const digit = windowNode.parentElement;
      const next = windowNode.querySelector(".at-p4-countdown-next")?.textContent || "";
      if (!digit || !next) return;
      countdownRewriteGuard.add(digit);
      digit.replaceChildren(document.createTextNode(next));
      countdownValues.set(digit, next);
    });
    document.querySelectorAll(".at-p4-image-ghost").forEach(node => node.remove());
  }

  function stopPartFour() {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (scanFrame) {
      cancelAnimationFrame(scanFrame);
      scanFrame = 0;
    }
    activeControls.forEach((control) => {
      try { control.cancel?.(); } catch { /* ignore during lifecycle cleanup */ }
    });
    activeControls.clear();
    marqueeStates.forEach((state) => state.cleanup?.());
    marqueeStates.clear();
    if (cursorState) {
      cursorState.cleanup?.();
      cursorState = null;
    }
    settleCountdownDigits();
  }

  function startPartFour() {
    if (!pageActive || reducedMotionQuery.matches) return;
    injectStyles();
    scanPage();
    observePage();
  }

  function handleReducedMotionChange(event) {
    if (event.matches) stopPartFour();
    else startPartFour();
  }

  if (reducedMotionQuery.addEventListener) {
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  } else if (reducedMotionQuery.addListener) {
    reducedMotionQuery.addListener(handleReducedMotionChange);
  }

  window.addEventListener("pagehide", () => {
    pageActive = false;
    stopPartFour();
  });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    startPartFour();
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPartFour, { once: true });
  } else {
    startPartFour();
  }
})();
/* ===== END PART 4 ===== */
