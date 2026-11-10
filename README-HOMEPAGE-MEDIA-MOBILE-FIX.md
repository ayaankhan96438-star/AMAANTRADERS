# AmaanTrader — Homepage image + mobile layout fix

This is a focused follow-up patch for the Forest & Sand Stage A+B React/Vite storefront.

## What it fixes

1. **Blank image frames:** `BlurImage.tsx` now checks `HTMLImageElement.complete/naturalWidth` after the source changes. This catches cached images whose `load` event can occur before the handler has been observed. Failed third-party image URLs fall back to the local `jacket-placeholder.svg`; if even that asset fails, the frame renders a visible A/T fallback instead of remaining transparent.
2. **Mobile photo cropping:** on screens up to 800px, homepage product cards, the Outerwear Study showcase, category tiles, manifesto image, lookbook mosaic and journal images use `object-fit: contain` so the whole jacket/photo remains visible. Desktop crops are unchanged.
3. **Outerwear Study:** the mobile image is no longer enlarged to 110% and clipped outside its panel.
4. **Shipping announcement:** the existing `COMPLIMENTARY SHIPPING ON ORDERS ABOVE ₹2,999` message becomes centered, responsive and wrap-safe on phones. The current ₹2,999 threshold is preserved.
5. **Journal cards:** their two photos now use the same robust BlurImage loader and local fallback.

## Files

- `src/components/BlurImage.tsx`
- `src/pages/HomePage.tsx`
- `src/App.tsx`
- `src/styles/homepage-media-fix.css`

No product data, cart, wishlist, compare, search, filter, checkout, account, product route, or store context code is changed. No dependency or animation library is added.

## Install

From `/home/ayaan/web`, first create a small backup, then extract this ZIP into the project root:

```bash
cd /home/ayaan/web
mkdir -p .homepage-media-backup
cp src/components/BlurImage.tsx .homepage-media-backup/BlurImage.tsx 2>/dev/null || true
cp src/pages/HomePage.tsx .homepage-media-backup/HomePage.tsx
cp src/App.tsx .homepage-media-backup/App.tsx
unzip -o ~/Downloads/AmaanTrader-Homepage-Media-Mobile-Fix.zip -d .
npm run check && npm run build
```

If your terminal prompt is root but your file is in the normal user's Downloads folder, use `/home/ayaan/Downloads/AmaanTrader-Homepage-Media-Mobile-Fix.zip` instead of `~/Downloads/...`.

## Test

Check the home page at 1440x900, 390x844 and 360px wide. Confirm:

- all product photos show after initial load and after a hard refresh;
- image frames show the local A/T fallback rather than staying blank if an external image URL fails;
- the complete jacket remains visible in Outerwear Studies and product cards on mobile;
- category and Lookbook tiles do not cut the jacket off;
- the shipping message is centered and completely readable;
- product navigation, Quick View, cart, wishlist, compare, search and filters still work.

## Image-source note

The supplied catalogue uses remote images from third-party domains and contains no approved local AmaanTrader product-photo set. This patch fixes loader timing and failure presentation, but it cannot make a third-party image server return an image if that server blocks or removes its URL. The production-reliable option is to place approved AmaanTrader product photos under `public/assets/products/` and use those local paths in `src/data/products.json`.
