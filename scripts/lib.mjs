// Outils partagés par le build, la vérification et les tests. Aucune dépendance.
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const config = JSON.parse(readFileSync(join(ROOT, 'build.config.json'), 'utf8'));

const MIME = {
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
};

const read = (p) => readFileSync(p, 'utf8');
const isLocal = (u) => !/^(?:[a-z]+:|\/\/|\/|#)/i.test(u);

/** Remplace les url() relatives d'une feuille de style par des data: URI (polices, images). */
export function inlineCssUrls(css, cssFile) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (whole, q, url) => {
    if (!isLocal(url)) return whole;
    const file = resolve(dirname(cssFile), url);
    const mime = MIME[extname(file).toLowerCase()];
    if (!mime) throw new Error(`Type inconnu pour ${relative(ROOT, file)}`);
    return `url("data:${mime};base64,${readFileSync(file).toString('base64')}")`;
  });
}

const attr = (tag, name) => (tag.match(new RegExp(`\\s${name}="([^"]*)"`)) || [])[1];
const strip = (attrs, ...names) => names.reduce((a, n) => a.replace(new RegExp(`\\s${n}="[^"]*"`), ''), attrs);

/**
 * Assemble un gabarit de src/ en un seul fichier HTML :
 * - <link rel="stylesheet" href="styles/…"> devient <style>…</style> ;
 * - <script src="js/…"></script> devient <script>…</script> ;
 * - les balises consécutives qui partagent un data-bundle sont fusionnées en une seule.
 */
export function assemble(templateFile, { banner = '' } = {}) {
  const base = dirname(templateFile);
  let html = read(templateFile);

  const LINK = /<link rel="stylesheet" href="([^"]+)"(?: data-bundle="([^"]+)")?>/;
  const SCRIPT = /<script((?:\s(?!src=)[^\s>]+(?:="[^"]*")?)*) src="([^"]+)"(?: data-bundle="([^"]+)")?><\/script>/;

  const fuse = (rx, render) => {
    let out = '', rest = html, m;
    while ((m = rest.match(rx))) {
      out += rest.slice(0, m.index);
      rest = rest.slice(m.index + m[0].length);
      if (!isLocal(m[m.length - 2])) { out += m[0]; continue; }
      const bundle = m[m.length - 1];
      const group = [m];
      while (bundle) {
        const next = rest.match(new RegExp('^\\s*' + rx.source));
        if (!next || next[next.length - 1] !== bundle) break;
        group.push(next);
        rest = rest.slice(next[0].length);
      }
      out += render(group);
    }
    html = out + rest;
  };

  fuse(LINK, (g) => '<style>' + g.map((m) => {
    const f = join(base, m[1]);
    return inlineCssUrls(read(f), f);
  }).join('') + '</style>');

  fuse(SCRIPT, (g) => `<script${g[0][1]}>` + g.map((m) => read(join(base, m[2]))).join('') + '</script>');

  if (banner) html = html.replace(/^(<!doctype html>)/i, `$1\n<!-- ${banner} -->`);
  return html;
}

export function bannerText() {
  if (config.banner === false) return '';
  const year = config.year ?? 2026;
  return `${config.name} · © ${year} Florian Iglesias — ${config.lang === 'en' ? 'All rights reserved' : 'Tous droits réservés'} · https://github.com/${config.repo}`;
}

export function buildAll({ raw = false } = {}) {
  return config.pages.map((p) => ({
    ...p,
    html: p.prebuilt ? read(join(ROOT, p.out)) : assemble(join(ROOT, p.src), { banner: raw ? '' : bannerText() }),
  }));
}

/* ---------- Contrôles ---------- */

/** Ressources chargées depuis le réseau (les liens <a href> vers l'extérieur sont permis). */
export function externalResources(html) {
  const hits = [];
  const rules = [
    [/<(?:script|img|iframe|source|video|audio|embed|track|input)\b[^>]*?\ssrc=["']?(?:https?:)?\/\/[^"'\s>]+/gi, 'src'],
    [/<link\b(?=[^>]*\brel=["']?(?:stylesheet|preload|preconnect|dns-prefetch|modulepreload|icon|manifest|prefetch)\b)[^>]*\bhref=["']?(?:https?:)?\/\/[^"'\s>]+/gi, 'link'],
    [/url\(\s*['"]?(?:https?:)?\/\/[^)'"]+/gi, 'url()'],
    [/@import\s+(?:url\()?\s*['"]?(?:https?:)?\/\//gi, '@import'],
    [/\bimport\s*\(\s*['"`]https?:\/\//gi, 'import()'],
    [/\bfrom\s+['"]https?:\/\//gi, 'import'],
  ];
  for (const [rx, kind] of rules) for (const m of html.matchAll(rx)) hits.push(`${kind}: ${m[0].slice(0, 120)}`);
  return hits;
}

export function trackedFiles() {
  try {
    return execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' }).split('\0').filter(Boolean);
  } catch {
    const walk = (d) => readdirSync(d).flatMap((n) => {
      if (['.git', 'node_modules', 'test-results', 'playwright-report'].includes(n)) return [];
      const p = join(d, n);
      return statSync(p).isDirectory() ? walk(p) : [relative(ROOT, p).split(sep).join('/')];
    });
    return walk(ROOT);
  }
}

const BINARY = /\.(png|jpe?g|gif|webp|ico|woff2?|ttf|zip|pdf)$/i;

/** Données personnelles, secrets et adresses de travail qui ne doivent jamais être publiés. */
export function privacyFindings() {
  const rules = [
    [/[A-Z0-9._%+-]+@(?!users\.noreply\.github\.com|example\.(?:com|org|net)\b)[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, 'adresse e-mail'],
    [/claude\.ai\/(?:artifact|chat|share|code|project)s?\//gi, 'lien privé de l’hébergeur'],
    [/\b(?:(?:sk-ant-|sk-proj-|ghp_|gho_|github_pat_|xox[bp]-)[\w-]{10,}|AKIA[0-9A-Z]{16})/g, 'jeton'],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, 'clé privée'],
    [/\bfile_uuid\b/g, 'identifiant interne'],
  ];
  const local = join(ROOT, '.prive-termes.txt');
  if (existsSync(local)) {
    for (const t of read(local).split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))) {
      rules.push([new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), 'terme personnel']);
    }
  }
  // Domaines réservés aux exemples (RFC 2606) et adresses techniques de GitHub : jamais personnels.
  const reserved = ['@[\\w.-]+\\.(?:example|test|invalid|localhost)$', '@users\\.noreply\\.github\\.com$'];
  const allow = [...reserved, ...(config.privacy?.allow ?? [])].map((s) => new RegExp(s, 'i'));
  const skip = new Set(['package-lock.json', '.prive-termes.txt', ...(config.privacy?.skip ?? [])]);
  const out = [];
  for (const f of trackedFiles()) {
    if (BINARY.test(f) || skip.has(f) || !existsSync(join(ROOT, f))) continue;
    const text = read(join(ROOT, f));
    for (const [rx, label] of rules) {
      for (const m of text.matchAll(rx)) {
        if (allow.some((a) => a.test(m[0]))) continue;
        out.push(`${f}: ${label} « ${m[0].slice(0, 60)} »`);
      }
    }
  }
  return out;
}
