# AmaanTrader — Part 1 patch pack

## Files
- `hero-part1.css`: minimal CSS override to append to your existing stylesheet.
- `style.css`: complete supplied stylesheet with the override appended (copy/paste reference).
- `animations.js`: supplied Part 1 Motion/Lenis module with Motion imports consolidated.
- `apply-part1.sh`: safe installer that backs up files, appends only the hero CSS patch, consolidates the Motion imports, and installs pinned dependencies.
- `push-to-github.sh`: stages changes, asks before committing, then pushes the current branch.
- `viewport-check.mjs`: optional Playwright geometry test for all six requested sizes.

## Apply
Extract the ZIP. Open a terminal in the actual repository root (the directory containing `package.json`), then run:
`bash /path/to/amaantrader-part1/apply-part1.sh`

The installer checks that `src/` imports the root `style.css`; it will stop if it cannot verify this. It backs up the existing files in `.part1-backup/<timestamp>/` and appends only the CSS patch, so it does not replace your full stylesheet or rewrite shopping code.

## Viewport tests
Optional:
`npm install -D playwright && npx playwright install chromium`
Then:
`AMAAN_URL=http://localhost:5173/AMAANTRADERS/ node /path/to/amaantrader-part1/viewport-check.mjs`

It reports button containment, counter/button overlap, marquee/hero overlap and horizontal overflow, and saves screenshots for the six requested sizes.

## Push
After checking the site and `git diff`, run:
`bash /path/to/amaantrader-part1/push-to-github.sh`
It asks for confirmation, commits all staged changes, and pushes to the current branch's configured remote. GitHub Pages must already be configured to deploy that branch/build.

## Important limits from the supplied files
The uploaded `index.html` mounts `#root` and loads `/src/main.tsx`; this is a Vite React entry, despite the request describing a plain-HTML app. The uploaded vanilla `script.js` is not referenced by that HTML file. `package.json`, `src/main.tsx`, full homepage markup, local image assets, actual live URL and screenshot were not attached. The installer therefore validates the real stylesheet import before changing anything.

No Lighthouse baseline/after measurement or real browser viewport run was possible here. Product photos in `products.json` are external third-party URLs; no local originals were supplied to convert to WebP/AVIF. The stray gold dot cannot be identified without the actual rendered homepage markup/screenshot. The supplied CSS contains `.mini-dot`, but it does not establish that this is the logo dot, so it is not removed blindly.
