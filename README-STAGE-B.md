# AmaanTrader — Part 0 / Stage B

Stage B is built on the Stage A Forest & Sand design system and is supplied as an incremental patch. The combined Stage A + Stage B archive is also available for a one-step install.

## What Stage B adds

### B1 — Homepage and supporting sections

- A shopping-information strip directly below the hero ticker.
- The only active trust claim is **Free shipping above ₹2,999**, which the owner already identified as an existing offer and which is also used by the current cart/checkout thresholds.
- Returns, secure payment and cash-on-delivery entries are visibly labelled **TODO**. They must remain placeholders until the owner confirms the actual policy, payment provider and COD coverage.
- The testimonial cards remain illustrative only. Each is labelled `SAMPLE REVIEW`, and the source includes `// SAMPLE - replace with real reviews`.
- A six-tile lookbook mosaic uses varied tile sizes and links to the matching product pages.
- The existing footer newsletter area is retained. It now clearly says signup is not connected and the submit action shows a preview-only notice instead of falsely claiming an email subscription was stored.
- Social icons are present, with generic destination URLs marked as TODO placeholders.
- A floating WhatsApp link is added. Until the number is configured it routes to Contact rather than opening a broken WhatsApp URL.

### B2 — Product experience

- Quick View already existed in the uploaded project. It already allows colour, size and quantity selection and adds to the existing cart. Stage B sets the first available colour when a product opens and uses the new image loader.
- A sticky Add to Bag bar appears when the regular purchase controls scroll out of view. It calls the same existing `addToCart` handler.
- The product size guide is now a drawer. It uses the current general starter chart and explicitly warns that product-specific measurements still need confirmation.
- A reusable `BlurImage` component adds a skeleton and blur-in reveal to homepage, product-card, quick-view, cart, checkout, product detail and editorial images.
- Recently viewed product IDs are stored in localStorage under `at_recently_viewed`; the homepage shows up to four recent items on the same browser/device.
- Cart and wishlist toasts were already implemented by `StoreContext` / `ToastHost`; their existing handlers are retained.

### B3 — SEO and GitHub Pages

- Root HTML now includes Open Graph, Twitter summary-large-image, canonical URL, description, title and a Vite-aware favicon path.
- `public/favicon.svg` is included.
- The React app uses `HashRouter`, and local product data is imported by Vite rather than fetched through a root-relative JSON URL.
- Product photography URLs in the supplied catalogue are HTTPS remote image URLs. Those origins must remain reachable and permit image use; replace them with owned/approved WebP assets before launch.

**Important deployment item:** the uploaded source ZIP did not include the existing `vite.config.ts` / `vite.config.js` or the GitHub Actions deployment workflow, so this patch does not overwrite either. Open the existing Vite config and merge `base: '/AMAANTRADERS/'` into its current `defineConfig({ ... })` object. Do not replace any existing plugins, aliases or server settings. See `VITE-BASE-PATH-SNIPPET.txt` in the archive. The canonical/OG URL is set to `https://ayaankhan96438-star.github.io/AMAANTRADERS/`; update it if the repository owner or published URL changes.

## Files changed or added by Stage B

- `index.html`
- `src/App.tsx`
- `src/pages/HomePage.tsx`
- `src/pages/ProductPage.tsx`
- `src/pages/CartPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/pages/EditorialPages.tsx`
- `src/components/Footer.tsx`
- `src/components/ProductCard.tsx`
- `src/components/QuickView.tsx`
- `src/components/JacketShowcase.tsx`
- `src/components/BlurImage.tsx` (new)
- `src/components/WhatsAppFloat.tsx` (new)
- `src/lib/recentlyViewed.ts` (new)
- `src/styles/forest-sand-stage-b.css` (new)
- `public/favicon.svg` (new)

The cumulative archive additionally contains the Stage A files: `src/styles/forest-sand-stage-a.css`, `src/types/index.ts`, and the Stage A HomePage/ProductCard/App/index versions as extended by Stage B.

## Install Stage B (after Stage A)

From `/home/ayaan/web`:

```bash
mkdir -p .stage-b-backup
for f in index.html src/App.tsx src/pages/HomePage.tsx src/pages/ProductPage.tsx src/pages/CartPage.tsx src/pages/CheckoutPage.tsx src/pages/EditorialPages.tsx src/components/Footer.tsx src/components/ProductCard.tsx src/components/QuickView.tsx src/components/JacketShowcase.tsx; do
  if [ -f "$f" ]; then mkdir -p ".stage-b-backup/$(dirname "$f")"; cp "$f" ".stage-b-backup/$f"; fi
done
if [ -f public/favicon.svg ]; then mkdir -p .stage-b-backup/public; cp public/favicon.svg .stage-b-backup/public/favicon.svg; fi
unzip -o ~/Downloads/AmaanTrader-Forest-Sand-Stage-B.zip -d /home/ayaan/web
```

Or use `AmaanTrader-Forest-Sand-Stage-A-B-Complete.zip` if you have not installed Stage A yet. It contains the cumulative final versions of all Stage A and Stage B overlay files.

Then merge the Vite `base` setting as described above, and run:

```bash
cd /home/ayaan/web
npm run check && npm run build
npm run dev
```

No dependency or animation library was added. The existing Motion package remains as it was in your project.

## Configuration you must complete

1. **WhatsApp number:** edit `WHATSAPP_NUMBER` in `src/components/WhatsAppFloat.tsx`. Replace `91XXXXXXXXXX` with the real public number including country code, digits only, for example `919876543210`. The placeholder routes to `/contact` until it is a valid digits-only number.
2. **Social links:** replace the generic URLs in `src/components/Footer.tsx` with the official Instagram, Facebook and YouTube profile URLs.
3. **Newsletter provider:** connect the footer form to a real email service/API before collecting signups. Currently the form shows a clearly marked preview-only notification and does not store the address.
4. **Trust claims:** confirm the return window and eligibility, payment provider/security details and COD availability/regions before removing the TODO labels.
5. **Reviews:** replace every sample quote, star rating and SAMPLE label with verified customer content. Do not publish the current quotes as real reviews.
6. **SEO:** confirm the canonical GitHub Pages URL and the social sharing image are correct for the final public site.

## Asset list

No new product photography is required to install Stage B. The new favicon is included. The blur/skeleton loader uses the existing product photos and the existing local jacket placeholder as fallback. For launch, replace reference photos with approved, rights-cleared AmaanTrader photos; use a consistent 4:5 image crop and WebP where possible.

## Test checklist

### Layout

- 1366 × 650
- 1440 × 900
- 1920 × 1080
- 390 × 844
- 360 px minimum width

Check the trust strip, mosaic tile proportions, footer columns, floating WhatsApp placement, product drawer, sticky purchase bar and horizontal overflow.

### Stage B features

1. See the free-shipping row and confirm the three other trust rows still visibly say TODO.
2. Verify all review cards say SAMPLE REVIEW.
3. Open the lookbook mosaic tiles and confirm each goes to the matching product route.
4. Visit a product page, scroll past the main Add to Bag buttons, and confirm the sticky bar appears. Add an item and confirm the existing cart/toast updates.
5. Open the size guide drawer, close it with the close button, backdrop and Escape key, and verify the general-chart disclaimer is visible.
6. Open Quick View, change colour and size, add to bag, and confirm cart quantity / toast.
7. Open a product, return home, and confirm Recently Viewed appears with that product. Refresh and confirm the list persists in localStorage.
8. Throttle the network and verify skeletons appear before images load; check local fallback on a deliberately broken image URL.
9. Add/remove wishlist items and confirm the existing toast still appears.
10. Submit the newsletter form and verify it reports preview-only status rather than claiming a signup was stored.
11. With the placeholder number unchanged, click the floating WhatsApp item and confirm it routes to Contact. After setting the real number, confirm it opens the `wa.me` link.
12. Test cart, checkout, search, filters, compare, account routes and all product detail links.

### GitHub Pages base-path check

After setting `base: '/AMAANTRADERS/'`:

```bash
npm run build
grep -nE 'AMAANTRADERS|favicon.svg' dist/index.html
find dist -maxdepth 2 -type f | sort | head -80
```

Deploy the `dist` output through your existing GitHub Pages workflow. Open the published site at `/AMAANTRADERS/`, then verify the favicon, compiled JS/CSS, image requests, product routes (`#/product/...`) and checkout API configuration. The uploaded ZIP did not include the Vite config or deployment workflow, so those two project files still require local confirmation.

## Validation performed while preparing this patch

- TypeScript/TSX syntax transpilation: passed for all changed TypeScript files.
- Relative imports in changed files: resolved against the uploaded source tree.
- `src/data/products.json`: valid JSON.
- Stage A and Stage B CSS brace balance: passed.
- A full `npm run check` / Vite production build and live browser interaction test were not run here because the upload contained `src/` and the HTML entry point but not `node_modules`, the full project root, or Vite/GitHub Pages configuration. Run the commands above in your project before deployment.
