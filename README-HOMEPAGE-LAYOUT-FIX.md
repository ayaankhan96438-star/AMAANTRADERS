# AmaanTrader homepage layout fix

This is a one-file replacement for `src/styles/forest-sand-stage-a.css`.

## What it fixes

The four category cards are React Router `<Link>` elements. The prior stylesheet assigned them a fixed height and positioned image/label layers but did not make the anchor block-level. The appended hotfix makes the card links block-level, gives the image frame a definite containing box, orders the image/shade/labels, and preserves the existing 4-column desktop / 2-column mobile layout.

No React components, product data, routes, cart, checkout, wishlist, compare, search, filters, animation libraries, or product-page logic are changed.

## Install

From the project root (`/home/ayaan/web`), make a backup and extract this ZIP:

```bash
cd /home/ayaan/web
cp src/styles/forest-sand-stage-a.css src/styles/forest-sand-stage-a.css.before-homepage-fix.bak
unzip -o ~/Downloads/AmaanTrader-Homepage-Layout-Fix.zip -d .
```

Then validate:

```bash
npm run check && npm run build
```

Then run `npm run dev` and open the homepage. Use Ctrl+Home to return to the top before checking the hero.

## Visual checks

- At 1366px: four category cards should appear in one row, each with its image and label contained inside the card.
- At 800px and below: the cards should wrap to two columns.
- At 560px and below: two compact columns should remain with no horizontal overflow.
- The `01 / THE COLLECTION` heading and its paragraph should remain above the category cards, with no overlap.
