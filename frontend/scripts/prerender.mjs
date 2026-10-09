/**
 * Build-time head-only prerender driver.
 *
 * Runs AFTER `vite build`. Bundles prerender.tsx (public pages) for Node with esbuild,
 * renders each SITEMAP_PATHS route to capture its react-helmet-async <head>, then splices
 * those tags into the built dist/<path>/index.html between the SEO_HEAD markers. The body
 * and hashed asset references are left byte-identical, so the SPA hydrates exactly as
 * before — this only fixes what non-JS crawlers and social scrapers see.
 *
 * Failures are non-fatal: if a page can't render, that route keeps the existing shell.
 */
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dist = join(root, 'dist');
const outDir = join(root, 'scripts', '.out');

const START = '<!-- SEO_HEAD_START';
const END = '<!-- SEO_HEAD_END';

async function main() {
  // Some store modules (e.g. authStore) read web storage at import time to hydrate their
  // initial state. Install an in-memory shim before the prerender bundle is imported so
  // those module-init side effects don't throw under Node.
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      key: (i) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    };
  }
  if (typeof globalThis.sessionStorage === 'undefined') {
    globalThis.sessionStorage = globalThis.localStorage;
  }

  const outfile = join(outDir, 'prerender.mjs');
  await build({
    entryPoints: [join(root, 'prerender.tsx')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node18',
    jsx: 'automatic',
    // Load every node_module natively (react, react-dom/server, router, helmet, query):
    // ONE shared react instance and no CJS `require` boundaries that ESM output can't
    // emit. Caveat: this installed react-router-dom has no `exports` map, so the bare
    // subpath `react-router-dom/server` is not Node-resolvable when left external —
    // prerender.tsx imports the concrete `.../server.mjs` file for that reason.
    packages: 'external',
    // Vite injects import.meta.env at build; this standalone esbuild pass must supply it
    // so legal/marketing pages that read VITE_LEGAL_ENTITY_* render far enough to emit
    // their <head>. The per-route body is NOT prerendered (only head is spliced into the
    // Vite-built shell), so these values never ship in output — they only unblock render.
    define: {
      'import.meta.env': JSON.stringify({
        MODE: 'production',
        PROD: 'true',
        BASE_URL: '/',
        VITE_LEGAL_ENTITY_NAME: process.env.VITE_LEGAL_ENTITY_NAME ?? '',
        VITE_LEGAL_ENTITY_ADDRESS: process.env.VITE_LEGAL_ENTITY_ADDRESS ?? '',
      }),
    },
    outfile,
    alias: { '@': join(root, 'src') },
    // Node must not try to parse styles or binary assets imported transitively.
    loader: {
      '.css': 'empty',
      '.svg': 'empty',
      '.png': 'empty',
      '.jpg': 'empty',
      '.jpeg': 'empty',
      '.webp': 'empty',
      '.gif': 'empty',
      '.avif': 'empty',
      '.woff': 'empty',
      '.woff2': 'empty',
    },
    logLevel: 'warning',
  });

  const mod = await import(pathToFileURL(outfile).href);
  const { renderHeadTags, SITEMAP_PATHS } = mod;

  const shellPath = join(dist, 'index.html');
  const shell = readFileSync(shellPath, 'utf8');
  const startAt = shell.indexOf(START);
  const endAt = shell.indexOf(END);
  if (startAt === -1 || endAt === -1) {
    console.warn('[prerender] markers not found in dist/index.html — skipping (SPA still works).');
    return;
  }
  const startOpen = shell.indexOf('-->', startAt);
  const headBefore = shell.slice(0, startOpen + 3);
  const headAfter = shell.slice(endAt);

  let ok = 0;
  let skipped = 0;
  for (const { path: routePath } of SITEMAP_PATHS) {
    const head = renderHeadTags(routePath);
    if (!head) {
      skipped += 1;
      continue;
    }
    const html = `${headBefore}\n    ${head}\n    ${headAfter}`;
    const rel = routePath === '/' ? '' : routePath.replace(/^\/+/, '').replace(/\/+$/, '');
    const outPath = rel === '' ? shellPath : join(dist, rel, 'index.html');
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html, 'utf8');
    ok += 1;
  }
  console.log(`[prerender] wrote heads for ${ok} routes (${skipped} left on shell).`);
}

main().catch((err) => {
  console.warn(`[prerender] non-fatal failure: ${err?.message ?? err}`);
});
