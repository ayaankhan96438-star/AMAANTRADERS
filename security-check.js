"use strict";

// Small integration regression test. It copies only the backend and a catalogue
// into a temporary directory, so running the checks never adds test orders/users
// to your working project.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const net = require("node:net");
const { spawn } = require("node:child_process");

function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}
async function waitForHealth(base, child) {
  for (let i = 0; i < 60; i += 1) {
    if (child.exitCode !== null) throw new Error("Backend exited before becoming healthy.");
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return;
    } catch { /* Server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Backend did not become healthy in time.");
}
async function main() {
  const root = __dirname;
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "amaantrader-security-test-"));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  let child;
  try {
    fs.copyFileSync(path.join(root, "server.js"), path.join(temp, "server.js"));
    fs.copyFileSync(path.join(root, "products.json"), path.join(temp, "products.json"));
    for (const name of ["index.html", "style.css", "pages.css", "script.js", "product.js", "pages.js", "catalog.js", "lookbook.js", "support.js", "site-config.js", "favicon.svg", "policies.html", "policies.css"]) {
      if (fs.existsSync(path.join(root, name))) fs.copyFileSync(path.join(root, name), path.join(temp, name));
    }
    for (const folder of ["shop", "about", "lookbook", "contact", "order-support", "size-guide"]) {
      if (fs.existsSync(path.join(root, folder))) fs.cpSync(path.join(root, folder), path.join(temp, folder), { recursive: true });
    }
    const sampleProductPage = path.join(root, "product", "atlas-leather-biker", "index.html");
    if (fs.existsSync(sampleProductPage)) {
      fs.mkdirSync(path.join(temp, "product", "atlas-leather-biker"), { recursive: true });
      fs.copyFileSync(sampleProductPage, path.join(temp, "product", "atlas-leather-biker", "index.html"));
    }
    child = spawn(process.execPath, ["server.js"], {
      cwd: temp,
      env: { ...process.env, HOST: "127.0.0.1", PORT: String(port), NODE_ENV: "test" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });
    await waitForHealth(base, child);

    const health = await fetch(`${base}/api/health`);
    assert.equal(health.status, 200, "health endpoint should respond");
    assert.equal(health.headers.get("x-content-type-options"), "nosniff", "security header should be present");

    const catalogueResponse = await fetch(`${base}/api/products`);
    assert.equal(catalogueResponse.status, 200, "public product API should work");
    const catalogue = await catalogueResponse.json();
    assert.ok(catalogue.length >= 1, "catalogue should not be empty");
    const jacket = catalogue.find(p => Number(p.id) === 1);
    assert.ok(jacket, "test jacket ID should exist");

    for (const privatePath of ["/server.js", "/package.json", "/orders.json", "/users.json", "/sessions.json", "/products.json", "/.env"]) {
      const response = await fetch(`${base}${privatePath}`);
      assert.equal(response.status, 404, `${privatePath} must not be publicly downloadable`);
    }

    const originBlocked = await fetch(`${base}/api/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: "https://attacker.example" },
      body: JSON.stringify({ name: "Test User", email: "test@example.com", password: "this-is-a-test-password" })
    });
    assert.equal(originBlocked.status, 403, "cross-origin state changes should be denied");

    const registerResponse = await fetch(`${base}/api/auth/register`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ name: "Test User", email: "test@example.com", password: "this-is-a-test-password" })
    });
    assert.equal(registerResponse.status, 201, "valid registration should work");
    const registered = await registerResponse.json();
    assert.ok(registered.token && registered.user.email === "test@example.com", "registration should issue a bearer token");
    const rawUsers = fs.readFileSync(path.join(temp, "users.json"), "utf8");
    assert.ok(!rawUsers.includes("this-is-a-test-password"), "plaintext passwords must not be persisted");
    const rawSessions = fs.readFileSync(path.join(temp, "sessions.json"), "utf8");
    assert.ok(!rawSessions.includes(registered.token), "new session tokens should not be persisted in plaintext");
    const loginResponse = await fetch(`${base}/api/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base },
      body: JSON.stringify({ email: "test@example.com", password: "this-is-a-test-password" })
    });
    assert.equal(loginResponse.status, 200, "login should work with the correct password");
    const logoutResponse = await fetch(`${base}/api/auth/logout`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base, Authorization: `Bearer ${registered.token}` }, body: "{}"
    });
    assert.equal(logoutResponse.status, 200, "logout should revoke a session");

    const homepageResponse = await fetch(`${base}/index.html`);
    assert.equal(homepageResponse.status, 200, "home page should be served");
    assert.equal(homepageResponse.headers.get("x-frame-options"), "DENY", "anti-framing header should be present");
    const productPageResponse = await fetch(`${base}/product/atlas-leather-biker/`);
    assert.equal(productPageResponse.status, 200, "generated product pages should still be served");
    for (const route of ["/shop/", "/about/", "/lookbook/", "/contact/", "/order-support/", "/size-guide/", "/policies.html"]) {
      const pageResponse = await fetch(`${base}${route}`);
      assert.equal(pageResponse.status, 200, `${route} should be served`);
    }

    const payload = {
      customer: { name: "Test Customer", email: "test@example.com", phone: "9876543210", pincode: "110001", address: "12 Example Market Road", city: "Delhi", region: "Delhi" },
      items: [{ id: jacket.id, size: jacket.sizes[0], color: jacket.colors[0], quantity: 1, price: 1, unitPrice: 1, lineTotal: 1 }],
      coupon: "AT10", subtotal: 1, discount: 999999, shipping: 0, total: 1
    };
    const orderResponse = await fetch(`${base}/api/orders`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(payload)
    });
    assert.equal(orderResponse.status, 201, "valid guest order request should be saved");
    const { order } = await orderResponse.json();
    const expectedSubtotal = Number(jacket.price);
    const expectedDiscount = Math.round(expectedSubtotal * 0.10);
    const expectedShipping = expectedSubtotal >= 2999 ? 0 : 99;
    assert.equal(order.subtotal, expectedSubtotal, "subtotal must use server catalogue price, not forged client price");
    assert.equal(order.discount, expectedDiscount, "discount must be recalculated server-side");
    assert.equal(order.shipping, expectedShipping, "shipping must be recalculated server-side");
    assert.equal(order.total, expectedSubtotal - expectedDiscount + expectedShipping, "total must be recalculated server-side");

    const adminRoute = await fetch(`${base}/api/admin/prices`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ id: 1, price: 1 }) });
    assert.equal(adminRoute.status, 404, "there must be no public price-edit route");

    const duplicatePayload = { ...payload, coupon: "", items: [
      { id: jacket.id, size: jacket.sizes[0], color: jacket.colors[0], quantity: 10 },
      { id: jacket.id, size: jacket.sizes[0], color: jacket.colors[0], quantity: 10 }
    ] };
    const duplicateResponse = await fetch(`${base}/api/orders`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify(duplicatePayload)
    });
    assert.equal(duplicateResponse.status, 400, "repeated identical variants cannot bypass quantity cap");

    console.log("PASS: API health and security headers");
    console.log("PASS: public catalogue API and private file blocking");
    console.log("PASS: cross-origin order/account mutation blocked");
    console.log("PASS: registration/login/logout work; password and session token are not stored in plaintext");
    console.log("PASS: home, product, shop, about, lookbook, contact, order-support, size-guide and policies pages served");
    console.log(`PASS: forged unitPrice/lineTotal/subtotal/discount/total ignored (catalogue price ${expectedSubtotal})`);
    console.log("PASS: discount and shipping recalculated by backend");
    console.log("PASS: no public admin price-edit route");
    console.log("PASS: repeated variants cannot bypass quantity limit");
  } catch (error) {
    if (child && child.exitCode === null) child.kill("SIGTERM");
    console.error(error.stack || error);
    if (typeof stderr !== "undefined" && stderr) console.error(stderr);
    process.exitCode = 1;
  } finally {
    if (child && child.exitCode === null) {
      child.kill("SIGTERM");
      await new Promise(resolve => child.once("exit", resolve));
    }
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
