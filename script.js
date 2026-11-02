"use strict";

/*
  AMAANTRADER STOREFRONT
  Catalogue: products.json
  Product pages: product/<product-slug>/
  Payment is optional: configure Razorpay credentials on the server to collect payments.
  Store notifications are sent through configured email and WhatsApp Business providers.
*/

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const STORAGE = {
  cart: "amaantrader-pro-cart",
  wishlist: "amaantrader-pro-wishlist",
  coupon: "amaantrader-pro-coupon",
  profile: "amaantrader-pro-profile",
  recent: "amaantrader-pro-recent"
};

const COLOURS = {
  Black: "#242424",
  Olive: "#667052",
  Brown: "#845a42",
  Blue: "#395b80",
  Cream: "#e7ddc9",
  Grey: "#92918b",
  Sand: "#c8b59a",
  Navy: "#273449",
  Burgundy: "#753d46"
};

const SHIPPING_THRESHOLD = 2999; // Demo amount — replace with client's approved terms.
const SHIPPING_FEE = 99;         // Demo fee — replace with real courier charges.
const WHATSAPP_NUMBER = String(window.AMAANTRADER_CONFIG?.whatsappNumber || "").replace(/\D/g, "");
const API_BASE_URL = String(window.AMAANTRADER_CONFIG?.apiBaseUrl || "").replace(/\/$/, "");
const SOCIAL_LINKS = { instagram: "", facebook: "" };

const state = {
  products: [],
  cart: readStorage(STORAGE.cart, []),
  wishlist: readStorage(STORAGE.wishlist, []),
  coupon: readStorage(STORAGE.coupon, ""),
  profile: readStorage(STORAGE.profile, null),

  categories: new Set(),
  color: "",
  size: "",
  maxPrice: 5000,
  query: "",
  collection: "All",
  wishlistOnly: false,

  quickProduct: null,
  quickSize: "",
  quickColor: "",
  quickImageIndex: 0,
  quickQuantity: 1,

  accountMode: "login",
  toastTimer: null,
  searchTimer: null,
  focusBeforeDialog: null,
  activeDialog: null
};

/* ---------------- Storage and utilities ---------------- */

function readStorage(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : JSON.parse(stored);
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    toast("Browser storage is unavailable. Changes may not persist.");
  }
}

function money(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function toast(message) {
  const element = $("#toast");
  if (!element) return;

  element.textContent = message;
  element.classList.add("is-visible");

  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    element.classList.remove("is-visible");
  }, 3000);
}

function byId(id) {
  return state.products.find(product => product.id === Number(id));
}

function bySlug(slug) {
  return state.products.find(product => product.slug === slug);
}

function priceFor(product, size = "") {
  const configured = Number(product?.sizePrices?.[size]);
  if (size && Number.isSafeInteger(configured) && configured >= 0) return configured;
  return Number(product?.price) || 0;
}

function startingPrice(product) {
  const sizes = Array.isArray(product?.sizes) ? product.sizes : [];
  const prices = sizes.map(size => priceFor(product, size)).filter(Number.isFinite);
  return prices.length ? Math.min(...prices) : (Number(product?.price) || 0);
}

function priceLabel(product) {
  return `From ${money(startingPrice(product))}`;
}

function productURL(product) {
  return `product/${encodeURIComponent(product.slug)}/`;
}

function apiURL(path) {
  return `${API_BASE_URL}${path}`;
}

async function apiRequest(path, options = {}) {
  const response = await fetch(apiURL(path), {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

function saved(id) {
  return state.wishlist.includes(Number(id));
}

function quantityInCart() {
  return state.cart.reduce((sum, item) => sum + item.quantity, 0);
}

function subtotal() {
  return state.cart.reduce((sum, item) => {
    const product = byId(item.id);
    return sum + (product ? priceFor(product, item.size) * item.quantity : 0);
  }, 0);
}

function hexFor(color) {
  return COLOURS[color] || "#777777";
}

/* ---------------- Accessible dialogs ---------------- */

function openDialog(backdropId, dialogSelector) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return;

  state.focusBeforeDialog = document.activeElement;
  state.activeDialog = backdrop;

  backdrop.inert = false;
  backdrop.setAttribute("aria-hidden", "false");
  backdrop.classList.add("is-open");
  updateBodyScroll();

  const dialog = dialogSelector
    ? $(dialogSelector, backdrop)
    : $("[role='dialog']", backdrop);

  requestAnimationFrame(() => {
    const firstControl = dialog?.querySelector(
      "button:not([disabled]),a[href],input:not([disabled]),select:not([disabled])"
    );
    (firstControl || dialog)?.focus?.();
  });
}

function closeDialog(backdropId) {
  const backdrop = document.getElementById(backdropId);
  if (!backdrop) return;

  backdrop.classList.remove("is-open");
  backdrop.inert = true;
  backdrop.setAttribute("aria-hidden", "true");

  if (state.activeDialog === backdrop) state.activeDialog = null;

  updateBodyScroll();

  const previous = state.focusBeforeDialog;
  state.focusBeforeDialog = null;

  if (previous && document.contains(previous) && typeof previous.focus === "function") {
    previous.focus();
  }
}

function updateBodyScroll() {
  const panelOpen = Boolean(
    $("#cartDrawer")?.classList.contains("is-open") ||
    $("#filterSidebar")?.classList.contains("is-open") ||
    $("#mobileNav")?.classList.contains("is-open") ||
    $(".modal-backdrop.is-open")
  );

  document.body.classList.toggle("no-scroll", panelOpen);
}

function syncPanels() {
  const cartOpen = $("#cartDrawer").classList.contains("is-open");
  const filtersOpen = $("#filterSidebar").classList.contains("is-open");
  const mobileMenuOpen = $("#mobileNav").classList.contains("is-open");
  const mobile = window.matchMedia("(max-width: 850px)").matches;

  const backdrop = $("#cartBackdrop");
  const overlayOpen = cartOpen || (filtersOpen && mobile);

  backdrop.classList.toggle("is-open", overlayOpen);
  backdrop.inert = !overlayOpen;
  backdrop.setAttribute("aria-hidden", String(!overlayOpen));

  $("#cartDrawer").inert = !cartOpen;
  $("#cartDrawer").setAttribute("aria-hidden", String(!cartOpen));

  $("#filterSidebar").inert = mobile && !filtersOpen;
  $("#filterSidebar").setAttribute("aria-hidden", String(mobile && !filtersOpen));

  $("#mobileNav").inert = !mobileMenuOpen;
  $("#mobileNav").setAttribute("aria-hidden", String(!mobileMenuOpen));

  $("#mobileFilterToggle").setAttribute("aria-expanded", String(filtersOpen));
  $("#menuToggle").setAttribute("aria-expanded", String(mobileMenuOpen));

  updateBodyScroll();
}

/* Prevent keyboard focus from escaping an open modal. */
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeCart();
    closeMobileMenu();
    closeFilters();

    $$(".modal-backdrop.is-open").forEach(backdrop => {
      closeDialog(backdrop.id);
    });

    syncPanels();
    return;
  }

  const backdrop = $(".modal-backdrop.is-open");
  if (event.key !== "Tab" || !backdrop) return;

  const dialog = $("[role='dialog']", backdrop);
  const controls = $$(
    "a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex='0']",
    dialog
  ).filter(element => element.offsetParent !== null);

  if (!controls.length) return;

  const first = controls[0];
  const last = controls[controls.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

/* ---------------- Product filters ---------------- */

function buildFilters() {
  const categories = [...new Set(state.products.map(item => item.category))]
    .sort((a, b) => a.localeCompare(b));

  const colors = [...new Set(state.products.flatMap(item => item.colors))]
    .sort((a, b) => a.localeCompare(b));

  const preferredSizes = ["S", "M", "L", "XL", "XXL"];
  const sizes = [...new Set(state.products.flatMap(item => item.sizes))]
    .sort((a, b) => {
      const ai = preferredSizes.indexOf(a);
      const bi = preferredSizes.indexOf(b);
      return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
    });

  $("#categoryFilters").innerHTML = categories.map(category => `
    <label class="filter-option">
      <input type="checkbox" data-filter-category="${escapeHTML(category)}">
      <span>${escapeHTML(category)}</span>
    </label>
  `).join("");

  $("#colorFilters").innerHTML = colors.map(color => `
    <button
      class="color-swatch"
      type="button"
      data-filter-color="${escapeHTML(color)}"
      aria-label="Filter by ${escapeHTML(color)}"
      aria-pressed="false"
      title="${escapeHTML(color)}"
      style="--swatch:${hexFor(color)}">
      <span>${escapeHTML(color)}</span>
    </button>
  `).join("");

  $("#sizeFilters").innerHTML = sizes.map(size => `
    <button
      type="button"
      data-filter-size="${escapeHTML(size)}"
      aria-pressed="false">
      ${escapeHTML(size)}
    </button>
  `).join("");

  const catalogueMax = Math.max(
    700,
    ...state.products.flatMap(product => (product.sizes || []).map(size => priceFor(product, size)))
  );
  const roundedMax = Math.ceil(catalogueMax / 500) * 500;

  state.maxPrice = roundedMax;
  $("#priceRange").max = String(roundedMax);
  $("#priceRange").value = String(roundedMax);
  $("#priceValue").textContent = money(roundedMax);
  $(".price-labels strong").textContent = money(roundedMax);
}

function matchesCollection(product) {
  if (state.collection === "All") return true;

  if (state.collection === "New In") {
    return Boolean(product.newIn) || /new/i.test(product.badge || "");
  }

  if (state.collection === "Winter Edit") {
    return ["Puffer", "Trench", "Windbreaker"].includes(product.category);
  }

  if (state.collection === "Bomber & Varsity") {
    return ["Bomber", "Varsity"].includes(product.category);
  }

  return product.category === state.collection;
}

function getFilteredProducts() {
  let products = [...state.products];

  if (state.wishlistOnly) {
    products = products.filter(product => saved(product.id));
  }

  products = products.filter(matchesCollection);

  if (state.categories.size) {
    products = products.filter(product => state.categories.has(product.category));
  }

  if (state.color) {
    products = products.filter(product => product.colors.includes(state.color));
  }

  if (state.size) {
    products = products.filter(product => product.sizes.includes(state.size));
  }

  products = products.filter(product => (state.size ? priceFor(product, state.size) : startingPrice(product)) <= state.maxPrice);

  const search = state.query.toLocaleLowerCase().trim();

  if (search) {
    products = products.filter(product => {
      const searchable = [
        product.name,
        product.category,
        product.description,
        product.fit,
        ...product.colors
      ].join(" ").toLocaleLowerCase();

      return searchable.includes(search);
    });
  }

  const sorting = $("#sortProducts").value;

  if (sorting === "newest") {
    products.sort((a, b) =>
      Number(Boolean(b.newIn)) - Number(Boolean(a.newIn)) || b.id - a.id
    );
  } else if (sorting === "price-low") {
    products.sort((a, b) => startingPrice(a) - startingPrice(b));
  } else if (sorting === "price-high") {
    products.sort((a, b) => startingPrice(b) - startingPrice(a));
  } else if (sorting === "name") {
    products.sort((a, b) => a.name.localeCompare(b.name));
  }

  return products;
}

function getActiveFilterCount() {
  const defaultMax = Number($("#priceRange").max || 5000);

  return state.categories.size
    + Number(Boolean(state.color))
    + Number(Boolean(state.size))
    + Number(state.maxPrice < defaultMax)
    + Number(Boolean(state.query))
    + Number(state.wishlistOnly)
    + Number(state.collection !== "All");
}

/* One chip per active filter. A category collection does not duplicate
   itself in the sidebar category selection. */
function getChips() {
  const chips = [];

  if (state.wishlistOnly) chips.push({ label: "Wishlist", type: "wishlist" });
  if (state.collection !== "All") chips.push({ label: state.collection, type: "collection" });

  state.categories.forEach(category => {
    chips.push({ label: category, type: "category", value: category });
  });

  if (state.color) chips.push({ label: state.color, type: "color" });
  if (state.size) chips.push({ label: `Size ${state.size}`, type: "size" });

  if (state.maxPrice < Number($("#priceRange").max)) {
    chips.push({ label: `Up to ${money(state.maxPrice)}`, type: "price" });
  }

  if (state.query) chips.push({ label: `Search: ${state.query}`, type: "search" });

  return chips;
}

function renderChips() {
  $("#activeChips").innerHTML = getChips().map(chip => `
    <span class="active-chip">
      ${escapeHTML(chip.label)}
      <button
        type="button"
        aria-label="Remove ${escapeHTML(chip.label)} filter"
        data-remove-filter="${chip.type}"
        ${chip.value ? `data-filter-value="${escapeHTML(chip.value)}"` : ""}>
        ×
      </button>
    </span>
  `).join("");
}

function syncFilterControls() {
  $$("[data-filter-category]").forEach(input => {
    input.checked = state.categories.has(input.dataset.filterCategory);
  });

  $$("[data-filter-color]").forEach(button => {
    const active = button.dataset.filterColor === state.color;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  $$("[data-filter-size]").forEach(button => {
    const active = button.dataset.filterSize === state.size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  $("#priceRange").value = String(state.maxPrice);
  $("#priceValue").textContent = money(state.maxPrice);
  $("#activeFilterCount").textContent = String(getActiveFilterCount());
  $("#showWishlist").setAttribute("aria-pressed", String(state.wishlistOnly));
}

function renderProducts() {
  const products = getFilteredProducts();
  const grid = $("#productGrid");
  const empty = $("#emptyResults");

  grid.hidden = products.length === 0;
  empty.hidden = products.length !== 0;

  grid.innerHTML = products.map(productCard).join("");

  $("#skeletonGrid").hidden = true;
  $("#resultsCount").textContent =
    `${products.length} ${products.length === 1 ? "style" : "styles"} in this edit`;

  $("#activeFilterLabel").textContent = state.wishlistOnly
    ? "Your wishlist"
    : state.collection === "All" ? "All outerwear" : state.collection;

  if (state.wishlistOnly && products.length === 0) {
    $("#emptyResults h3").textContent = "Your wishlist is waiting.";
    $("#emptyResults p").textContent = "Tap a heart on any jacket to save it here.";
  } else {
    $("#emptyResults h3").textContent = "No styles found.";
    $("#emptyResults p").textContent = "Try changing your search or clearing a filter.";
  }

  syncFilterControls();
  renderChips();

  // Intentionally do not close the filter drawer after each selection.
}

function resetFilters() {
  state.categories.clear();
  state.color = "";
  state.size = "";
  state.query = "";
  state.collection = "All";
  state.wishlistOnly = false;
  state.maxPrice = Number($("#priceRange").max || 5000);

  $("#productSearch").value = "";
  $("#sortProducts").value = "featured";
  $("#searchSuggestions").hidden = true;

  renderProducts();
}

function selectCollection(category) {
  state.wishlistOnly = false;
  state.collection = category || "All";
  state.categories.clear();
  state.color = "";
  state.size = "";
  state.query = "";
  state.maxPrice = Number($("#priceRange").max || 5000);

  $("#productSearch").value = "";

  if (category === "New In") {
    $("#sortProducts").value = "newest";
  } else {
    $("#sortProducts").value = "featured";
  }

  renderProducts();
  closeMobileMenu();
  $("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function removeChip(button) {
  switch (button.dataset.removeFilter) {
    case "wishlist":
      state.wishlistOnly = false;
      break;
    case "collection":
      state.collection = "All";
      break;
    case "category":
      state.categories.delete(button.dataset.filterValue);
      break;
    case "color":
      state.color = "";
      break;
    case "size":
      state.size = "";
      break;
    case "price":
      state.maxPrice = Number($("#priceRange").max || 5000);
      break;
    case "search":
      state.query = "";
      $("#productSearch").value = "";
      $("#searchSuggestions").hidden = true;
      break;
  }

  renderProducts();
}

/* ---------------- Product cards and search ---------------- */

function productCard(product) {
  const isSaved = saved(product.id);
  const productImage = escapeHTML(product.colorImages?.[product.colors?.[0]] || product.image);

  const swatches = product.colors.map(color => `
    <button
      class="product-swatch ${color === product.colors[0] ? "active" : ""}"
      type="button"
      data-card-color="${escapeHTML(color)}"
      data-product-id="${product.id}"
      aria-label="${escapeHTML(color)}"
      aria-pressed="${color === product.colors[0]}"
      title="${escapeHTML(color)}"
      style="--swatch:${hexFor(color)}">
    </button>
  `).join("");

  return `
    <article class="product-card" data-product-card="${product.id}">
      <div class="product-media">
        <a class="product-image-button"
           href="${productURL(product)}"
           aria-label="View ${escapeHTML(product.name)}">
          <img
            src="${productImage}"
            data-card-image="${product.id}"
            alt="${escapeHTML(product.name)} in ${escapeHTML(product.colors?.[0] || "available colour")}"
            width="900"
            height="1200"
            loading="lazy"
            onerror="this.onerror=null;this.src='assets/jacket-placeholder.svg'">
        </a>

        ${product.badge ? `<span class="product-badge">${escapeHTML(product.badge)}</span>` : ""}

        <button
          class="wishlist-button ${isSaved ? "active" : ""}"
          type="button"
          data-wishlist="${product.id}"
          aria-label="${isSaved ? "Remove from" : "Add to"} wishlist"
          aria-pressed="${isSaved}">
          ${isSaved ? "♥" : "♡"}
        </button>

        <button class="quick-view-button" type="button" data-quick-view="${product.id}">
          QUICK VIEW +
        </button>
      </div>

      <div class="product-meta">
        <span class="product-category">${escapeHTML(product.category)} Jacket</span>

        <a class="product-title" href="${productURL(product)}">
          ${escapeHTML(product.name)}
        </a>

        <div class="product-pricing">
          <span class="product-price">${priceLabel(product)}</span>
          <span class="product-demo-note">Select size for exact price</span>
        </div>

        <div class="product-swatches" aria-label="Available colours">
          ${swatches}
        </div>

        <div class="product-footer">
          <span class="product-stock-note">
            ${product.stock === 0 ? "Sold out (sample)" : `${product.sizes.length} sizes`}
          </span>
          <button class="quick-add" type="button" data-quick-view="${product.id}">
            CHOOSE SIZE +
          </button>
        </div>
      </div>
    </article>
  `;
}

function updateSuggestions() {
  const container = $("#searchSuggestions");
  const search = state.query.toLowerCase().trim();

  if (!search) {
    container.hidden = true;
    container.innerHTML = "";
    return;
  }

  const results = state.products
    .filter(product =>
      `${product.name} ${product.category} ${product.colors.join(" ")}`
        .toLowerCase()
        .includes(search)
    )
    .slice(0, 5);

  container.innerHTML = results.length
    ? results.map(product => `
        <button type="button" role="option" data-suggestion="${product.id}">
          <span>${escapeHTML(product.name)}</span>
          <strong>${priceLabel(product)}</strong>
        </button>
      `).join("")
    : `<button type="button" disabled>No matching products</button>`;

  container.hidden = false;
}

/* ---------------- Wishlist ---------------- */

function toggleWishlist(id) {
  id = Number(id);

  if (saved(id)) {
    state.wishlist = state.wishlist.filter(item => item !== id);
    toast("Removed from your wishlist.");
  } else {
    state.wishlist.push(id);
    toast("Added to your wishlist.");
  }

  writeStorage(STORAGE.wishlist, state.wishlist);
  $("#wishlistCount").textContent = String(state.wishlist.length);

  if (state.quickProduct === id) updateQuickWishlistButton();

  renderProducts();
  renderWishlistDrawer();
  $("#wishlistCount").textContent = String(state.wishlist.length);
}

function renderWishlistDrawer() {
  const grid = $("#wishlistGrid");
  const empty = $("#wishlistEmpty");
  if (!grid || !empty) return;

  const products = state.wishlist.map(byId).filter(Boolean);
  empty.hidden = products.length > 0;
  grid.hidden = products.length === 0;
  grid.innerHTML = products.map(product => `
    <article class="wishlist-card">
      <a class="wishlist-card-image" href="${productURL(product)}" aria-label="View ${escapeHTML(product.name)}">
        <img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/jacket-placeholder.svg'">
      </a>
      <div class="wishlist-card-copy"><span>${escapeHTML(product.category)} / THE EDIT</span><h3>${escapeHTML(product.name)}</h3><strong>${priceLabel(product)}</strong>
        <p>${product.colors.map(escapeHTML).join(" · ")} <span aria-hidden="true">/</span> ${product.sizes.map(escapeHTML).join(" · ")}</p>
        <div class="wishlist-card-actions"><button class="button button-dark" type="button" data-wishlist-quick="${product.id}">Choose options</button><button class="wishlist-remove" type="button" data-wishlist-remove="${product.id}" aria-label="Remove ${escapeHTML(product.name)} from wishlist">Remove ×</button></div>
      </div>
    </article>
  `).join("");
}

function openWishlist() {
  renderWishlistDrawer();
  openDialog("wishlistBackdrop", "#wishlistModal");
}

function showWishlistInCollection() {
  closeDialog("wishlistBackdrop");
  state.wishlistOnly = true;
  state.collection = "All";
  state.categories.clear();
  state.color = "";
  state.size = "";
  state.query = "";
  state.maxPrice = Number($("#priceRange").max || 5000);
  $("#productSearch").value = "";
  renderProducts();
  $("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
}

function toggleWishlistView() {
  state.wishlistOnly = !state.wishlistOnly;
  state.collection = "All";
  state.categories.clear();
  state.color = "";
  state.size = "";
  state.query = "";
  state.maxPrice = Number($("#priceRange").max || 5000);

  $("#productSearch").value = "";
  renderProducts();

  $("#collection").scrollIntoView({ behavior: "smooth", block: "start" });
  toast(state.wishlistOnly ? "Showing your saved jackets." : "Showing all jackets.");
}

/* ---------------- Quick view, sizes, gallery and zoom ---------------- */

function quickViewImages(product) {
  // Shared by every product card, collection, search suggestion and wishlist entry.
  // Exploded-view art is included only when that product has a style-matched asset.
  const gallery = [];
  const seen = new Set();
  const addImage = (src, label, kind = "product") => {
    if (typeof src !== "string" || !src.trim() || seen.has(src)) return;
    seen.add(src);
    gallery.push({ src, label, kind });
  };

  const angleViews = Array.isArray(product.galleryViews) ? product.galleryViews : [];
  angleViews.forEach(view => {
    if (view && typeof view === "object") addImage(view.src, view.label || "Product view", view.kind || "angle");
  });

  const standardImages = Array.isArray(product.images) ? product.images : [];
  const labels = Array.isArray(product.galleryLabels) ? product.galleryLabels : [];
  standardImages.forEach((src, index) => {
    addImage(src, labels[index] || (index === 0 ? "Product View" : `Gallery View ${index + 1}`));
  });

  if (product.colorImages && typeof product.colorImages === "object") {
    Object.entries(product.colorImages).forEach(([colour, src]) => {
      addImage(src, `${colour} View`, "colour");
    });
  }

  addImage(product.image, gallery.length ? "Product Photo" : "Product View");
  if (product.explodedView) addImage(product.explodedView, "Exploded View", "exploded");
  if (!gallery.length) addImage("assets/jacket-placeholder.svg", "Product image", "fallback");

  return gallery;
}

function quickAvailability(product) {
  if (product.stock === 0) return "Sold out (sample listing)";
  if (Number.isInteger(product.stock) && product.stock > 0) {
    return `${product.stock} units listed · confirm live stock`;
  }
  return "Confirm availability with the store";
}

function openQuickView(id) {
  const product = byId(id);
  if (!product) return;

  state.quickProduct = product.id;
  state.quickSize = "";
  state.quickColor = product.colors[0] || "";
  state.quickImageIndex = 0;
  state.quickQuantity = 1;
  const selectedColourPhoto = product.colorImages?.[state.quickColor];
  const initialGallery = quickViewImages(product);
  const initialColourIndex = initialGallery.findIndex(image => image.src === selectedColourPhoto);
  state.quickImageIndex = initialColourIndex >= 0 ? initialColourIndex : 0;

  $("#quickViewCategory").textContent = `${product.category} / THE EDIT`;
  $("#quickViewTitle").textContent = product.name;
  $("#quickViewPrice").textContent = priceLabel(product);
  $("#quickViewBadge").textContent = product.badge || "";
  $("#quickViewDescription").textContent = product.description || "";
  $("#quickViewFit").textContent = product.fit || "Fit details to be confirmed";
  $("#quickViewFabric").textContent = product.fabric || "Fabric details to be confirmed";
  $("#quickViewCare").textContent = product.care || "Care instructions to be confirmed";
  $("#quickViewStock").textContent = quickAvailability(product);
  $("#quickViewQuality").textContent = product.qualityNote || "Inspect fabric, seams, lining and closures on a physical sample; exact material grade is not verified.";
  const initialGalleryImage = quickViewImages(product)[state.quickImageIndex] || quickViewImages(product)[0];
  setQuickMainImage(initialGalleryImage.src, `${product.name} — ${initialGalleryImage.label}`);
  const imageLabel = $("#quickViewImageLabel");
  if (imageLabel) imageLabel.textContent = initialGalleryImage.label;
  $("#quickViewFullPage").href = productURL(product);
  $("#quickViewColorName").textContent = state.quickColor || "Choose a colour";
  $("#sizeError").textContent = "";

  $("#quickViewColors").innerHTML = product.colors.map(color => `
    <button
      type="button"
      class="${color === state.quickColor ? "active" : ""}"
      data-quick-color="${escapeHTML(color)}"
      aria-label="Choose ${escapeHTML(color)}"
      aria-pressed="${color === state.quickColor}"
      title="${escapeHTML(color)}"
      style="--swatch:${hexFor(color)}">
    </button>
  `).join("");

  $("#sizeOptions").innerHTML = product.sizes.map(size => `
    <button
      type="button"
      class="${size === state.quickSize ? "active" : ""}"
      data-quick-size="${escapeHTML(size)}"
      aria-pressed="${size === state.quickSize}">
      <span>${escapeHTML(size)}</span><small>${money(priceFor(product, size))}</small>
    </button>
  `).join("");

  renderQuickGallery(product);
  renderQuickPurchaseSummary();
  updateQuickWishlistButton();

  const whatsappButton = $("#quickViewWhatsApp");
  if (whatsappButton) whatsappButton.hidden = !WHATSAPP_NUMBER;

  openDialog("quickViewBackdrop", "#quickView");
}

function setQuickMainImage(src, alt) {
  const image = $("#quickViewImage");
  if (!image) return;
  image.onerror = null;
  image.dataset.fallbackApplied = "";
  image.onerror = () => {
    if (image.dataset.fallbackApplied === "1") return;
    image.dataset.fallbackApplied = "1";
    image.onerror = null;
    image.src = "assets/jacket-placeholder.svg";
  };
  image.src = src || "assets/jacket-placeholder.svg";
  image.alt = alt || "AmaanTrader jacket product reference";
}

function renderQuickGallery(product) {
  const images = quickViewImages(product);

  $("#quickGalleryThumbs").innerHTML = images.map((image, index) => `
    <button
      type="button"
      class="${index === state.quickImageIndex ? "active" : ""}"
      data-gallery-index="${index}"
      data-gallery-kind="${escapeHTML(image.kind)}"
      title="${escapeHTML(image.label)}"
      aria-label="Show ${escapeHTML(image.label)} for ${escapeHTML(product.name)}"
      aria-pressed="${index === state.quickImageIndex}">
      <img src="${escapeHTML(image.src)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='assets/jacket-placeholder.svg'">
      <span>${escapeHTML(image.label)}</span>
    </button>
  `).join("");
}

function renderQuickPurchaseSummary() {
  const product = byId(state.quickProduct);
  if (!product) return;

  const quantity = Math.max(1, Math.min(10, Number(state.quickQuantity) || 1));
  state.quickQuantity = quantity;
  const chosenUnitPrice = state.quickSize ? priceFor(product, state.quickSize) : 0;
  const lineTotal = chosenUnitPrice * quantity;
  const selectedSize = state.quickSize || "Choose size";
  const priceOutput = $("#quickViewPrice");
  if (priceOutput) priceOutput.textContent = state.quickSize ? money(chosenUnitPrice) : priceLabel(product);
  const selectedColor = state.quickColor || "Choose colour";

  const quantityOutput = $("#quickViewQuantity");
  if (quantityOutput) quantityOutput.textContent = String(quantity);
  const lineTotalOutput = $("#quickViewLineTotal");
  if (lineTotalOutput) lineTotalOutput.textContent = money(lineTotal);

  const selectionSummary = $("#quickViewSelectionSummary");
  if (selectionSummary) {
    selectionSummary.textContent = `${selectedColor} · Size ${selectedSize} · Qty ${quantity}`;
  }

  const addLabel = $("#quickViewAddLabel");
  if (addLabel) addLabel.textContent = state.quickSize ? `ADD ${quantity} TO BAG · ${money(lineTotal)}` : "CHOOSE A SIZE TO SEE PRICE";
}

function changeQuickQuantity(delta) {
  state.quickQuantity = Math.max(1, Math.min(10, (Number(state.quickQuantity) || 1) + delta));
  renderQuickPurchaseSummary();
}

function changeQuickImage(index) {
  const product = byId(state.quickProduct);
  if (!product) return;

  const images = quickViewImages(product);
  const image = images[index];
  if (!image) return;

  state.quickImageIndex = index;
  setQuickMainImage(image.src, `${product.name} — ${image.label}`);
  const imageLabel = $("#quickViewImageLabel");
  if (imageLabel) imageLabel.textContent = image.label;

  $$("[data-gallery-index]").forEach(button => {
    const active = Number(button.dataset.galleryIndex) === index;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}
function changeQuickColor(color) {
  const product = byId(state.quickProduct);
  if (!product || !product.colors.includes(color)) return;

  state.quickColor = color;
  $("#quickViewColorName").textContent = color;

  $$("[data-quick-color]").forEach(button => {
    const active = button.dataset.quickColor === color;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  const colourImage = product.colorImages?.[color];
  if (colourImage) {
    const index = quickViewImages(product).findIndex(image => image.src === colourImage);
    if (index >= 0) {
      changeQuickImage(index);
    } else {
      // Defensive fallback for a colour photo missing from the base gallery.
      setQuickMainImage(colourImage, `${product.name} in ${color}`);
      const imageLabel = $("#quickViewImageLabel");
      if (imageLabel) imageLabel.textContent = `${color} View`;
    }
  }
  renderQuickPurchaseSummary();
}

function changeQuickSize(size) {
  const product = byId(state.quickProduct);
  if (!product || !product.sizes.includes(size)) return;

  state.quickSize = size;
  $("#sizeError").textContent = "";

  $$("[data-quick-size]").forEach(button => {
    const active = button.dataset.quickSize === size;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  renderQuickPurchaseSummary();
}

function updateQuickWishlistButton() {
  const button = $("#quickViewWish");
  const isSaved = saved(state.quickProduct);
  button.textContent = isSaved ? "♥ Saved to wishlist" : "♡ Add to wishlist";
}

function addCurrentProductToCart() {
  const product = byId(state.quickProduct);
  if (!product) return;

  if (!product.sizes.includes(state.quickSize)) {
    $("#sizeError").textContent = "Please select a size before adding to your bag.";
    return;
  }

  if (!product.colors.includes(state.quickColor)) {
    $("#sizeError").textContent = "Please choose an available colour.";
    return;
  }

  if (product.stock === 0) {
    toast("This sample product is marked sold out.");
    return;
  }

  addToCart(product.id, state.quickSize, state.quickColor, state.quickQuantity);
  closeDialog("quickViewBackdrop");
}

function askQuickViewWhatsApp() {
  const product = byId(state.quickProduct);
  if (!product || !WHATSAPP_NUMBER) return;
  const message = encodeURIComponent(
    `Hi AmaanTrader! I'm interested in ${product.name}. Colour: ${state.quickColor || "not selected"}; size: ${state.quickSize || "not selected"}; quantity: ${state.quickQuantity}. Please share availability and delivery details.`
  );
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank", "noopener,noreferrer");
}

function openImageZoom() {
  const image = $("#quickViewImage");
  $("#zoomedImage").src = image.src;
  $("#zoomedImage").alt = image.alt;
  openDialog("imageZoomBackdrop");
}

/* ---------------- Cart and coupon persistence ---------------- */

function addToCart(id, size, color, quantity = 1) {
  const product = byId(id);
  if (!product) return;

  const amount = Math.max(1, Math.min(10, Number(quantity) || 1));
  const existing = state.cart.find(item =>
    item.id === product.id && item.size === size && item.color === color
  );

  if (existing) {
    existing.quantity += amount;
  } else {
    state.cart.push({ id: product.id, size, color, quantity: amount });
  }

  writeStorage(STORAGE.cart, state.cart);
  renderCart();
  toast(`${amount} × ${product.name} added to your bag.`);
}

function discountAmount() {
  return state.coupon === "AT10" ? Math.round(subtotal() * .10) : 0;
}

function renderCart() {
  state.cart = state.cart.filter(item => byId(item.id) && item.quantity > 0);
  writeStorage(STORAGE.cart, state.cart);

  const quantity = quantityInCart();
  const sub = subtotal();
  const discount = discountAmount();
  const shipping = sub === 0 || sub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.max(0, sub - discount) + shipping;

  $("#cartCount").textContent = String(quantity);
  $("#drawerCount").textContent = `(${quantity})`;

  $("#emptyCart").hidden = state.cart.length > 0;
  $("#cartItems").hidden = state.cart.length === 0;
  $("#cartFooter").hidden = state.cart.length === 0;

  $("#cartItems").innerHTML = state.cart.map(item => {
    const product = byId(item.id);
    const key = `${item.id}|${item.size}|${item.color}`;

    return `
      <div class="cart-item">
        <img src="${escapeHTML(product.colorImages?.[item.color] || product.image)}"
             alt="${escapeHTML(product.name)} in ${escapeHTML(item.color)}"
             width="80"
             height="98">

        <div class="cart-item-details">
          <strong>${escapeHTML(product.name)}</strong>
          <p>Colour: ${escapeHTML(item.color)}</p>
          <p>Size: ${escapeHTML(item.size)}</p>
          <p class="cart-item-price">${money(priceFor(product, item.size))}</p>

          <div class="quantity-control" aria-label="Product quantity">
            <button type="button" data-quantity="-1" data-cart-key="${escapeHTML(key)}" aria-label="Decrease quantity">−</button>
            <span>${item.quantity}</span>
            <button type="button" data-quantity="1" data-cart-key="${escapeHTML(key)}" aria-label="Increase quantity">+</button>
          </div>
        </div>

        <div class="cart-item-actions">
          <span class="cart-item-line-price">${money(priceFor(product, item.size) * item.quantity)}</span>
          <button type="button" class="remove-cart-item" data-remove-cart="${escapeHTML(key)}">Remove</button>
        </div>
      </div>
    `;
  }).join("");

  $("#cartSubtotal").textContent = money(sub);
  $("#cartDiscount").textContent = `−${money(discount)}`;
  $("#discountRow").hidden = discount === 0;

  $("#shippingCost").textContent = sub === 0
    ? "—"
    : sub >= SHIPPING_THRESHOLD ? "₹0 (demo)" : `${money(shipping)} (demo)`;

  $("#cartTotal").textContent = money(total);

  $("#shippingProgressBar").style.width =
    `${Math.min(100, sub / SHIPPING_THRESHOLD * 100)}%`;

  $("#shippingMessage").textContent = sub === 0
    ? "Add a product to begin your bag."
    : sub >= SHIPPING_THRESHOLD
      ? "Your sample bag has reached the demo shipping threshold."
      : `Add ${money(SHIPPING_THRESHOLD - sub)} more to reach the demo threshold.`;
}

function changeQuantity(key, change) {
  const [rawId, size, color] = key.split("|");
  const id = Number(rawId);

  const item = state.cart.find(entry =>
    entry.id === id && entry.size === size && entry.color === color
  );

  if (!item) return;

  item.quantity += change;

  if (item.quantity <= 0) {
    state.cart = state.cart.filter(entry => entry !== item);
  }

  if (!state.cart.length) state.coupon = "";
  writeStorage(STORAGE.coupon, state.coupon);
  renderCart();
}

function removeCartItem(key) {
  const [rawId, size, color] = key.split("|");
  const id = Number(rawId);

  state.cart = state.cart.filter(item =>
    !(item.id === id && item.size === size && item.color === color)
  );

  if (!state.cart.length) state.coupon = "";

  writeStorage(STORAGE.coupon, state.coupon);
  renderCart();
  toast("Item removed from your bag.");
}

function openCart() {
  closeMobileMenu();
  closeFilters();

  $("#cartDrawer").classList.add("is-open");
  syncPanels();
  $("#closeCart").focus();
}

function closeCart() {
  $("#cartDrawer").classList.remove("is-open");
  syncPanels();
}

function closeFilters() {
  $("#filterSidebar").classList.remove("is-open");
  syncPanels();
}

function closeMobileMenu() {
  $("#mobileNav").classList.remove("is-open");
  syncPanels();
}

function applyCoupon(code) {
  if (!state.cart.length) {
    state.coupon = "";
    $("#couponMessage").textContent = "Add a product before applying a code.";
  } else if (code === "AT10") {
    state.coupon = "AT10";
    $("#couponMessage").textContent = "Demo coupon applied: 10% off the sample subtotal.";
  } else {
    state.coupon = "";
    $("#couponMessage").textContent = "Code not recognised. Try the sample code AT10.";
  }

  writeStorage(STORAGE.coupon, state.coupon);
  renderCart();
}

/* ---------------- Demo customer account ---------------- */

function renderAccount() {
  const signedIn = Boolean(state.profile && state.profile.token);

  $("#accountForm").hidden = signedIn;
  $("#accountSignedIn").hidden = !signedIn;
  $("#accountTabs").hidden = signedIn;

  $("#loginTab").classList.toggle("active", state.accountMode === "login");
  $("#registerTab").classList.toggle("active", state.accountMode === "register");
  $("#accountNameField").hidden = state.accountMode !== "register";
  $("#accountName").required = state.accountMode === "register";
  $("#accountPassword").minLength = state.accountMode === "register" ? 10 : 1;
  $("#accountPassword").placeholder = state.accountMode === "register" ? "Enter 10+ characters" : "Enter your password";

  $("#accountTitle").textContent = signedIn
    ? "Welcome back."
    : state.accountMode === "register" ? "Create your space." : "Your style space.";

  $("#accountLead").textContent = signedIn
    ? "Your AmaanTrader account is connected."
    : state.accountMode === "register"
      ? "Create an account with your name, email and a secure password."
      : "Sign in to your AmaanTrader account.";

  $("#accountSubmit").innerHTML = state.accountMode === "register"
    ? 'CREATE ACCOUNT <span aria-hidden="true">↗</span>'
    : 'SIGN IN <span aria-hidden="true">↗</span>';

  $("#signedInGreeting").textContent = signedIn
    ? `Signed in as ${state.profile.name || state.profile.email}`
    : "";
}

function openAccount() {
  renderAccount();
  $("#accountMessage").textContent = "";
  openDialog("accountBackdrop", "#accountModal");
}

async function submitAccount(event) {
  event.preventDefault();

  const email = $("#accountEmail").value.trim().toLowerCase();
  const password = $("#accountPassword").value;
  const name = $("#accountName").value.trim();
  const message = $("#accountMessage");

  if (!email || !password || (state.accountMode === "register" && password.length < 10)) {
    message.textContent = state.accountMode === "register"
      ? "Enter a valid email and a password with at least 10 characters."
      : "Enter a valid email and password.";
    return;
  }
  if (state.accountMode === "register" && !name) {
    message.textContent = "Enter your name to create an account.";
    return;
  }

  const submit = $("#accountSubmit");
  submit.disabled = true;
  message.textContent = "Connecting securely…";

  try {
    const result = await apiRequest(state.accountMode === "register" ? "/api/auth/register" : "/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, name })
    });
    state.profile = { name: result.user.name, email: result.user.email, token: result.token };
    writeStorage(STORAGE.profile, state.profile);
    renderAccount();
    toast(state.accountMode === "register" ? "Your AmaanTrader account is ready." : "Welcome back. You are signed in.");
  } catch (error) {
    message.textContent = `${error.message}. Make sure the Node backend is running with npm start.`;
  } finally {
    submit.disabled = false;
  }
}

async function signOut() {
  const token = state.profile?.token;
  if (token) {
    apiRequest("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: "{}" }).catch(() => {});
  }
  state.profile = null;
  try { localStorage.removeItem(STORAGE.profile); } catch {}
  $("#accountForm").reset();
  state.accountMode = "login";
  renderAccount();
  toast("You have signed out.");
}

/* ---------------- Event listeners ---------------- */

// Navigation
$("#menuToggle").addEventListener("click", () => {
  const opening = !$("#mobileNav").classList.contains("is-open");
  closeFilters();
  closeCart();
  $("#mobileNav").classList.toggle("is-open", opening);
  syncPanels();
});

document.addEventListener("click", event => {
  const nav = event.target.closest("[data-nav-filter]");
  const category = event.target.closest("[data-category]");

  if (nav) {
    event.preventDefault();
    selectCollection(nav.dataset.navFilter);
    return;
  }

  if (category) {
    selectCollection(category.dataset.category);
  }
});

$("#searchToggle").addEventListener("click", () => {
  $("#collection").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => $("#productSearch").focus(), 350);
});

$("#mobileAccount").addEventListener("click", () => {
  closeMobileMenu();
  openAccount();
});

// Dynamic category filters
$("#categoryFilters").addEventListener("change", event => {
  const input = event.target.closest("[data-filter-category]");
  if (!input) return;

  state.collection = "All";
  state.wishlistOnly = false;

  if (input.checked) state.categories.add(input.dataset.filterCategory);
  else state.categories.delete(input.dataset.filterCategory);

  renderProducts();
});

// Colour filters
$("#colorFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter-color]");
  if (!button) return;

  state.collection = "All";
  state.wishlistOnly = false;
  state.color = state.color === button.dataset.filterColor ? "" : button.dataset.filterColor;
  renderProducts();
});

// Size filters
$("#sizeFilters").addEventListener("click", event => {
  const button = event.target.closest("[data-filter-size]");
  if (!button) return;

  state.collection = "All";
  state.wishlistOnly = false;
  state.size = state.size === button.dataset.filterSize ? "" : button.dataset.filterSize;
  renderProducts();
});

// Price filter uses input for live label and change for filtering.
$("#priceRange").addEventListener("input", event => {
  $("#priceValue").textContent = money(Number(event.target.value));
});

$("#priceRange").addEventListener("change", event => {
  state.collection = "All";
  state.wishlistOnly = false;
  state.maxPrice = Number(event.target.value);
  renderProducts();
});

// Debounced search prevents rerendering on every keystroke.
$("#productSearch").addEventListener("input", event => {
  state.query = event.target.value.trim();
  state.collection = "All";
  state.wishlistOnly = false;

  clearTimeout(state.searchTimer);
  state.searchTimer = setTimeout(() => {
    updateSuggestions();
    renderProducts();
  }, 250);
});

$("#productSearch").addEventListener("focus", updateSuggestions);

$("#searchSuggestions").addEventListener("click", event => {
  const button = event.target.closest("[data-suggestion]");
  if (!button) return;

  $("#searchSuggestions").hidden = true;
  openQuickView(Number(button.dataset.suggestion));
});

document.addEventListener("click", event => {
  if (!event.target.closest(".search-box") && !event.target.closest("#searchSuggestions")) {
    $("#searchSuggestions").hidden = true;
  }
});

$("#sortProducts").addEventListener("change", renderProducts);
$("#clearFilters").addEventListener("click", resetFilters);
$("#resetSearch").addEventListener("click", resetFilters);

$("#activeChips").addEventListener("click", event => {
  const button = event.target.closest("[data-remove-filter]");
  if (button) removeChip(button);
});

$("#mobileFilterToggle").addEventListener("click", () => {
  const opening = !$("#filterSidebar").classList.contains("is-open");
  closeCart();
  closeMobileMenu();
  $("#filterSidebar").classList.toggle("is-open", opening);
  syncPanels();
});

$("#cartBackdrop").addEventListener("click", () => {
  closeCart();
  closeFilters();
});

// Wishlist and quick view
document.addEventListener("click", event => {
  const cardColour = event.target.closest("[data-card-color]");
  if (cardColour) {
    event.preventDefault();
    event.stopPropagation();
    const product = byId(cardColour.dataset.productId);
    const card = cardColour.closest("[data-product-card]");
    if (product && card) {
      const colour = cardColour.dataset.cardColor;
      const colourImage = product.colorImages?.[colour] || product.image;
      const image = card.querySelector("[data-card-image]");
      if (image) {
        image.src = colourImage;
        image.alt = `${product.name} in ${colour}`;
      }
      card.querySelectorAll("[data-card-color]").forEach(button => {
        const active = button.dataset.cardColor === colour;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }
    return;
  }

  const heart = event.target.closest("[data-wishlist]");
  const quick = event.target.closest("[data-quick-view]");

  if (heart) {
    event.preventDefault();
    event.stopPropagation();
    toggleWishlist(Number(heart.dataset.wishlist));
    return;
  }

  if (quick) {
    openQuickView(Number(quick.dataset.quickView));
  }
});

$("#quickViewColors").addEventListener("click", event => {
  const button = event.target.closest("[data-quick-color]");
  if (button) changeQuickColor(button.dataset.quickColor);
});

$("#sizeOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-quick-size]");
  if (button) changeQuickSize(button.dataset.quickSize);
});

$("#quickGalleryThumbs").addEventListener("click", event => {
  const button = event.target.closest("[data-gallery-index]");
  if (button) changeQuickImage(Number(button.dataset.galleryIndex));
});

$("#quickViewAdd").addEventListener("click", addCurrentProductToCart);
$("#quickViewQuantityControls").addEventListener("click", event => {
  const button = event.target.closest("[data-quick-quantity]");
  if (button) changeQuickQuantity(Number(button.dataset.quickQuantity));
});
$("#quickViewWhatsApp")?.addEventListener("click", askQuickViewWhatsApp);
$("#quickViewWish").addEventListener("click", () => {
  if (state.quickProduct !== null) toggleWishlist(state.quickProduct);
});

$("#quickViewImageButton").addEventListener("click", openImageZoom);
$("#showWishlist").addEventListener("click", openWishlist);

// Dialog closing buttons
$$("[data-close]").forEach(button => {
  button.addEventListener("click", () => closeDialog(button.dataset.close));
});

$$(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) closeDialog(backdrop.id);
  });
});

// Cart
$("#openCart").addEventListener("click", openCart);
$("#closeCart").addEventListener("click", closeCart);

$("#cartItems").addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity]");
  const removeButton = event.target.closest("[data-remove-cart]");

  if (quantityButton) {
    changeQuantity(quantityButton.dataset.cartKey, Number(quantityButton.dataset.quantity));
    return;
  }

  if (removeButton) removeCartItem(removeButton.dataset.removeCart);
});

$("#continueShopping").addEventListener("click", () => {
  closeCart();
  $("#collection").scrollIntoView({ behavior: "smooth" });
});

$("#couponForm").addEventListener("submit", event => {
  event.preventDefault();
  applyCoupon($("#couponInput").value.trim().toUpperCase());
});

$("#copyCoupon").addEventListener("click", async () => {
  const code = "AT10";

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
      toast("Demo coupon AT10 copied.");
    } else {
      $("#couponInput").value = code;
      toast("Sample coupon: AT10");
    }
  } catch {
    $("#couponInput").value = code;
    toast("Sample coupon: AT10");
  }
});

$("#checkoutButton").addEventListener("click", openCheckout);
$("#checkoutForm").addEventListener("submit", submitCheckout);

$("#orderSupportForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $("#orderSupportStatus");
  const button = $("#supportSubmitButton");
  button.disabled = true;
  button.textContent = "SENDING…";
  status.textContent = "Sending your request to the store…";
  try {
    const result = await apiRequest("/api/orders/action", {
      method: "POST",
      body: JSON.stringify({
        orderId: $("#supportOrderId").value.trim(),
        email: $("#supportEmail").value.trim(),
        action: $("#supportAction").value,
        message: $("#supportMessage").value.trim()
      })
    });
    status.textContent = result.message;
    form.reset();
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = "SEND REQUEST ↗";
  }
});
$("#orderSuccessContinue").addEventListener("click", () => closeDialog("orderSuccessBackdrop"));
$("#wishlistShowInGrid").addEventListener("click", showWishlistInCollection);
$("#wishlistBrowse").addEventListener("click", () => { closeDialog("wishlistBackdrop"); $("#collection").scrollIntoView({ behavior: "smooth" }); });
$("#wishlistGrid").addEventListener("click", event => {
  const remove = event.target.closest("[data-wishlist-remove]");
  const choose = event.target.closest("[data-wishlist-quick]");
  if (remove) { toggleWishlist(Number(remove.dataset.wishlistRemove)); renderWishlistDrawer(); }
  else if (choose) { const id = Number(choose.dataset.wishlistQuick); closeDialog("wishlistBackdrop"); openQuickView(id); }
});

// Demo account
$("#openAccount").addEventListener("click", openAccount);
$("#loginTab").addEventListener("click", () => {
  state.accountMode = "login";
  $("#accountMessage").textContent = "";
  renderAccount();
});
$("#registerTab").addEventListener("click", () => {
  state.accountMode = "register";
  $("#accountMessage").textContent = "";
  renderAccount();
});
$("#accountForm").addEventListener("submit", submitAccount);
$("#logoutButton").addEventListener("click", signOut);

// Newsletter: frontend demo only
$("#newsletterForm").addEventListener("submit", event => {
  event.preventDefault();

  const email = $("#emailInput").value.trim();
  if (!email) return;

  $("#formMessage").textContent =
    "Thank you! Preview only — no email has been sent or stored.";

  $("#newsletterForm").reset();
});

// Pincode validation checks format only, not real courier availability.
$("#pincodeForm").addEventListener("submit", event => {
  event.preventDefault();

  const pincode = $("#pincodeInput").value.trim();
  const message = $("#pincodeMessage");

  if (!/^[1-9][0-9]{5}$/.test(pincode)) {
    message.textContent = "Enter a valid six-digit pincode format.";
    return;
  }

  message.textContent =
    "Format looks correct. Live delivery serviceability is not connected yet.";
});

// WhatsApp only opens when the owner adds a verified number.
function openWhatsApp() {
  if (!WHATSAPP_NUMBER) {
    toast("Add the client's verified WhatsApp number in script.js first.");
    return;
  }

  const text = encodeURIComponent("Hi AmaanTrader! I want to buy a jacket. Please share available styles, sizes and delivery details.");
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank", "noopener,noreferrer");
}

$("#whatsappChat").addEventListener("click", openWhatsApp);
$("#footerWhatsApp").addEventListener("click", openWhatsApp);

// Social links
$$("[data-social]").forEach(link => {
  link.addEventListener("click", event => {
    const url = SOCIAL_LINKS[link.dataset.social];

    if (!url) {
      event.preventDefault();
      toast(`Add the verified ${link.dataset.social} URL in script.js first.`);
      return;
    }

    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  });
});

// Header scroll effects and back-to-top
const header = $("#siteHeader");
const backToTop = $("#backToTop");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
  backToTop.classList.toggle("visible", window.scrollY > 450);
}, { passive: true });

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Footer year
$("#year").textContent = String(new Date().getFullYear());

/* ---------------- Jacket Lab rotating edit ---------------- */
let jacketLabItems = [];
let jacketLabIndex = 0;
let jacketLabTimer = null;

function renderJacketLab() {
  const image = $("#jacketLabImage");
  if (!image || !state.products.length) return;
  const categoryMap = [
    { label: "LEATHER / THE EDGE", test: p => /biker|racer|leather/i.test(`${p.name} ${p.category}`) },
    { label: "DENIM / THE CLASSIC", test: p => /denim/i.test(`${p.name} ${p.category}`) },
    { label: "BOMBER / OFF DUTY", test: p => /bomber/i.test(`${p.name} ${p.category}`) },
    { label: "VARSITY / THE STATEMENT", test: p => /varsity/i.test(`${p.name} ${p.category}`) }
  ];
  jacketLabItems = categoryMap.map(group => {
    const matches = state.products.filter(group.test);
    return matches.length ? { ...matches[Math.floor(Math.random() * matches.length)], labLabel: group.label } : null;
  }).filter(Boolean);
  if (!jacketLabItems.length) return;
  jacketLabIndex = Math.floor(Math.random() * jacketLabItems.length);
  const controls = $("#jacketLabControls");
  controls.innerHTML = jacketLabItems.map((item, index) => `<button type="button" data-lab-index="${index}" aria-label="Show ${escapeHTML(item.category)} jacket" aria-pressed="false">0${index + 1}</button>`).join("");
  showJacketLabItem();
  if (jacketLabTimer) clearInterval(jacketLabTimer);
  jacketLabTimer = setInterval(() => { jacketLabIndex = (jacketLabIndex + 1) % jacketLabItems.length; showJacketLabItem(); }, 5600);
}

function showJacketLabItem() {
  const item = jacketLabItems[jacketLabIndex];
  if (!item) return;
  const image = $("#jacketLabImage");
  const selectedColor = item.colors?.[0] || "";
  const candidates = [
    item.colorImages?.[selectedColor],
    item.image,
    ...(Array.isArray(item.galleryViews) ? item.galleryViews.map(view => view?.src) : []),
    ...(Array.isArray(item.images) ? item.images : [])
  ].filter((src, index, all) => typeof src === "string" && src && all.indexOf(src) === index && src !== "assets/jacket-placeholder.svg");
  let nextCandidate = 0;
  image.onerror = () => {
    const next = candidates[nextCandidate++];
    if (next) {
      if (next === image.src || next === image.currentSrc) { image.onerror(); return; }
      image.src = next;
      return;
    }
    image.onerror = null;
    image.src = "assets/jacket-placeholder.svg";
  };
  image.src = candidates[0] || "assets/jacket-placeholder.svg";
  nextCandidate = 1;
  image.alt = `${item.name} in ${selectedColor || "available colour"}, isolated jacket product reference photo`;
  $("#jacketLabCategory").textContent = item.labLabel || `${item.category.toUpperCase()} / THE EDIT`;
  $("#jacketLabName").textContent = item.name;
  $("#jacketLabPrice").textContent = priceLabel(item);
  $("#jacketLabLink").href = productURL(item);
  $("#jacketLabDisplay").classList.remove("lab-changing");
  void $("#jacketLabDisplay").offsetWidth;
  $("#jacketLabDisplay").classList.add("lab-changing");
  $$("[data-lab-index]").forEach(button => {
    const active = Number(button.dataset.labIndex) === jacketLabIndex;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

$("#jacketLabControls").addEventListener("click", event => {
  const button = event.target.closest("[data-lab-index]");
  if (!button) return;
  jacketLabIndex = Number(button.dataset.labIndex);
  showJacketLabItem();
});

/* ---------------- PIN-code lookup for checkout address ---------------- */
async function lookupCheckoutPincode() {
  const pin = $("#checkoutPincode").value.trim();
  const button = $("#lookupPincodeButton");
  const hint = $(".pin-lookup-hint");
  if (!/^[1-9][0-9]{5}$/.test(pin)) {
    hint.textContent = "Enter a valid 6-digit Indian PIN code first.";
    $("#checkoutPincode").focus();
    return;
  }
  button.disabled = true;
  button.textContent = "FINDING…";
  hint.textContent = "Looking up district and state…";
  try {
    const place = await apiRequest(`/api/pincode/${encodeURIComponent(pin)}`, { method: "GET", headers: {} });
    if ($("#checkoutPincode").value.trim() !== pin) return;
    $("#checkoutCity").value = place.city || place.district || "";
    $("#checkoutState").value = place.state || "";
    hint.textContent = [place.postOffice, place.district, place.state].filter(Boolean).join(" · ");
  } catch (error) {
    hint.textContent = `${error.message} You can enter city and state manually.`;
  } finally {
    button.disabled = false;
    button.textContent = "FIND PIN";
  }
}
$("#lookupPincodeButton")?.addEventListener("click", lookupCheckoutPincode);
$("#checkoutPincode")?.addEventListener("input", () => {
  const pin = $("#checkoutPincode").value.trim();
  if (/^[1-9][0-9]{5}$/.test(pin)) lookupCheckoutPincode();
  else $(".pin-lookup-hint").textContent = "Enter your PIN to fill city and state.";
});

/* ---------------- Checkout / server-backed order request ---------------- */
function quoteCart() {
  const sub = subtotal();
  const discount = discountAmount();
  const shipping = sub === 0 || sub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { subtotal: sub, discount, shipping, total: Math.max(0, sub - discount) + shipping };
}

function renderCheckoutSummary() {
  const quote = quoteCart();
  $("#checkoutSummarySubtotal").textContent = money(quote.subtotal);
  $("#checkoutSummaryDiscount").textContent = `−${money(quote.discount)}`;
  $("#checkoutSummaryDiscountRow").hidden = quote.discount === 0;
  $("#checkoutSummaryShipping").textContent = quote.shipping ? money(quote.shipping) : "Free (demo threshold)";
  $("#checkoutSummaryTotal").textContent = money(quote.total);
}

function openCheckout() {
  if (!state.cart.length) { toast("Your bag is empty. Add a jacket first."); return; }
  $("#checkoutStatus").textContent = "";
  renderCheckoutSummary();
  if (state.profile) {
    $("#checkoutName").value = state.profile.name || "";
    $("#checkoutEmail").value = state.profile.email || "";
  }
  closeCart();
  openDialog("checkoutBackdrop", "#checkoutModal");
}

function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise(resolve => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}
function openRazorpayPayment(config, internalOrderId) {
  return new Promise(async (resolve, reject) => {
    const loaded = await loadRazorpayScript();
    if (!loaded || !window.Razorpay) return reject(new Error("The secure payment window could not load. Your order is saved but payment is pending."));
    let completed = false;
    const checkout = new window.Razorpay({
      key: config.keyId,
      order_id: config.orderId,
      amount: config.amount,
      currency: config.currency || "INR",
      name: config.name || "AMAANTRADER",
      description: config.description || "AmaanTrader order",
      prefill: config.prefill || {},
      notes: config.notes || {},
      theme: { color: "#e85b2a" },
      handler: async payment => {
        try {
          const verified = await apiRequest("/api/payments/razorpay/verify", {
            method: "POST",
            body: JSON.stringify({ orderId: internalOrderId, razorpay_order_id: payment.razorpay_order_id, razorpay_payment_id: payment.razorpay_payment_id, razorpay_signature: payment.razorpay_signature })
          });
          completed = true;
          resolve(verified.order);
        } catch (error) { reject(error); }
      },
      modal: { ondismiss: () => { if (!completed) reject(new Error(`Payment window closed. Order ${internalOrderId} is saved as awaiting payment.`)); } }
    });
    checkout.on("payment.failed", response => {
      const reason = response?.error?.description || "Payment did not complete.";
      reject(new Error(`${reason} Order ${internalOrderId} is still awaiting payment.`));
    });
    checkout.open();
  });
}

async function submitCheckout(event) {
  event.preventDefault();
  if (!state.cart.length) { $("#checkoutStatus").textContent = "Your bag is empty."; return; }
  const submit = $("#placeOrderButton");
  const status = $("#checkoutStatus");
  const form = event.currentTarget;
  const customer = {
    name: $("#checkoutName").value.trim(),
    email: $("#checkoutEmail").value.trim(),
    phone: $("#checkoutPhone").value.trim(),
    pincode: $("#checkoutPincode").value.trim(),
    address: $("#checkoutAddress").value.trim(),
    city: $("#checkoutCity").value.trim(),
    region: $("#checkoutState").value.trim()
  };
  const items = state.cart.map(item => ({ id: item.id, size: item.size, color: item.color, quantity: item.quantity }));
  submit.disabled = true;
  submit.textContent = "SENDING REQUEST…";
  status.textContent = "Checking the order with the storefront backend…";
  try {
    const result = await apiRequest("/api/orders", {
      method: "POST",
      headers: state.profile?.token ? { Authorization: `Bearer ${state.profile.token}` } : {},
      body: JSON.stringify({ customer, items, coupon: state.coupon })
    });
    let paid = false;
    if (result.razorpay) {
      status.textContent = "Your order is saved. Opening the secure payment window…";
      await openRazorpayPayment(result.razorpay, result.order.orderId);
      paid = true;
    }
    state.cart = [];
    state.coupon = "";
    writeStorage(STORAGE.cart, state.cart);
    writeStorage(STORAGE.coupon, state.coupon);
    renderCart();
    closeDialog("checkoutBackdrop");
    $("#orderConfirmationId").textContent = result.order.orderId;
    $("#orderSuccessMessage").textContent = paid
      ? `Thanks, ${result.order.customerName}. Your payment was verified and your order is confirmed.`
      : `Thanks, ${result.order.customerName}. Your order request is saved. The store will confirm stock, delivery and payment. No payment was collected by this preview setup.`;
    openDialog("orderSuccessBackdrop");
    form.reset();
  } catch (error) {
    status.textContent = `${error.message} Check the order reference above if the payment window had already opened. Make sure the backend is running.`;
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'CONTINUE SECURELY <span aria-hidden="true">↗</span>';
  }
}

/* ---------------- Load catalogue ---------------- */

async function loadProducts() {
  try {
    const response = await fetch(apiURL("/api/products"), { cache: "no-cache" });

    if (!response.ok) throw new Error("Could not load products.json");

    const data = await response.json();

    if (!Array.isArray(data)) throw new Error("Product catalogue must be an array");

    state.products = data.filter(product =>
      product &&
      Number.isFinite(Number(product.id)) &&
      product.slug &&
      product.name &&
      Number.isFinite(Number(product.price)) &&
      Array.isArray(product.colors) &&
      Array.isArray(product.sizes)
    );

    if (!state.products.length) throw new Error("No valid products found");

    // Drop saved cart/wishlist rows for removed products.
    state.cart = state.cart.filter(item => byId(item.id));
    state.wishlist = state.wishlist.filter(id => byId(id));

    writeStorage(STORAGE.cart, state.cart);
    writeStorage(STORAGE.wishlist, state.wishlist);

    buildFilters();
    renderProducts();
    renderCart();
    renderWishlistDrawer();
    renderJacketLab();

    $("#wishlistCount").textContent = String(state.wishlist.length);
    $("#skeletonGrid").hidden = true;
  } catch (error) {
    console.error(error);

    $("#skeletonGrid").hidden = true;
    $("#productGrid").hidden = true;
    $("#emptyResults").hidden = false;
    $("#emptyResults h3").textContent = "Products could not be loaded.";
    $("#emptyResults p").textContent =
      "Run this folder through VS Code Live Server so the browser can load products.json.";
  }
}

loadProducts().then(() => {
  if (new URLSearchParams(window.location.search).get("cart") === "1") openCart();
});