// Parcours de bout en bout sur les fichiers construits, ouverts depuis le disque, réseau coupé.
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const config = JSON.parse(readFileSync(join(ROOT, 'build.config.json'), 'utf8'));
const IGNORE = (config.e2e?.ignoreConsole ?? []).map((s) => new RegExp(s));

async function open(page, entry) {
  const errors = [];
  const requests = [];
  page.on('pageerror', (e) => errors.push(`exception : ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE.some((rx) => rx.test(m.text()))) errors.push(`console : ${m.text()}`);
  });
  page.on('request', (r) => { if (/^https?:/.test(r.url())) requests.push(r.url()); });
  await page.route(/^https?:\/\//, (r) => r.abort());
  await page.goto(pathToFileURL(join(ROOT, entry.out)).href + (entry.e2e?.query ?? ''));
  await expect(page.locator(entry.e2e?.ready ?? 'body').first()).toBeVisible();
  await page.waitForTimeout(600);
  return { errors, requests };
}

async function run(page, steps = []) {
  for (const step of steps) {
    if (step.repeat) {
      // Clique tant que l'élément est visible (assistant d'accueil en plusieurs écrans, par exemple).
      for (let i = 0; i < (step.max ?? 10); i++) {
        const el = page.locator(step.repeat).first();
        if (!(await el.isVisible())) break;
        await el.click();
        await page.waitForTimeout(250);
      }
    }
    if (step.click) await page.locator(step.click).first().click();
    if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
    if (step.press) await page.keyboard.press(step.press);
    if (step.see) await expect(page.locator(step.see).first()).toBeVisible();
    if (step.text) await expect(page.locator(step.text[0]).first()).toContainText(step.text[1]);
    await page.waitForTimeout(step.wait ?? 250);
  }
}

for (const entry of config.pages) {
  test.describe(entry.site, () => {
    test('s’ouvre hors ligne, sans erreur ni requête réseau', async ({ page }) => {
      const { errors, requests } = await open(page, entry);
      expect(errors).toEqual([]);
      expect(requests).toEqual([]);
    });

    test('tient dans la largeur de l’écran', async ({ page }) => {
      await open(page, entry);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });

    for (const flow of entry.e2e?.flows ?? []) {
      test(`parcours : ${flow.name}`, async ({ page }, info) => {
        test.skip(flow.only && flow.only !== info.project.name, `réservé à ${flow.only}`);
        const { errors, requests } = await open(page, entry);
        await run(page, flow.steps);
        expect(errors).toEqual([]);
        expect(requests).toEqual([]);
        if (info.project.name === 'mobile') {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          expect(overflow, 'débordement horizontal').toBeLessThanOrEqual(1);
        }
      });
    }
  });
}
