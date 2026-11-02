# AMAANTRADERS React platform update

- Migrated the visible storefront to React 18 + Vite + TypeScript.
- Added reusable shared components, Context API, React Router, Tailwind and Framer Motion.
- Added responsive editorial home, category discovery, shop filters, product detail/quick view, cart, checkout and confirmation.
- Added login/register UI connected to existing server auth; no passwords or auth tokens are stored in localStorage.
- Added customer dashboard sections with local demo cart/wishlist/orders/profile/address preferences.
- Added separate admin studio demo with product CRUD, categories, coupons, order status UI, inventory and Recharts analytics.
- Preserved the existing 18-product server-authoritative catalogue, Node API, PIN lookup, server-side order pricing, Razorpay signature verification, refund/cancellation request rules and owner notification hooks.
- Updated Node static serving to serve `dist/` and fall back to the React app for client-side routes after build.
- Admin demo state is local-only and explicitly not presented as production authorization. Production admin roles and protected database-backed APIs remain required.
