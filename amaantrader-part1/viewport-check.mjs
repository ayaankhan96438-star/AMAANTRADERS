import { chromium } from "playwright";
const url = process.env.AMAAN_URL || "http://localhost:5173/AMAANTRADERS/";
const sizes = [[1366,650],[1366,768],[1440,900],[1920,1080],[768,1024],[390,844]];
const browser = await chromium.launch({headless:true});
const page = await browser.newPage();
for (const [width,height] of sizes) {
  await page.setViewportSize({width,height});
  await page.goto(url,{waitUntil:"networkidle"});
  const r = await page.evaluate(() => {
    const box = s => {
      const e=document.querySelector(s); if(!e) return null;
      const b=e.getBoundingClientRect();
      return {top:Math.round(b.top),bottom:Math.round(b.bottom),left:Math.round(b.left),right:Math.round(b.right)};
    };
    const hero=box(".hero"), buttons=box(".hero-buttons"), note=box(".hero-note"), marquee=box(".endless-line");
    const overlap=(a,b)=>!!a&&!!b&&a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
    return {
      hero, label:box(".hero .eyebrow"), title:box(".hero h1"), buttons, note, marquee,
      buttonsInsideHero:!!hero&&!!buttons&&buttons.top>=hero.top&&buttons.bottom<=hero.bottom+1,
      noteOverlapsButtons:overlap(buttons,note),
      marqueeOverlapsHero:!!hero&&!!marquee&&marquee.top<hero.bottom-1,
      horizontalOverflow:document.documentElement.scrollWidth>innerWidth
    };
  });
  const pass=r.buttonsInsideHero&&!r.noteOverlapsButtons&&!r.marqueeOverlapsHero&&!r.horizontalOverflow;
  console.log(`${pass?"PASS":"CHECK"} ${width}x${height}`,JSON.stringify(r));
  await page.screenshot({path:`part1-${width}x${height}.png`,fullPage:true});
}
await browser.close();
