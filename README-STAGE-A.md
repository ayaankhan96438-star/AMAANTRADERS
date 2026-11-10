# AmaanTrader — Part 0 / Stage A

This patch updates the active React/Vite storefront. It does not modify cart, wishlist, compare, search, filters, checkout, the StoreContext, product-page components, policy pages, server code, or product catalogue data.

## Files included

- `index.html` — preloads the first hero-slide product image at high priority.
- `src/App.tsx` — loads the new Forest & Sand stylesheet after existing styles.
- `src/pages/HomePage.tsx` — replaces the old close-up hero and AT/01 stamp with a four-product carousel; changes the pale offer band to forest and makes AT10 copyable; changes the unsupported “Best sellers” heading to “House favourites”.
- `src/components/ProductCard.tsx` — keeps existing cart and wishlist handlers; adds size chips, hover/focus alternate image, size-aware INR starting price, and optional old-price/discount presentation.
- `src/types/index.ts` — adds optional `heroImage` for a future transparent cutout without replacing the product-card/gallery photo.
- `src/styles/forest-sand-stage-a.css` — Forest & Sand palette, shared aliases, hero, header, card and responsive overrides.

## Install

From the project root (`/home/ayaan/web`), back up the files that this patch replaces:

```bash
mkdir -p .stage-a-backup
cp index.html .stage-a-backup/index.html
cp src/App.tsx .stage-a-backup/App.tsx
cp src/pages/HomePage.tsx .stage-a-backup/HomePage.tsx
cp src/components/ProductCard.tsx .stage-a-backup/ProductCard.tsx
cp src/types/index.ts .stage-a-backup/types-index.ts
```

Extract this ZIP into the project root, preserving the `src/` directory structure:

```bash
unzip -o ~/Downloads/AmaanTrader-Forest-Sand-Stage-A.zip -d /home/ayaan/web
cd /home/ayaan/web
npm run check && npm run build
npm run dev
```

No new package or animation library is installed. The hero's slide change is native React state with a six-second interval; the hero itself uses no Motion transition. Existing Motion use elsewhere in the app is left as-is.

## Hero slide data

The supplied catalogue contains 18 products but no sales counts, bestseller rank, or sort metric. The four hero slides therefore use an explicit *featured edit* order, not a verified sales ranking:

1. Atlas Biker Jacket — forest
2. Evergreen Bomber — deep brown
3. Heritage Varsity Jacket — olive
4. Midnight Puffer Jacket — charcoal

The price displayed is the lowest configured size price when `sizePrices` exists, formatted in INR. Each `Shop this` link goes to that product's existing `/product/:slug` route.

The carousel advances every six seconds. Hover and keyboard focus pause it. Left/right arrow keys and the previous/next/progress controls work. Touch swipes are supported on mobile. `prefers-reduced-motion: reduce` disables autoplay; manual controls remain available.

## Images to replace later

There were no transparent jacket cutouts or separate leather-texture assets in the uploaded `src` ZIP; it contained only the generic `jacket-placeholder.svg` plus remote image URLs in `src/data/products.json`. The hero currently uses each product's existing first image on a matching tinted panel.

For the four hero cutouts, supply transparent PNGs (or transparent WebP) with a portrait 4:5 canvas, recommended 1600 × 2000 px, jacket fully visible with breathing room around sleeves and hem. Name them:

- `atlas-leather-biker-hero.png`
- `evergreen-bomber-hero.png`
- `heritage-varsity-hero.png`
- `midnight-puffer-hero.png`

Place them under `public/assets/hero/`, then add a `heroImage` field to the corresponding product object in `src/data/products.json`, for example:

```json
"heroImage": "/assets/hero/atlas-leather-biker-hero.png"
```

The new optional `heroImage` field is used only by the homepage hero. It does not change the gallery/card photo.

For consistent product cards, the recommended style is **product-only flat-lay / ghost-mannequin studio photography**, not a mixture of flat-lay and model photos. Use one consistent neutral background, lighting, camera distance, and 4:5 crop across all products. Replace the first `images` entry (or `image` where no `images` array exists) for these slugs in `src/data/products.json`:

`atlas-leather-biker`, `evergreen-bomber`, `heritage-varsity`, `midnight-puffer`, `raw-indigo-denim`, `stone-check-shacket`, `field-utility-jacket`, `velocity-racer`, `cloud-quilted-jacket`, `sable-harrington`, `trail-windbreaker`, `cocoa-overshirt`, `classic-field-layer`, `monochrome-varsity`, `urban-puffer-vest`, `washed-denim-jacket`, `minimal-black-bomber`, `desert-sand-trench`.

Current product data has `sizePrices` but no `originalPrice` fields. The discount/old-price UI is ready but remains hidden until a verified `originalPrice` is added to a product. Do not add invented markdown prices.

## Colour / contrast notes

The Rust button uses white text (not cream) because white on `#B5532F` clears WCAG AA normal-text contrast, while the specified cream on that rust shade does not. Small editorial text and nav links are darkened on cream/surface backgrounds. The logo's `A.` punctuation is part of the current `Brand.tsx` mark, not a separate stray decorative dot; it is retained and recoloured rust.

## Stage A test checklist

Test these viewport sizes in browser DevTools:

- 1366 × 650
- 1440 × 900
- 1920 × 1080
- 390 × 844
- 360 px wide (mobile minimum)

Check:

1. Hero has two columns on desktop; text and both CTAs are visible without horizontal scrolling.
2. Mobile shows readable hero text, both CTAs, image panel, controls, and a clear gap before the ticker.
3. Four slides show the corresponding jacket name, INR price, colour tint, `Shop this` route, counter and progress bar.
4. Autoplay changes at six seconds; hover/focus pauses; left/right keys work; touch swipe changes slides; reduced-motion setting stops autoplay.
5. Header remains under the announcement bar, becomes compact on scroll, has readable 14–15 px nav links and CSS-only rust underline.
6. Cart/wishlist counters are at least 18 px and rust with white text.
7. Product cards use the same 4:5 frame and `object-fit: cover`; hover/focus reveals the second photo; S/M/L/XL chips and INR price are visible; optional `originalPrice` produces a struck old price and discount label.
8. Click `AT10`; confirm it copies and the existing toast appears.
9. Regression checks: add to bag, wishlist toggle, Quick View, compare, search, filters, product detail routes, cart, checkout and account routes.
10. Check browser console and network panel for broken images or module paths.

Stage B is not included in this patch.
