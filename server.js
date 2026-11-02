"use strict";

/*
 * AmaanTrader starter backend.
 * Security boundary: browser-submitted prices/totals are NEVER trusted.
 * The server calculates each order from its own products.json catalogue.
 * This is a safer local starter, not a substitute for a production database,
 * HTTPS deployment, payment provider, or independent security review.
 */
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = fs.realpathSync(__dirname);
function loadEnvFile() {
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/i);
    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    process.env[match[1]] = value;
  }
}
loadEnvFile();
const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";
const MAX_BODY_BYTES = 64 * 1024;
const SESSION_MS = 1000 * 60 * 60 * 24 * 7;
const SHIPPING_THRESHOLD = 2999;
const SHIPPING_FEE = 99;

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const DATA_FILES = {
  products: path.join(ROOT, "products.json"),
  orders: path.join(ROOT, "orders.json"),
  users: path.join(ROOT, "users.json"),
  sessions: path.join(ROOT, "sessions.json"),
  webhookEvents: path.join(ROOT, "webhook-events.json")
};
const PRIVATE_FILES = new Set([
  "orders.json", "users.json", "sessions.json", "webhook-events.json", "products.json", "server.js", "package.json",
  "package-lock.json", "npm-shrinkwrap.json", ".env", ".gitignore", "README.md",
  "SECURITY.md", "SECURITY-CHECK-REPORT.md", "generate_pages.py"
]);
const MIME = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon"
};
const requests = new Map();
let requestCounter = 0;

for (const name of ["orders", "users", "sessions", "webhookEvents"]) {
  if (!fs.existsSync(DATA_FILES[name])) {
    fs.writeFileSync(DATA_FILES[name], "[]\n", { mode: 0o600, flag: "wx" });
  }
  try { fs.chmodSync(DATA_FILES[name], 0o600); } catch { /* Some filesystems ignore POSIX mode bits. */ }
}

function readJSON(file, fallback = []) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed;
  } catch (error) {
    if (fallback !== undefined) return fallback;
    throw error;
  }
}
function readPrivateJSON(file) {
  // Fail closed for accounts/sessions/orders rather than silently overwriting corrupted data.
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!Array.isArray(value)) throw new Error("Private data store has an invalid format.");
  return value;
}
function writeJSON(file, value) {
  const temp = `${file}.${process.pid}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  try {
    fs.writeFileSync(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    fs.renameSync(temp, file);
    try { fs.chmodSync(file, 0o600); } catch { /* Best-effort permissions on non-POSIX hosts. */ }
  } finally {
    try { if (fs.existsSync(temp)) fs.unlinkSync(temp); } catch { /* Temporary-file cleanup is best effort. */ }
  }
}
function commonHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Content-Security-Policy": "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  };
}
function send(res, status, payload, extraHeaders = {}) {
  if (res.writableEnded) return;
  res.writeHead(status, {
    ...commonHeaders(),
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...extraHeaders
  });
  res.end(JSON.stringify(payload));
}
function safeError(res, status, message) {
  return send(res, status, { error: message });
}
function rateLimit(req, res, bucket, max = 20, windowMs = 60_000) {
  const ip = String(req.socket.remoteAddress || "unknown").replace(/^::ffff:/, "");
  const key = `${bucket}:${ip}`;
  const now = Date.now();
  const entry = requests.get(key);
  if (!entry || now >= entry.reset) requests.set(key, { count: 1, reset: now + windowMs });
  else entry.count += 1;

  // Bound stale IP entries so arbitrary source addresses cannot grow this map forever.
  requestCounter += 1;
  if (requestCounter % 100 === 0 || requests.size > 5000) {
    for (const [storedKey, value] of requests) if (now >= value.reset) requests.delete(storedKey);
  }
  const current = requests.get(key);
  if (current.count > max) {
    send(res, 429, { error: "Too many requests. Please try again shortly." }, { "Retry-After": String(Math.ceil((current.reset - now) / 1000)) });
    return false;
  }
  return true;
}
function sameOriginRequest(req) {
  const origin = req.headers.origin;
  if (!origin) return true; // No cookie-based auth; non-browser clients may omit Origin.
  try {
    const parsed = new URL(origin);
    const host = String(req.headers.host || "").toLowerCase();
    return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.host.toLowerCase() === host;
  } catch {
    return false;
  }
}
async function readBody(req, res, maxBytes = MAX_BODY_BYTES) {
  const contentType = String(req.headers["content-type"] || "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") {
    send(res, 415, { error: "Content-Type must be application/json." });
    throw new Error("Unsupported content type");
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on("data", chunk => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        done = true;
        send(res, 413, { error: "Request body is too large." });
        req.resume();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (done) return;
      done = true;
      if (!size) return resolve({});
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("JSON body must be an object.");
        resolve(body);
      } catch {
        send(res, 400, { error: "Request body must be a valid JSON object." });
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", error => {
      if (!done) { done = true; reject(error); }
    });
  });
}
async function readRawBody(req, maxBytes = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let done = false;
    req.on("data", chunk => {
      if (done) return;
      size += chunk.length;
      if (size > maxBytes) {
        done = true;
        req.resume();
        reject(new Error("Webhook body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => { if (!done) { done = true; resolve(Buffer.concat(chunks)); } });
    req.on("error", error => { if (!done) { done = true; reject(error); } });
  });
}
function timingSafeHexEqual(actual, expected) {
  if (typeof actual !== "string" || typeof expected !== "string" || !/^[a-f0-9]+$/i.test(actual) || actual.length !== expected.length) return false;
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function formatOrderNotification(order) {
  const lines = (order.items || []).map(item => `• ${item.name} / ${item.color} / ${item.size} × ${item.quantity} — ₹${item.lineTotal}`).join("\n");
  return [
    `Order: ${order.orderId}`,
    `Customer: ${order.customer?.name || order.customerName || "—"}`,
    `Phone: ${order.customer?.phone || "—"}`,
    `Email: ${order.customer?.email || "—"}`,
    `Delivery: ${[order.customer?.address, order.customer?.city, order.customer?.region, order.customer?.pincode].filter(Boolean).join(", ") || "—"}`,
    `Items:\n${lines || "—"}`,
    `Total: ₹${order.total ?? "—"}`,
    `Order status: ${order.status || "—"}`,
    `Payment status: ${order.paymentStatus || "—"}`
  ].join("\n");
}
async function notifyStore(eventTitle, order, extra = "") {
  const message = [`AMAANTRADER — ${eventTitle}`, formatOrderNotification(order), extra].filter(Boolean).join("\n\n");
  const jobs = [];
  const emailTo = String(process.env.STORE_NOTIFICATION_EMAIL || "").trim();
  const resendKey = String(process.env.RESEND_API_KEY || "").trim();
  const emailFrom = String(process.env.EMAIL_FROM || "").trim();
  if (emailTo && resendKey && emailFrom) {
    jobs.push((async () => {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST", headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: emailFrom, to: [emailTo], subject: `[AmaanTrader] ${eventTitle} — ${order.orderId}`, text: message }),
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) throw new Error(`Email provider returned ${response.status}`);
    })());
  }
  const waToken = String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
  const waPhoneId = String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
  const waTo = String(process.env.WHATSAPP_TO || "").replace(/\D/g, "");
  const waVersion = String(process.env.WHATSAPP_GRAPH_VERSION || "").trim();
  const waTemplate = String(process.env.WHATSAPP_TEMPLATE_NAME || "").trim();
  const waLanguage = String(process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US").trim();
  if (waToken && waPhoneId && waTo && waVersion && waTemplate) {
    jobs.push((async () => {
      const response = await fetch(`https://graph.facebook.com/${waVersion}/${waPhoneId}/messages`, {
        method: "POST", headers: { Authorization: `Bearer ${waToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp", to: waTo, type: "template",
          template: { name: waTemplate, language: { code: waLanguage }, components: [{ type: "body", parameters: [{ type: "text", text: message.slice(0, 1024) }] }] }
        }), signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
    })());
  }
  if (!jobs.length) {
    console.warn(`[notifications] ${eventTitle} created, but no notification channel is configured.`);
    return;
  }
  const results = await Promise.allSettled(jobs);
  for (const result of results) if (result.status === "rejected") console.error("[notifications] Delivery failed:", result.reason?.message || "unknown error");
}
function saveOrders(orders) { writeJSON(DATA_FILES.orders, orders); }
function loadOrderById(orders, orderId) { return orders.find(order => order.orderId === orderId); }
async function createRazorpayOrder(order) {
  const keyId = String(process.env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) return null;
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST", headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: order.total * 100, currency: "INR", receipt: order.orderId, notes: { website_order_id: order.orderId } }),
    signal: AbortSignal.timeout(12_000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) throw new Error("The payment gateway could not create an order. Please retry or contact the store.");
  order.status = "AWAITING_PAYMENT";
  order.razorpayOrderId = data.id;
  return { keyId, orderId: data.id, amount: data.amount, currency: data.currency, name: "AMAANTRADER", description: `Order ${order.orderId}`, prefill: { name: order.customer.name, email: order.customer.email, contact: order.customer.phone }, notes: { website_order_id: order.orderId } };
}
function persistOrderUpdate(orders, order) {
  const index = orders.findIndex(item => item.orderId === order.orderId);
  if (index < 0) return false;
  orders[index] = order;
  saveOrders(orders);
  return true;
}
function validEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }
function publicUser(user) { return { name: user.name, email: user.email }; }
function tokenDigest(token) { return crypto.createHash("sha256").update(token).digest("hex"); }
function issueToken(user) {
  const token = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const sessions = readPrivateJSON(DATA_FILES.sessions).filter(s => s.expiresAt > now);
  // Store only a digest of the bearer token; keep compatibility with old sessions while they expire.
  sessions.push({ tokenHash: tokenDigest(token), email: user.email, expiresAt: now + SESSION_MS });
  writeJSON(DATA_FILES.sessions, sessions);
  return token;
}
function userForToken(req) {
  const match = String(req.headers.authorization || "").match(/^Bearer\s+([a-f0-9]{64})$/i);
  if (!match) return null;
  const token = match[1];
  const digest = tokenDigest(token);
  const sessions = readPrivateJSON(DATA_FILES.sessions);
  const session = sessions.find(item => item.expiresAt > Date.now() && (item.tokenHash === digest || item.token === token));
  if (!session) return null;
  return readPrivateJSON(DATA_FILES.users).find(user => user.email === session.email) || null;
}
function passwordHash(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}
function passwordMatches(password, user) {
  try {
    if (!user || typeof user.salt !== "string" || !/^[a-f0-9]{32}$/i.test(user.salt) || typeof user.passwordHash !== "string" || !/^[a-f0-9]{128}$/i.test(user.passwordHash)) return false;
    const candidate = crypto.scryptSync(password, user.salt, 64);
    const known = Buffer.from(user.passwordHash, "hex");
    return candidate.length === known.length && crypto.timingSafeEqual(candidate, known);
  } catch { return false; }
}
function getCatalogue() {
  const products = readJSON(DATA_FILES.products, undefined);
  if (!Array.isArray(products)) throw new Error("The product catalogue is unavailable.");
  return products;
}
function normalizeOrder(body) {
  const customer = body.customer && typeof body.customer === "object" && !Array.isArray(body.customer) ? body.customer : {};
  const name = String(customer.name || "").trim();
  const email = String(customer.email || "").trim().toLowerCase();
  const phone = String(customer.phone || "").replace(/[\s()-]/g, "");
  const pincode = String(customer.pincode || "").trim();
  const address = String(customer.address || "").trim();
  const city = String(customer.city || "").trim();
  const region = String(customer.region || "").trim();
  if (name.length < 2 || name.length > 100) throw new Error("Enter a valid full name.");
  if (!validEmail(email) || email.length > 160) throw new Error("Enter a valid email address.");
  if (!/^\+?[0-9]{10,15}$/.test(phone)) throw new Error("Enter a valid mobile number.");
  if (!/^[1-9][0-9]{5}$/.test(pincode)) throw new Error("Enter a valid six-digit PIN code.");
  if (address.length < 8 || address.length > 500) throw new Error("Enter a more complete delivery address.");
  if (!city || city.length > 100 || !region || region.length > 100) throw new Error("Enter your city and state.");

  const catalogue = getCatalogue();
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) throw new Error("Your bag has no valid items.");
  const normalized = new Map();
  for (const input of body.items) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("A cart item is invalid.");
    const id = Number(input.id);
    const product = catalogue.find(p => Number(p.id) === id);
    const quantity = Number(input.quantity);
    const size = String(input.size || "");
    const color = String(input.color || "");
    if (!product) throw new Error("A jacket in your bag is no longer listed.");
    if (!Array.isArray(product.sizes) || !product.sizes.includes(size)) throw new Error(`Choose a valid size for ${product.name}.`);
    if (!Array.isArray(product.colors) || !product.colors.includes(color)) throw new Error(`Choose a valid colour for ${product.name}.`);
    const unitPrice = Number(product.sizePrices?.[size] ?? product.price);
    if (!Number.isSafeInteger(unitPrice) || unitPrice < 700 || unitPrice > 1500) throw new Error(`The ${size} price for ${product.name} must be configured between ₹700 and ₹1,500.`);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw new Error("Each jacket quantity must be from 1 to 10.");
    if (product.stock === 0) throw new Error(`${product.name} is marked sold out in the sample catalogue.`);

    const key = `${product.id}|${size}|${color}`;
    const existing = normalized.get(key);
    const combinedQuantity = (existing?.quantity || 0) + quantity;
    if (combinedQuantity > 10) throw new Error("Maximum quantity is 10 per jacket, size and colour.");
    // Intentionally ignore any client-supplied price, unitPrice, total, discount or shipping.
    normalized.set(key, {
      id: product.id, slug: product.slug, name: product.name,
      image: product.colorImages?.[color] || product.image, size, color, quantity: combinedQuantity,
      unitPrice, lineTotal: unitPrice * combinedQuantity
    });
  }
  const items = [...normalized.values()];
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  if (!Number.isSafeInteger(subtotal)) throw new Error("The order total is outside the supported range.");
  const couponCode = String(body.coupon || "").trim().toUpperCase();
  if (couponCode && couponCode !== "AT10") throw new Error("That promo code is not recognised by the order backend.");
  const discount = couponCode === "AT10" ? Math.round(subtotal * 0.10) : 0;
  const shipping = subtotal === 0 || subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = Math.max(0, subtotal - discount) + shipping;
  return {
    orderId: `AT-${crypto.randomBytes(8).toString("hex").toUpperCase()}`,
    createdAt: new Date().toISOString(), status: "AWAITING_CONFIRMATION", paymentStatus: "NOT_COLLECTED",
    customerName: name, customer: { name, email, phone, pincode, address, city, region }, items,
    coupon: couponCode || null, subtotal, discount, shipping, total,
    note: "Order request only. The business must confirm stock, delivery and payment separately."
  };
}

async function routeAPI(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/health") return send(res, 200, { ok: true, service: "amaantrader-backend" });
  if (req.method === "GET" && url.pathname === "/api/products") {
    try { return send(res, 200, getCatalogue(), { "Cache-Control": "no-store" }); }
    catch { return safeError(res, 503, "The product catalogue is temporarily unavailable."); }
  }
  const pinMatch = url.pathname.match(/^\/api\/pincode\/([1-9][0-9]{5})$/);
  if (req.method === "GET" && pinMatch) {
    if (!sameOriginRequest(req)) return safeError(res, 403, "Cross-origin requests are not allowed.");
    if (!rateLimit(req, res, "pincode", 25)) return;
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pinMatch[1]}`, { signal: AbortSignal.timeout(8_000) });
      if (!response.ok) return safeError(res, 502, "PIN lookup service is temporarily unavailable.");
      const result = await response.json();
      const offices = Array.isArray(result?.[0]?.PostOffice) ? result[0].PostOffice : [];
      if (!offices.length) return safeError(res, 404, "No post office was found for this PIN code.");
      const first = offices[0];
      const city = first.Block && first.Block !== "NA" ? first.Block : (first.District || first.Name);
      return send(res, 200, { pincode: pinMatch[1], city, state: first.State, district: first.District, postOffice: first.Name });
    } catch {
      return safeError(res, 502, "Could not look up this PIN right now. Please enter city and state manually.");
    }
  }
  if (!url.pathname.startsWith("/api/")) return safeError(res, 404, "API route not found.");
  if (!sameOriginRequest(req)) return safeError(res, 403, "Cross-origin requests are not allowed.");

  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    if (!rateLimit(req, res, "register", 8)) return;
    const body = await readBody(req, res);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (name.length < 2 || name.length > 100) return safeError(res, 400, "Enter a valid name.");
    if (!validEmail(email) || email.length > 160) return safeError(res, 400, "Enter a valid email address.");
    if (password.length < 10 || password.length > 128) return safeError(res, 400, "Password must contain 10 to 128 characters.");
    const users = readPrivateJSON(DATA_FILES.users);
    if (users.some(user => user.email === email)) return safeError(res, 409, "An account already exists for this email. Sign in instead.");
    const credentials = passwordHash(password);
    const user = { name, email, salt: credentials.salt, passwordHash: credentials.hash, createdAt: new Date().toISOString() };
    users.push(user);
    writeJSON(DATA_FILES.users, users);
    return send(res, 201, { user: publicUser(user), token: issueToken(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    if (!rateLimit(req, res, "login", 10)) return;
    const body = await readBody(req, res);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    if (!validEmail(email) || email.length > 160 || password.length > 128) return safeError(res, 400, "Enter valid login details.");
    const user = readPrivateJSON(DATA_FILES.users).find(item => item.email === email);
    if (!user || !passwordMatches(password, user)) return safeError(res, 401, "Email or password is incorrect.");
    return send(res, 200, { user: publicUser(user), token: issueToken(user) });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    if (!rateLimit(req, res, "logout", 30)) return;
    const match = String(req.headers.authorization || "").match(/^Bearer\s+([a-f0-9]{64})$/i);
    if (match) {
      const digest = tokenDigest(match[1]);
      const sessions = readPrivateJSON(DATA_FILES.sessions).filter(session => session.tokenHash !== digest && session.token !== match[1]);
      writeJSON(DATA_FILES.sessions, sessions);
    }
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && url.pathname === "/api/orders") {
    if (!rateLimit(req, res, "orders", 12)) return;
    const body = await readBody(req, res);
    let order;
    try { order = normalizeOrder(body); }
    catch (error) { return safeError(res, 400, error.message); }
    try { order.accountEmail = userForToken(req)?.email || null; }
    catch { return safeError(res, 503, "Account storage is temporarily unavailable. Please retry later."); }
    let razorpay = null;
    const paymentMethod = String(body.paymentMethod || "").trim().toLowerCase();
    if (paymentMethod === "razorpay" && (!String(process.env.RAZORPAY_KEY_ID || "").trim() || !String(process.env.RAZORPAY_KEY_SECRET || "").trim())) {
      return safeError(res, 503, "Online payment is not configured. Choose the demo order-request option or contact the store.");
    }
    try { if (paymentMethod !== "demo") razorpay = await createRazorpayOrder(order); }
    catch (error) { return safeError(res, 502, error.message); }
    try {
      const orders = readPrivateJSON(DATA_FILES.orders);
      orders.unshift(order);
      saveOrders(orders.slice(0, 5000));
    } catch {
      return safeError(res, 503, "Orders could not be saved securely. No confirmation was created.");
    }
    await notifyStore(razorpay ? "NEW ORDER — PAYMENT AWAITING" : "NEW ORDER REQUEST — PAYMENT NOT COLLECTED", order);
    return send(res, 201, {
      order: { orderId: order.orderId, customerName: order.customerName, status: order.status, paymentStatus: order.paymentStatus, subtotal: order.subtotal, discount: order.discount, shipping: order.shipping, total: order.total },
      ...(razorpay ? { razorpay } : {})
    });
  }

  if (req.method === "POST" && url.pathname === "/api/orders/action") {
    if (!rateLimit(req, res, "order-actions", 8)) return;
    const body = await readBody(req, res);
    const orderId = String(body.orderId || "").trim().toUpperCase();
    const email = String(body.email || "").trim().toLowerCase();
    const action = String(body.action || "").trim().toUpperCase();
    const message = String(body.message || "").trim().slice(0, 500);
    if (!/^AT-[A-F0-9]{16}$/.test(orderId) || !validEmail(email) || !["CANCEL", "REFUND"].includes(action)) return safeError(res, 400, "Enter a valid order reference, checkout email and request type.");
    const orders = readPrivateJSON(DATA_FILES.orders);
    const order = loadOrderById(orders, orderId);
    if (!order || order.customer?.email !== email) return safeError(res, 404, "We could not find an order matching those details.");
    if (action === "REFUND" && order.paymentStatus !== "PAID") return safeError(res, 409, "A refund can only be requested after the payment is confirmed as paid.");
    if (action === "CANCEL" && ["CANCELLED", "REFUNDED"].includes(order.status)) return safeError(res, 409, "This order is already closed.");
    if (action === "CANCEL" && order.status === "CANCELLATION_REQUESTED") return safeError(res, 409, "A cancellation request is already open for this order.");
    if (action === "REFUND" && ["REFUND_REQUESTED", "REFUND_IN_PROGRESS", "REFUNDED"].includes(order.status)) return safeError(res, 409, "A refund request is already being handled for this order.");
    const nextStatus = action === "CANCEL" ? "CANCELLATION_REQUESTED" : "REFUND_REQUESTED";
    order.status = nextStatus;
    order.customerRequest = { type: action, message, requestedAt: new Date().toISOString() };
    persistOrderUpdate(orders, order);
    await notifyStore(action === "CANCEL" ? "CUSTOMER REQUESTED ORDER CANCELLATION" : "CUSTOMER REQUESTED REFUND", order, message ? `Customer message: ${message}` : "");
    return send(res, 200, { ok: true, message: action === "CANCEL" ? "Cancellation request sent. The store will confirm the outcome." : "Refund request sent. The store will review and confirm the outcome." });
  }

  if (req.method === "POST" && url.pathname === "/api/payments/razorpay/verify") {
    if (!rateLimit(req, res, "payment-verify", 20)) return;
    const body = await readBody(req, res);
    const orderId = String(body.orderId || "").trim().toUpperCase();
    const gatewayOrderId = String(body.razorpay_order_id || "").trim();
    const paymentId = String(body.razorpay_payment_id || "").trim();
    const signature = String(body.razorpay_signature || "").trim();
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || "").trim();
    if (!keySecret) return safeError(res, 503, "The payment gateway is not configured on this server.");
    const orders = readPrivateJSON(DATA_FILES.orders);
    const order = loadOrderById(orders, orderId);
    if (!order || !gatewayOrderId || !paymentId || order.razorpayOrderId !== gatewayOrderId) return safeError(res, 400, "Payment details do not match this order.");
    const expected = crypto.createHmac("sha256", keySecret).update(`${gatewayOrderId}|${paymentId}`).digest("hex");
    if (!timingSafeHexEqual(signature, expected)) return safeError(res, 400, "Payment signature verification failed. The order is not marked paid.");
    const wasPaid = order.paymentStatus === "PAID";
    order.paymentStatus = "PAID";
    order.status = "CONFIRMED";
    order.razorpayPaymentId = paymentId;
    order.paidAt = order.paidAt || new Date().toISOString();
    persistOrderUpdate(orders, order);
    if (!wasPaid) await notifyStore("PAYMENT SUCCESSFUL", order, `Payment ID: ${paymentId}`);
    return send(res, 200, { ok: true, order: { orderId: order.orderId, status: order.status, paymentStatus: order.paymentStatus } });
  }
  return safeError(res, 404, "API route not found.");
}

async function handleRazorpayWebhook(req, res) {
  const secret = String(process.env.RAZORPAY_WEBHOOK_SECRET || "").trim();
  if (!secret) return safeError(res, 503, "Razorpay webhook is not configured.");
  let raw;
  try { raw = await readRawBody(req); }
  catch { return safeError(res, 413, "Webhook request is too large or invalid."); }
  const received = String(req.headers["x-razorpay-signature"] || "");
  const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (!timingSafeHexEqual(received, expected)) return safeError(res, 401, "Webhook signature verification failed.");
  let payload;
  try { payload = JSON.parse(raw.toString("utf8")); }
  catch { return safeError(res, 400, "Webhook JSON is invalid."); }
  const eventName = String(payload.event || "");
  const eventId = String(req.headers["x-razorpay-event-id"] || crypto.createHash("sha256").update(raw).digest("hex"));
  const seenEvents = readPrivateJSON(DATA_FILES.webhookEvents);
  if (seenEvents.includes(eventId)) return send(res, 200, { ok: true, duplicate: true });
  const payment = payload.payload?.payment?.entity || null;
  const paymentOrder = payload.payload?.order?.entity || null;
  const refund = payload.payload?.refund?.entity || null;
  let orderId = String(paymentOrder?.receipt || payment?.notes?.website_order_id || payment?.notes?.order_id || "").trim().toUpperCase();
  const orders = readPrivateJSON(DATA_FILES.orders);
  let order = orderId ? loadOrderById(orders, orderId) : null;
  if (!order && payment?.order_id) order = orders.find(item => item.razorpayOrderId === payment.order_id) || null;
  if (!order && (refund?.payment_id || payment?.id)) {
    const linkedPaymentId = refund?.payment_id || payment?.id;
    order = orders.find(item => item.razorpayPaymentId === linkedPaymentId) || null;
  }
  if (order) {
    let notice = "";
    if (["payment.captured", "order.paid"].includes(eventName)) {
      const providerOrderId = payment?.order_id || paymentOrder?.id;
      if ((!providerOrderId || providerOrderId === order.razorpayOrderId) && order.paymentStatus !== "PAID") {
        order.paymentStatus = "PAID"; order.status = "CONFIRMED";
        order.razorpayPaymentId = payment?.id || order.razorpayPaymentId || null;
        order.paidAt = new Date().toISOString(); notice = "PAYMENT SUCCESSFUL";
      }
    } else if (eventName === "payment.failed" && order.paymentStatus !== "PAID") {
      order.paymentStatus = "FAILED"; order.status = "PAYMENT_FAILED"; notice = "PAYMENT FAILED";
    } else if (eventName === "refund.created") {
      order.refundStatus = "PROCESSING"; order.status = "REFUND_IN_PROGRESS"; notice = "REFUND STARTED";
    } else if (eventName === "refund.processed" && order.paymentStatus !== "REFUNDED") {
      order.paymentStatus = "REFUNDED"; order.refundStatus = "PROCESSED"; order.status = "REFUNDED"; notice = "REFUND PROCESSED";
    } else if (eventName === "refund.failed") {
      order.refundStatus = "FAILED"; order.status = "REFUND_FAILED"; notice = "REFUND FAILED";
    }
    if (notice) {
      persistOrderUpdate(orders, order);
      const ref = payment?.id || refund?.id || "Not supplied";
      await notifyStore(notice, order, `Gateway reference: ${ref}`);
    }
  }
  seenEvents.push(eventId);
  writeJSON(DATA_FILES.webhookEvents, seenEvents.slice(-5000));
  return send(res, 200, { ok: true, matchedOrder: Boolean(order) });
}

function staticHeaders(ext) {
  return {
    ...commonHeaders(),
    "Content-Type": MIME[ext],
    "Cache-Control": ext === ".json" || ext === ".html" ? "no-cache" : "public, max-age=300"
  };
}
function serveStatic(req, res, url) {
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { res.writeHead(400, commonHeaders()); return res.end("Bad request"); }
  if (pathname.includes("\\") || pathname.includes("\0")) { res.writeHead(400, commonHeaders()); return res.end("Bad request"); }
  const staticRoot = fs.existsSync(path.join(ROOT, "dist", "index.html")) ? path.join(ROOT, "dist") : ROOT;
  if (pathname === "/") pathname = "/index.html";
  if (pathname.endsWith("/")) pathname += "index.html";
  let lexicalPath = path.resolve(staticRoot, `.${pathname}`);
  if (!lexicalPath.startsWith(staticRoot + path.sep)) { res.writeHead(403, commonHeaders()); return res.end("Forbidden"); }
  let relativeParts = path.relative(staticRoot, lexicalPath).split(path.sep);
  if (relativeParts.some(part => !part || part.startsWith(".")) || (staticRoot === ROOT && relativeParts.some(part => PRIVATE_FILES.has(part)))) {
    res.writeHead(404, commonHeaders()); return res.end("Not found");
  }
  // React Router paths should resolve to the built application entry point.
  if (staticRoot !== ROOT && !fs.existsSync(lexicalPath) && (!path.extname(url.pathname) || url.pathname.endsWith("/"))) {
    lexicalPath = path.join(staticRoot, "index.html");
    relativeParts = ["index.html"];
  }
  const ext = path.extname(lexicalPath).toLowerCase();
  if (!MIME[ext]) { res.writeHead(404, commonHeaders()); return res.end("Not found"); }
  fs.realpath(lexicalPath, (realError, realPath) => {
    if (realError || !(realPath === ROOT || realPath.startsWith(ROOT + path.sep))) {
      res.writeHead(realError ? 404 : 403, commonHeaders()); return res.end("Not found");
    }
    fs.stat(realPath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        res.writeHead(404, { ...commonHeaders(), "Content-Type": "text/plain; charset=utf-8" });
        return res.end("File not found. Run python3 generate_pages.py if this is a product page.");
      }
      res.writeHead(200, staticHeaders(ext));
      if (req.method === "HEAD") return res.end();
      const stream = fs.createReadStream(realPath);
      stream.on("error", () => { if (!res.headersSent) res.writeHead(500, commonHeaders()); res.destroy(); });
      stream.pipe(res);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/webhooks/razorpay" && req.method === "POST") {
    try { await handleRazorpayWebhook(req, res); }
    catch (error) {
      if (!res.headersSent && !res.writableEnded) safeError(res, 500, "Webhook processing failed. The provider may retry this event.");
      if (process.env.NODE_ENV !== "production") console.error("Webhook error:", error.message);
    }
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    try { await routeAPI(req, res, url); }
    catch (error) {
      if (!res.headersSent && !res.writableEnded) send(res, 500, { error: "The backend could not complete this request." });
      if (process.env.NODE_ENV !== "production") console.error("API error:", error.message);
    }
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...commonHeaders(), Allow: "GET, HEAD" }); return res.end("Method not allowed");
  }
  serveStatic(req, res, url);
});
server.headersTimeout = 15_000;
server.requestTimeout = 30_000;
server.keepAliveTimeout = 5_000;
server.listen(PORT, HOST, () => console.log(`AmaanTrader running at http://${HOST}:${PORT}`));
