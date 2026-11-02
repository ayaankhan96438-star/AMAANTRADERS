# AMAANTRADERS — Premium Outerwear Commerce

A React + Vite + TypeScript fashion storefront built on top of the existing AmaanTrader Node API and 18-product catalogue. The visual direction blends editorial luxury, contemporary streetwear and restrained interface motion, guided by the supplied fashion/dashboard videos.

## Stack

- React 18, Vite 6, TypeScript
- Tailwind CSS 3.4 and custom responsive design system
- Framer Motion for page/section/modal transitions
- React Router for navigation
- Lucide React for icons
- Context API for cart, wishlist, profile and toasts
- Recharts for the admin demo analytics
- Existing Node.js API for catalogue, PIN lookup, account registration/login, order requests, cancellation/refund requests, Razorpay payment verification and webhooks

## Kali Linux setup

Use Node.js 18 or newer.

```bash
cd /home/ayaan/web
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The `dev` command starts the Node API and Vite on port 5173. Vite proxies `/api` requests to the local API. If port 3000 is already occupied, start both on an alternate API port with `PORT=3004 npm run dev` (the Vite proxy follows that same port).

For a production-style local build:

```bash
npm run check
npm run security-check
npm run build
PORT=3004 npm start
```

Then open **http://127.0.0.1:3004**. The Node server serves the compiled `dist/` app and the same-origin `/api` endpoints. Do not run `npm start` before `npm run build` for the React version.

## Environment configuration

```bash
cp .env.example .env
nano .env
```

Leave values blank until the respective provider accounts are configured. Add Resend email credentials, Meta WhatsApp Cloud API credentials and Razorpay keys/webhook secret only to the server-side `.env`. Do not put secrets in React files, browser storage or Git. Restart the Node server after editing `.env`.

The public support number/email must also be filled in the customer-facing contact content before launch. The contact page intentionally does not invent real business details.

## Included experiences

### Storefront

- Editorial homepage, full-width campaign hero, moving message rail, category tiles, featured/new-arrival product rails, story section, journal cards, testimonials/brand voice, newsletter UI and footer.
- Collection page with search, category, colour, price and sorting filters.
- Product detail pages for the existing 18 catalogue entries, gallery, colour/size selection, size guide, quantity controls, wishlist and add-to-bag.
- Quick view modal, cart, save-for-later, promo code `AT10`, checkout, PIN-to-city/state lookup and order confirmation.
- About, Lookbook, Journal, Contact, Size Guide, Order Support and Policies pages.

### Customer area

- Login and registration use the existing server-side API. The backend hashes passwords with scrypt and stores only a digest of the session token.
- The bearer token is kept in `sessionStorage` for the current browser session, never in `localStorage`; passwords are never written to browser storage.
- Cart, wishlist, saved-address demo data and local demonstration orders persist in `localStorage`.
- Customer overview, orders/tracking, wishlist, bag, profile, saved addresses and settings screens.

### Admin studio

- Separate `/admin` experience with overview cards, Recharts trend charts, product create/edit/delete, categories, coupons/offers, orders/status UI, customers and inventory.
- **Important:** the admin studio is a browser-local demonstration, not a production-protected admin system. Product edits, demo orders and status changes are local to that browser. The current Node API deliberately exposes no public admin price-edit endpoint. Before production, implement server-side admin login, role claims, permission checks, database-backed product CRUD and protected order/customer/analytics APIs. Do not rely on the frontend demo gate as an authorization boundary.
- Dashboard revenue charts are illustrative sample data; only local orders with `PAID` status contribute to the demo's confirmed-revenue card.

## Payment and order safety

- With no Razorpay credentials, checkout uses the explicitly labelled **Place order request** flow. It records an order request; it does not charge a card or mark an order paid.
- If Razorpay server credentials are configured, choose **Online payment** to open Razorpay Checkout. The server verifies the returned signature and webhook events before marking the payment/refund status.
- Cancellation/refund submission is a request for store review, not an automatic reversal. Refund requests require a paid order.
- Owner email/WhatsApp notifications require a verified provider account and approved Meta template. An empty configuration does not send messages.

## Known integration work before public launch

1. Add production database persistence and server-side role/permission checks for admin/customer order reads.
2. Implement verified password reset and email verification.
3. Configure real shipping/returns, legal identity, support contacts and garment-specific size/quality data.
4. Replace demo sample analytics and admin/customer local-only data with protected server API data.
5. Confirm all product images, colour-specific photos, product claims and supplier details are approved for commercial use.
6. Deploy behind HTTPS, set secure cookie/session policy, configure backups, monitoring and privacy retention.

## Main folders

- `src/components` — shared navigation, cards, quick view, motion and feedback
- `src/pages` — storefront, catalogue, detail, checkout, auth, customer, admin and editorial pages
- `src/context` — cart/wishlist/toast and auth state
- `src/services` — API client and PIN lookup
- `src/data` — imported product catalogue for the frontend
- `src/styles` — design tokens, layouts, responsive and reduced-motion styles
- `server.js` — existing Node API and static production serving
- `products.json` — server-authoritative 18-product catalogue
- `public/assets` — local jacket placeholder and exploded-view reference assets

## Commands

```bash
npm run dev             # Vite + local API
npm run build           # TypeScript project check + production bundle
npm run check           # TypeScript project check + Node syntax checks
npm run security-check  # Existing backend regression checks
npm start               # Serve dist/ and API (build first)
```
