# AmaanTrader security regression check

Run date: 2026-10-27

Command: `npm run check && npm run security-check`

## Results

- PASS — Node syntax checks for `script.js`, `product.js`, `server.js`, and `security-check.js`.
- PASS — health endpoint and defensive security headers.
- PASS — public read-only product API; direct HTTP reads of `products.json`, server source, package metadata, `.env`, and local JSON stores return 404.
- PASS — cross-origin browser-origin mutation denied.
- PASS — valid registration, login and logout; passwords are hashed and new session tokens are stored as digests rather than plaintext.
- PASS — homepage and generated product page remain served by the backend.
- PASS — forged `price`, `unitPrice`, `lineTotal`, `subtotal`, `discount`, `shipping`, and `total` fields do not affect order calculation.
- PASS — coupon discount and shipping are recomputed server-side from server catalogue price.
- PASS — no public admin price-edit route exists.
- PASS — duplicate identical variants cannot bypass the per-variant quantity cap.

## Important scope note

These are targeted regression tests for common mistakes, not a full penetration test or a guarantee that no vulnerability exists. The public catalogue endpoint deliberately shows the product price to shoppers. It prevents the customer from using a modified browser price as the price recorded by the backend. Production deployment still needs HTTPS, managed/transactional storage, reviewed sessions and XSS/CSRF defenses, payment-provider verification, monitoring and independent review.
