"use strict";

const product$ = (selector, root = document) => root.querySelector(selector);
const product$$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const PRODUCT_STORAGE = {
  cart: "amaantrader-pro-cart",
  wishlist: "amaantrader-pro-wishlist",
  recent: "amaantrader-pro-recent"
};

const PRODUCT_COLOURS = {
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

const PRODUCT_WHATSAPP_NUMBER = String(window.AMAANTRADER_CONFIG?.whatsappNumber || "").replace(/\D/g, "");

let currentProduct = null;
let currentSize = "";
let currentColor = "";
let currentImage = 0;
let previousFocus = null;

function readProductStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function writeProductStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    productToast("Browser storage is unavailable.");
  }
}

function productMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function productPriceFor(product, size = "") {
  const value = Number(product?.sizePrices?.[size]);
  if (size && Number.isSafeInteger(value) && value >= 0) return value;
  return Number(product?.price) || 0;
}

function productStartingPrice(product) {
  const values = (product?.sizes || []).map(size => productPriceFor(product, size));
  return values.length ? Math.min(...values) : (Number(product?.price) || 0);
}

function productPriceLabel(product) {
  return `From ${productMoney(productStartingPrice(product))}`;
}

function updateProductPrice() {
  if (!currentProduct) return;
  const price = currentSize ? productPriceFor(currentProduct, currentSize) : productStartingPrice(currentProduct);
  const priceEl = product$("#productPrice");
  if (priceEl) priceEl.textContent = currentSize ? productMoney(price) : productPriceLabel(currentProduct);
  const note = product$(".product-price-note");
  if (note) note.textContent = currentSize ? `${currentSize} size price · final stock/quality confirmation required` : "₹700–₹1,500 · choose a size to see its exact price";
  const addButton = product$("#productAddButton");
  if (addButton) addButton.innerHTML = currentSize
    ? `ADD TO BAG · ${productMoney(price)} <span aria-hidden="true">↗</span>`
    : `CHOOSE SIZE · FROM ${productMoney(price)} <span aria-hidden="true">↗</span>`;
  const sticky = product$("#stickyProductActions span");
  if (sticky) sticky.textContent = `${currentProduct.name} · ${currentSize ? productMoney(price) : productPriceLabel(currentProduct)}`;
}

function productEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

let productToastTimer;

function productToast(message) {
  const toast = product$("#productToast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("is-visible");

  clearTimeout(productToastTimer);
  productToastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3000);
}

function productImageList(product) {
  const list = [];
  const seen = new Set();
  const add = (src, label, kind = "angle") => {
    if (typeof src !== "string" || !src.trim() || seen.has(src)) return;
    seen.add(src);
    list.push({ src, label, kind });
  };
  (Array.isArray(product.galleryViews) ? product.galleryViews : []).forEach(view => {
    if (view && typeof view === "object") add(view.src, view.label || "Product view", view.kind || "angle");
  });
  (Array.isArray(product.images) ? product.images : []).forEach((src, index) => {
    const labels = Array.isArray(product.galleryLabels) ? product.galleryLabels : [];
    add(src, labels[index] || (index === 0 ? "Product view" : `Gallery view ${index + 1}`), "angle");
  });
  Object.entries(product.colorImages || {}).forEach(([colour, src]) => add(src, `${colour} colour view`, "colour"));
  add(product.image, "Product view", "angle");
  if (product.explodedView) add(product.explodedView, "Exploded view", "exploded");
  if (!list.length) add("../../assets/jacket-placeholder.svg", "Product placeholder", "fallback");
  return list;
}

function productColourHex(colour) {
  return PRODUCT_COLOURS[colour] || "#777777";
}

function isProductWishlisted(productId) {
  return readProductStorage(PRODUCT_STORAGE.wishlist, [])
    .includes(Number(productId));
}

function setProductDialog(open) {
  const dialog = product$("#productZoomBackdrop");
  if (!dialog) return;

  if (open) {
    previousFocus = document.activeElement;
    dialog.inert = false;
    dialog.setAttribute("aria-hidden", "false");
    dialog.classList.add("is-open");
    product$(".zoom-dialog", dialog)?.focus();
  } else {
    dialog.classList.remove("is-open");
    dialog.inert = true;
    dialog.setAttribute("aria-hidden", "true");

    if (previousFocus && document.contains(previousFocus)) {
      previousFocus.focus();
    }
  }
}

function renderProductGallery() {
  const images = productImageList(currentProduct);
  const mainImage = product$("#productMainImage");

  currentImage = Math.min(currentImage, images.length - 1);
  const activeView = images[currentImage];
  mainImage.onerror = () => {
    mainImage.onerror = null;
    mainImage.src = "../../assets/jacket-placeholder.svg";
  };
  mainImage.src = activeView.src;
  mainImage.alt = `${currentProduct.name} — ${activeView.label}`;

  product$("#productThumbnails").innerHTML = images.map((view, index) => `
    <button type="button"
            data-product-image-index="${index}"
            data-gallery-kind="${productEscape(view.kind)}"
            class="${index === currentImage ? "active" : ""}"
            aria-label="View ${productEscape(view.label)}"
            title="${productEscape(view.label)}"
            aria-pressed="${index === currentImage}">
      <img src="${productEscape(view.src)}" alt="" loading="lazy" onerror="this.onerror=null;this.src='../../assets/jacket-placeholder.svg'">
      <span>${productEscape(view.label)}</span>
    </button>
  `).join("");
}

function changeProductImage(index) {
  const images = productImageList(currentProduct);
  if (!images[index]) return;

  currentImage = index;
  renderProductGallery();
}

function renderProductColours() {
  product$("#productColourOptions").innerHTML =
    currentProduct.colors.map(colour => `
      <button type="button"
              data-product-colour="${productEscape(colour)}"
              class="${colour === currentColor ? "active" : ""}"
              style="--swatch:${productColourHex(colour)}"
              aria-label="${productEscape(colour)}"
              aria-pressed="${colour === currentColor}"
              title="${productEscape(colour)}">
      </button>
    `).join("");

  product$("#selectedProductColour").textContent = currentColor;
  const selected = product$("#productSelectedVariant");
  if (selected) selected.textContent = `${currentColor}${currentSize ? ` · ${currentSize}` : " · choose a size"}`;
}

function renderProductSizes() {
  product$("#productSizeOptions").innerHTML =
    currentProduct.sizes.map(size => `
      <button type="button"
              data-product-size="${productEscape(size)}"
              class="${size === currentSize ? "active" : ""}"
              aria-pressed="${size === currentSize}">
        <span>${productEscape(size)}</span><small>${productMoney(productPriceFor(currentProduct, size))}</small>
      </button>
    `).join("");
  const sizeSummary = product$("#selectedProductSize");
  if (sizeSummary) sizeSummary.textContent = currentSize || "Not selected";
  const variantSummary = product$("#productSelectedVariant");
  if (variantSummary) variantSummary.textContent = `${currentColor || "Colour"}${currentSize ? ` · ${currentSize}` : " · choose a size"}`;
}

function selectProductColour(colour) {
  if (!currentProduct.colors.includes(colour)) return;

  currentColor = colour;
  product$("#selectedProductColour").textContent = colour;
  renderProductColours();

  // If the catalogue has specific photos for this colour, use the first.
  const colorImage = currentProduct.colorImages?.[colour];

  if (colorImage) {
    const images = productImageList(currentProduct);
    const index = images.findIndex(view => view.src === colorImage);

    if (index >= 0) {
      changeProductImage(index);
    } else {
      product$("#productMainImage").src = colorImage;
      product$("#productMainImage").alt =
        `${currentProduct.name} in ${colour}`;
    }
  }
}

function selectProductSize(size) {
  if (!currentProduct.sizes.includes(size)) return;

  currentSize = size;
  product$("#productSizeError").textContent = "";
  renderProductSizes();
  updateProductPrice();
}

function renderRelatedProducts() {
  const relatedSlugs = currentProduct.related || [];
  const related = relatedSlugs
    .map(slug => window.productCatalogue.find(product => product.slug === slug))
    .filter(Boolean)
    .slice(0, 4);

  product$("#relatedProducts").innerHTML = related.map(product => `
    <article class="related-card">
      <a href="../${encodeURIComponent(product.slug)}/"
         aria-label="View ${productEscape(product.name)}">
        <img src="${productEscape(product.image)}"
             alt="${productEscape(product.name)}"
             loading="lazy"
             width="600"
             height="800">
        <h3>${productEscape(product.name)}</h3>
        <p>${productPriceLabel(product)}</p>
      </a>
    </article>
  `).join("");

  const recent = readProductStorage(PRODUCT_STORAGE.recent, []);
  const recentProducts = recent
    .filter(id => Number(id) !== currentProduct.id)
    .map(id => window.productCatalogue.find(product => product.id === Number(id)))
    .filter(Boolean)
    .slice(0, 4);

  product$("#recentlyViewed").innerHTML = recentProducts.map(product => `
    <article class="related-card">
      <a href="../${encodeURIComponent(product.slug)}/">
        <img src="${productEscape(product.image)}"
             alt="${productEscape(product.name)}"
             loading="lazy"
             width="600"
             height="800">
        <h3>${productEscape(product.name)}</h3>
        <p>${productPriceLabel(product)}</p>
      </a>
    </article>
  `).join("");

  product$("#recentlyViewedSection").hidden = recentProducts.length === 0;
}

function rememberProduct() {
  const recent = readProductStorage(PRODUCT_STORAGE.recent, [])
    .map(Number)
    .filter(id => id !== currentProduct.id);

  recent.unshift(currentProduct.id);
  writeProductStorage(PRODUCT_STORAGE.recent, recent.slice(0, 8));
}

function updateProductWishlist() {
  const button = product$("#productWishlistButton");
  const isSaved = isProductWishlisted(currentProduct.id);

  button.textContent = isSaved ? "♥ Saved to wishlist" : "♡ Add to wishlist";
  button.setAttribute("aria-pressed", String(isSaved));
}

function toggleProductWishlist() {
  const wishlist = readProductStorage(PRODUCT_STORAGE.wishlist, []);
  const id = Number(currentProduct.id);
  const index = wishlist.indexOf(id);

  if (index >= 0) {
    wishlist.splice(index, 1);
    productToast("Removed from your wishlist.");
  } else {
    wishlist.push(id);
    productToast("Added to your wishlist.");
  }

  writeProductStorage(PRODUCT_STORAGE.wishlist, wishlist);
  updateProductWishlist();
}

function addProductToCart() {
  if (!currentProduct) return;

  if (!currentSize) {
    product$("#productSizeError").textContent =
      "Please select a size before adding to your bag.";
    product$("#productSizeOptions").scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
    return;
  }

  if (currentProduct.stock === 0) {
    productToast("This sample product is marked sold out.");
    return;
  }

  const cart = readProductStorage(PRODUCT_STORAGE.cart, []);
  const existing = cart.find(item =>
    Number(item.id) === Number(currentProduct.id) &&
    item.size === currentSize &&
    item.color === currentColor
  );

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      id: Number(currentProduct.id),
      size: currentSize,
      color: currentColor,
      quantity: 1
    });
  }

  writeProductStorage(PRODUCT_STORAGE.cart, cart);
  productToast(`${currentProduct.name} added to your bag.`);
  updateProductCartCount();
}

function updateProductCartCount() {
  const cart = readProductStorage(PRODUCT_STORAGE.cart, []);
  const total = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const count = product$("#productCartCount");
  if (count) count.textContent = String(total);
}

function checkProductPincode(event) {
  event.preventDefault();

  const value = product$("#productPincode").value.trim();
  const output = product$("#productPincodeMessage");

  if (!/^[1-9][0-9]{5}$/.test(value)) {
    output.textContent = "Enter a valid six-digit Indian pincode format.";
    return;
  }

  output.textContent =
    "Pincode format looks correct. Live courier serviceability has not been connected.";
}

function productWhatsApp() {
  if (!PRODUCT_WHATSAPP_NUMBER) {
    productToast("Add the verified business WhatsApp number in product.js.");
    return;
  }

  const text = encodeURIComponent(
    `Hi AmaanTrader! I want to buy ${currentProduct.name}. Colour: ${currentColor || "not selected"}; size: ${currentSize || "not selected"}; listed price: ${currentSize ? productMoney(productPriceFor(currentProduct, currentSize)) : productPriceLabel(currentProduct)}. Please confirm availability and delivery.`
  );

  window.open(
    `https://wa.me/${PRODUCT_WHATSAPP_NUMBER}?text=${text}`,
    "_blank",
    "noopener,noreferrer"
  );
}

function openProduct3D() {
  const backdrop = product$("#product3DBackdrop");
  if (!backdrop || !currentProduct) { productToast("3D-style preview is unavailable on this page."); return; }
  const image = product$("#product3DImage");
  image.src = product$("#productMainImage").src;
  image.alt = `${currentProduct.name} — interactive image-based studio preview`;
  product$("#product3DName").textContent = currentProduct.name;
  product$("#product3DHint").textContent = productImageList(currentProduct).length > 1
    ? "Drag to tilt the studio view, or use the image selectors to compare available product photos."
    : "Drag to tilt this image-based preview. Add a genuine 3D model or more product angles for a true 360° view.";
  backdrop.inert = false;
  backdrop.setAttribute("aria-hidden", "false");
  backdrop.classList.add("is-open");
  product$("#product3DStage")?.focus();
}

function closeProduct3D() {
  const backdrop = product$("#product3DBackdrop");
  if (!backdrop) return;
  backdrop.classList.remove("is-open");
  backdrop.inert = true;
  backdrop.setAttribute("aria-hidden", "true");
}

function rotateProduct3D(event) {
  const stage = product$("#product3DStage");
  if (!stage || event.pointerType === "touch") return;
  const rect = stage.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  stage.style.setProperty("--studio-rotate-y", `${x * 24}deg`);
  stage.style.setProperty("--studio-rotate-x", `${-y * 10}deg`);
}

function resetProduct3D() {
  const stage = product$("#product3DStage");
  if (!stage) return;
  stage.style.setProperty("--studio-rotate-y", "0deg");
  stage.style.setProperty("--studio-rotate-x", "0deg");
}

function cycleProduct3DImage(direction) {
  const images = productImageList(currentProduct);
  if (images.length < 2) { productToast("Add front, back and detail photos to enable multi-angle viewing."); return; }
  const next = (currentImage + direction + images.length) % images.length;
  changeProductImage(next);
  product$("#product3DImage").src = images[next].src;
}

function showStickyAddBar() {
  const bar = product$("#stickyProductActions");
  if (!bar) return;

  const addButton = product$("#productAddButton");

  if (!addButton) return;

  const bounds = addButton.getBoundingClientRect();
  bar.classList.toggle("visible", bounds.bottom < 0);
}

function renderProductPage(product) {
  currentProduct = product;
  currentColor = product.colors[0] || "";
  currentSize = "";

  document.title = `${product.name} | AmaanTrader`;

  product$("#productBreadcrumbName").textContent = product.name;
  product$("#productCategory").textContent = `${product.category} / THE EDIT`;
  product$("#productName").textContent = product.name;
  product$("#productDescription").textContent = product.description || "";
  const quality = product$("#productQuality");
  if (quality) quality.textContent = product.qualityNote || "Inspect the fabric, seams, lining and closures on a physical sample. The exact material grade has not been verified.";
  product$("#productFit").textContent = product.fit || "See garment details";
  product$("#productFabric").textContent =
    product.fabric || "Confirm fabric composition with supplier";
  product$("#productCare").textContent =
    product.care || "Follow the garment care label";

  const stock = product.stock;
  product$("#productStock").textContent = stock === 0
    ? "Marked sold out in sample catalogue"
    : Number.isInteger(stock)
      ? stock > 0 ? `${stock} sample units listed` : "Stock status not confirmed"
      : "Live stock not connected";

  product$("#productStock").classList.toggle("is-sold-out", stock === 0);
  product$("#productDemoMessage").hidden = false;

  renderProductGallery();
  renderProductColours();
  renderProductSizes();
  const selectedColourImage = product.colorImages?.[currentColor];
  const selectedColourIndex = productImageList(product).findIndex(view => view.src === selectedColourImage);
  if (selectedColourIndex >= 0) changeProductImage(selectedColourIndex);
  updateProductPrice();
  renderRelatedProducts();
  updateProductWishlist();
  updateProductCartCount();
  rememberProduct();
}

/* ---------------- Event listeners ---------------- */

product$("#productThumbnails").addEventListener("click", event => {
  const button = event.target.closest("[data-product-image-index]");
  if (button) changeProductImage(Number(button.dataset.productImageIndex));
});

product$("#productColourOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-product-colour]");
  if (button) selectProductColour(button.dataset.productColour);
});

product$("#productSizeOptions").addEventListener("click", event => {
  const button = event.target.closest("[data-product-size]");
  if (button) selectProductSize(button.dataset.productSize);
});

product$("#productAddButton").addEventListener("click", addProductToCart);
product$("#productWishlistButton").addEventListener("click", toggleProductWishlist);

product$("#productMainImageButton").addEventListener("click", () => {
  product$("#zoomedProductImage").src = product$("#productMainImage").src;
  product$("#zoomedProductImage").alt = product$("#productMainImage").alt;
  setProductDialog(true);
});

product$("#closeProductZoom").addEventListener("click", () => setProductDialog(false));

product$("#productZoomBackdrop").addEventListener("click", event => {
  if (event.target === product$("#productZoomBackdrop")) {
    setProductDialog(false);
  }
});

product$("#productPincodeForm").addEventListener("submit", checkProductPincode);
product$("#productWhatsAppButton").addEventListener("click", productWhatsApp);

const productMenuToggle = product$("#productMenuToggle");
if (productMenuToggle) productMenuToggle.addEventListener("click", () => {
  const mobileMenu = product$("#productMobileMenu");
  if (!mobileMenu) return;
  mobileMenu.classList.toggle("is-open");
  productMenuToggle.setAttribute("aria-expanded", String(mobileMenu.classList.contains("is-open")));
});

window.addEventListener("scroll", showStickyAddBar, { passive: true });

product$("#stickyProductAdd").addEventListener("click", () => {
  product$("#productAddButton").scrollIntoView({ behavior: "smooth", block: "center" });
  product$("#productSizeOptions").classList.add("highlight-selection");
  setTimeout(() => product$("#productSizeOptions").classList.remove("highlight-selection"), 1200);
});


const product3DButton = product$("#product3DButton");
if (product3DButton) product3DButton.addEventListener("click", openProduct3D);
const close3DButton = product$("#closeProduct3D");
if (close3DButton) close3DButton.addEventListener("click", closeProduct3D);
const product3DBackdrop = product$("#product3DBackdrop");
if (product3DBackdrop) product3DBackdrop.addEventListener("click", event => { if (event.target === product3DBackdrop) closeProduct3D(); });
const product3DStage = product$("#product3DStage");
if (product3DStage) {
  product3DStage.addEventListener("pointermove", rotateProduct3D);
  product3DStage.addEventListener("pointerleave", resetProduct3D);
}
product$("#product3DPrev")?.addEventListener("click", () => cycleProduct3DImage(-1));
product$("#product3DNext")?.addEventListener("click", () => cycleProduct3DImage(1));

// Escape key closes the zoom and studio dialogs.
document.addEventListener("keydown", event => {
  if (event.key === "Escape") { setProductDialog(false); closeProduct3D(); }
});

// The HTML body has a unique slug generated from products.json.
async function initProductPage() {
  try {
    const response = await fetch("/api/products", { cache: "no-cache" });
    if (!response.ok) throw new Error("Could not load the catalogue.");

    const catalogue = await response.json();
    window.productCatalogue = catalogue;

    const slug = document.body.dataset.productSlug;
    const product = catalogue.find(item => item.slug === slug);

    if (!product) throw new Error("Product not found.");

    renderProductPage(product);
    product$("#productLoading").hidden = true;
    product$("#productContent").hidden = false;
  } catch (error) {
    console.error(error);
    product$("#productLoading").textContent =
      "This product could not be loaded. Run the site through Live Server and check products.json.";
  }
}

initProductPage();