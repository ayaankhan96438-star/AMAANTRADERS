# AmaanTrader security notes

## What protects order pricing

- The browser sends product IDs, variant options, quantities, and a coupon code only.
- The API calculates each unit price from the server-side `products.json` catalogue and recalculates subtotal, discount, shipping and total.
- Forged client `price`, `unitPrice`, `lineTotal`, `subtotal`, `discount`, `shipping` and `total` fields are ignored.
- There is no public API endpoint to modify catalogue prices. Price edits require authenticated deployment/server-file access to `products.json` and a controlled release process.
- The raw `products.json` file is not served as a static file; the public read-only `/api/products` endpoint provides catalogue data to the storefront. Product prices remain visible to visitors because an online shop must display its prices. A visitor changing the price shown in their own browser does not change the server's price or the stored order total.

## Other protections in this starter

- Account passwords are hashed with Node.js scrypt; the session store persists token digests for newly issued sessions.
- Login, registration, logout and order requests have simple per-source rate limits.
- Mutating API requests with an `Origin` header must match the request Host.
- Request JSON bodies are size-limited and validated; repeated variants cannot bypass per-variant quantity limits.
- Private JSON stores, server source, environment files and package metadata are blocked from static serving.
- Static path resolution checks the real filesystem path to reduce traversal/symlink exposure.
- Responses set defensive headers and sensitive API responses are not cached.
- The default bind address is loopback (`127.0.0.1`); set `HOST` explicitly when running behind a properly configured production reverse proxy.

## Important limitations before a real launch

This is a hardening pass on a small Node.js/JSON-file starter; it does not make a public store invulnerable. JSON files are not a suitable transactional database for a busy multi-process deployment. Use a real database with access controls and backups, HTTPS, a maintained production host/reverse proxy, real payment-gateway verification, inventory reservation, structured logging/monitoring, and an independent security review. Do not expose this local server directly to the public internet. Do not put private admin credentials in frontend files.

The current account token is held by the existing browser code in localStorage, so a future production release should move to appropriately configured Secure, HttpOnly, SameSite cookies or another reviewed session design and address XSS protections. The demo order route stores an order request but does not charge payment or guarantee fulfilment.

## Checks

Run:

```bash
npm run check
npm run security-check
```

`security-check.js` launches a temporary copy of the backend and tests that forged browser prices/totals do not affect the server-calculated order, private files are blocked, cross-origin mutations are denied, and there is no public price-edit endpoint.
