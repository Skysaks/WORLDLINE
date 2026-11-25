// Construit les fichiers autonomes de dist/ à partir de src/.
//   node scripts/build.mjs           écrit dist/
//   node scripts/build.mjs --check   échoue si dist/ n'est pas à jour (CI)
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { ROOT, buildAll, externalResources } from './lib.mjs';

const check = process.argv.includes('--check');
const raw = process.argv.includes('--raw');
let failed = false;

for (const page of buildAll({ raw })) {
  const out = join(ROOT, page.out);
  const external = externalResources(page.html);
  if (external.length) {
    console.error(`✗ ${page.out} charge des ressources externes :\n  ${external.join('\n  ')}`);
    failed = true;
  }
  const size = `${Math.round(Buffer.byteLength(page.html) / 1024)} Ko`;
  if (check) {
    const same = existsSync(out) && readFileSync(out, 'utf8') === page.html;
    console.log(`${same ? '✓' : '✗'} ${page.out} ${same ? 'à jour' : 'diffère de src/ : lancer npm run build'} (${size})`);
    if (!same) failed = true;
  } else if (!page.prebuilt) {
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, page.html);
    console.log(`✓ ${page.out} (${size})`);
  } else {
    console.log(`= ${page.out} (fichier livré tel quel, ${size})`);
  }
}
process.exit(failed ? 1 : 0);
