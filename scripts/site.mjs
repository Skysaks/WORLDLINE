// Prépare le site statique publié sur GitHub Pages (branche gh-pages) dans _site/.
//   node scripts/site.mjs
import { mkdirSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, config } from './lib.mjs';

const site = join(ROOT, '_site');
rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
for (const p of config.pages) {
  copyFileSync(join(ROOT, p.out), join(site, p.site));
  console.log(`✓ ${p.out} → _site/${p.site}`);
}
writeFileSync(join(site, '.nojekyll'), '');
writeFileSync(join(site, 'robots.txt'), 'User-agent: *\nAllow: /\n');
