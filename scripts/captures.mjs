// Régénère les captures de la documentation et l'image de partage (docs/captures/).
//   npm run captures
import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, config } from './lib.mjs';

const out = join(ROOT, 'docs', 'captures');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

async function shoot(entry, { width, height, scale, mobile, file, steps = [] }) {
  const ctx = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: scale, isMobile: mobile, hasTouch: mobile,
    colorScheme: config.captures?.colorScheme ?? 'light', locale: 'fr-FR', timezoneId: 'Europe/Paris',
  });
  const page = await ctx.newPage();
  await page.route(/^https?:\/\//, (r) => r.abort());
  await page.goto(pathToFileURL(join(ROOT, entry.out)).href + (entry.captures?.query ?? ''));
  await page.waitForTimeout(entry.captures?.wait ?? 1500);
  for (const s of steps) {
    if (s.repeat) {
      for (let i = 0; i < (s.max ?? 10); i++) {
        const el = page.locator(s.repeat).first();
        if (!(await el.isVisible())) break;
        await el.click();
        await page.waitForTimeout(250);
      }
    }
    if (s.click) await page.locator(s.click).first().click();
    if (s.eval) await page.evaluate(s.eval);
    await page.waitForTimeout(s.wait ?? 500);
  }
  const path = join(out, file);
  await page.screenshot({ path });
  await ctx.close();
  console.log(`✓ docs/captures/${file}`);
  return path;
}

const shots = [];
for (const entry of config.pages.filter((p) => p.captures !== false)) {
  const id = entry.site.replace(/\.html$/, '');
  const c = entry.captures ?? {};
  shots.push({
    entry,
    desktop: await shoot(entry, { width: 1440, height: 900, scale: 1, mobile: false, file: `${id}-bureau.png`, steps: c.desktop }),
    mobile: await shoot(entry, { width: 390, height: 844, scale: 2, mobile: true, file: `${id}-mobile.png`, steps: c.mobile }),
  });
}

// Image de partage 1280 × 640 (Settings → Social preview, et aperçu des liens sur X).
const card = config.card ?? {};
const main = shots[0];
const img = (p) => `data:image/png;base64,${readFileSync(p).toString('base64')}`;
const ctx = await browser.newContext({ viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  *{box-sizing:border-box;margin:0}
  body{width:1280px;height:640px;overflow:hidden;font-family:-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;
    background:${card.background ?? '#0f1513'};color:${card.ink ?? '#f4f6f5'};position:relative}
  .glow{position:absolute;inset:0;background:radial-gradient(900px 520px at 85% 30%, ${card.accent ?? '#2e8b62'}55, transparent 70%)}
  .txt{position:absolute;left:72px;top:0;bottom:0;width:440px;display:flex;flex-direction:column;justify-content:center;gap:22px}
  .kicker{font-size:17px;letter-spacing:.14em;text-transform:uppercase;color:${card.accent ?? '#2e8b62'};font-weight:700;filter:brightness(1.35)}
  h1{font-size:76px;line-height:.95;letter-spacing:-.03em;font-weight:800}
  p{font-size:23px;line-height:1.35;opacity:.86}
  .meta{font-size:16px;opacity:.6;letter-spacing:.02em}
  .desk{position:absolute;left:650px;top:86px;width:820px;border-radius:14px;box-shadow:0 30px 80px rgba(0,0,0,.45),0 0 0 1px rgba(255,255,255,.08)}
  .phone{position:absolute;left:560px;top:250px;width:196px;border-radius:26px;border:6px solid #0b0d0c;box-shadow:0 26px 60px rgba(0,0,0,.5)}
</style></head><body><div class="glow"></div>
  <div class="txt"><div class="kicker">${card.kicker ?? ''}</div><h1>${config.name}</h1><p>${card.tagline ?? ''}</p>
  <div class="meta">github.com/${config.repo}</div></div>
  <img class="desk" src="${img(main.desktop)}"><img class="phone" src="${img(main.mobile)}">
</body></html>`);
await page.waitForTimeout(300);
await page.screenshot({ path: join(out, 'carte-sociale.png') });
console.log('✓ docs/captures/carte-sociale.png');
await browser.close();
