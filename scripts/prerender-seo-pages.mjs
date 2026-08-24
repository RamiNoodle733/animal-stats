import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { getAnimals, renderHtml } = require('../lib/seo-renderer.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const astroOutput = path.join(root, '.cache', 'astro-dist', 'stats');
const statsOutput = path.join(root, 'stats');

const fixedPages = [
  { route: '/about', file: 'about.html' },
  { route: '/stats', file: 'stats.html' },
  { route: '/compare', file: 'compare.html' },
  { route: '/rankings', file: 'rankings.html' },
  { route: '/community', file: 'community.html' },
  { route: '/tournament', file: 'tournament.html' }
];

function writeRenderedPage(route, filePath) {
  const html = renderHtml(route);
  if (!html) {
    throw new Error(`No SEO HTML rendered for ${route}`);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, html);
}

function buildAstroAnimalPages() {
  execFileSync(process.execPath, [path.join(root, 'scripts', 'assets', 'generate-animal-image-dimensions.js')], {
    cwd: root,
    stdio: 'inherit'
  });
  execFileSync(process.execPath, [path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs'), 'build'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }
  });

  if (!fs.existsSync(astroOutput)) {
    throw new Error('Astro did not produce the expected animal page directory.');
  }
  fs.mkdirSync(statsOutput, { recursive: true });

  const generated = fs.readdirSync(astroOutput, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'));
  if (generated.length !== getAnimals().length) {
    throw new Error(`Astro produced ${generated.length} animal pages; expected ${getAnimals().length}.`);
  }
  for (const entry of generated) {
    fs.copyFileSync(path.join(astroOutput, entry.name), path.join(statsOutput, entry.name));
  }
}

function removeStaleAnimalPages(validFiles) {
  const statsDir = 'stats';
  if (!fs.existsSync(statsDir)) return;

  for (const entry of fs.readdirSync(statsDir, { withFileTypes: true })) {
    const filePath = path.join(statsDir, entry.name);
    if (entry.isFile() && entry.name.endsWith('.html') && !validFiles.has(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

let written = 0;

for (const page of fixedPages) {
  writeRenderedPage(page.route, page.file);
  written += 1;
}

const validAnimalFiles = new Set();
for (const animal of getAnimals()) {
  const filePath = path.join('stats', `${animal.slug}.html`);
  validAnimalFiles.add(filePath);
  written += 1;
}

buildAstroAnimalPages();
removeStaleAnimalPages(validAnimalFiles);

console.log(`Prerendered ${fixedPages.length} compatibility pages and ${getAnimals().length} Astro animal pages (${written} total).`);
