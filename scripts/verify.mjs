// Contrôles avant publication : fichiers autonomes et confidentialité.
//   node scripts/verify.mjs
import { buildAll, externalResources, privacyFindings, config } from './lib.mjs';

let problems = 0;
for (const page of buildAll()) {
  const kb = Buffer.byteLength(page.html) / 1024;
  const ext = externalResources(page.html);
  const budget = page.budgetKo ?? config.budgetKo ?? 1024;
  if (ext.length) { problems += ext.length; console.error(`✗ ${page.out} : ${ext.length} ressource(s) externe(s)\n  ${ext.join('\n  ')}`); }
  else console.log(`✓ ${page.out} : autonome, aucune ressource externe`);
  if (kb > budget) { problems++; console.error(`✗ ${page.out} : ${kb.toFixed(0)} Ko, budget ${budget} Ko`); }
  else console.log(`✓ ${page.out} : ${kb.toFixed(0)} Ko (budget ${budget} Ko)`);
}
const priv = privacyFindings();
if (priv.length) { problems += priv.length; console.error(`✗ confidentialité :\n  ${priv.join('\n  ')}`); }
else console.log('✓ confidentialité : aucune adresse, aucun jeton, aucun lien privé');
process.exit(problems ? 1 : 0);
