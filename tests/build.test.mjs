// Intégrité des fichiers construits : à jour, autonomes, bien formés, sans trace personnelle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { ROOT, config, buildAll, externalResources, privacyFindings } from '../scripts/lib.mjs';

const pages = buildAll();

for (const page of pages) {
  test(`${page.out} correspond exactement à src/ (npm run build)`, () => {
    assert.ok(existsSync(join(ROOT, page.out)), `${page.out} absent`);
    assert.equal(readFileSync(join(ROOT, page.out), 'utf8'), page.html);
  });

  test(`${page.out} ne charge aucune ressource externe`, () => {
    assert.deepEqual(externalResources(page.html), []);
  });

  test(`${page.out} est un document complet`, () => {
    const h = page.html;
    assert.match(h, /^<!doctype html>/i);
    assert.match(h, /<html\s[^>]*\blang="[a-z]{2}(-[A-Z]{2})?"/);
    assert.match(h, /<meta charset="utf-8"\s*\/?>/i);
    assert.match(h, /<meta name="viewport" content="[^"]*width=device-width/);
    assert.match(h, /<title>[^<]{2,}<\/title>/);
    assert.match(h, /<meta name="description" content="[^"]{20,}"\s*\/?>/);
    assert.ok(h.indexOf('<title>') < h.indexOf('</head>'), '<title> doit être dans <head>');
  });

  test(`${page.out} porte la mention de droits`, () => {
    assert.match(page.html, /© \d{4} Florian Iglesias/);
  });

  if (!page.prebuilt) {

    test(`${page.src} : chaque fichier référencé existe`, () => {
      const tpl = readFileSync(join(ROOT, page.src), 'utf8');
      for (const [, ref] of tpl.matchAll(/(?:href|src)="((?:styles|js|vendor|data)\/[^"]+)"/g)) {
        assert.ok(existsSync(join(dirname(join(ROOT, page.src)), ref)), `${ref} introuvable`);
      }
    });
  }
}

test('aucun fichier orphelin dans src/', () => {
  if (!existsSync(join(ROOT, 'src'))) return;
  const used = new Set();
  for (const p of config.pages.filter((p) => !p.prebuilt)) {
    const tpl = readFileSync(join(ROOT, p.src), 'utf8');
    for (const [, ref] of tpl.matchAll(/(?:href|src)="([^"]+)"/g)) used.add(join(dirname(join(ROOT, p.src)), ref));
  }
  const walk = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : [join(d, n)]));
  const orphans = walk(join(ROOT, 'src'))
    .filter((f) => /\.(js|css)$/.test(f) && !used.has(f))
    .map((f) => relative(ROOT, f));
  assert.deepEqual(orphans, []);
});

test('aucune donnée personnelle, aucun jeton, aucun lien privé dans le dépôt', () => {
  assert.deepEqual(privacyFindings(), []);
});
