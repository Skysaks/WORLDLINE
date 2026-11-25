// Serveur de développement : reconstruit dist/ à chaque modification de src/ et le sert en local.
//   npm run dev   →   http://localhost:5173
import { createServer } from 'node:http';
import { watch, readFileSync, existsSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { execFileSync } from 'node:child_process';
import { ROOT, config } from './lib.mjs';

const port = Number(process.env.PORT) || 5173;
const build = () => {
  try { execFileSync(process.execPath, [join(ROOT, 'scripts/build.mjs')], { stdio: 'inherit' }); }
  catch { console.error('build en échec : corriger puis enregistrer'); }
};
build();
let timer;
watch(join(ROOT, 'src'), { recursive: true }, () => { clearTimeout(timer); timer = setTimeout(build, 120); });

const routes = Object.fromEntries(config.pages.map((p) => [p.site, p.out]));
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || config.pages[0].site;
  const file = routes[path] ? join(ROOT, routes[path]) : join(ROOT, 'dist', normalize(path).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404).end('introuvable'); return; }
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
}).listen(port, '127.0.0.1', () => console.log(`→ http://localhost:${port}/`));
