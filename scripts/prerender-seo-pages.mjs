import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { getAnimals, renderHtml } = require('../lib/seo-renderer.js');

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
  writeRenderedPage(`/stats/${animal.slug}`, filePath);
  validAnimalFiles.add(filePath);
  written += 1;
}

removeStaleAnimalPages(validAnimalFiles);

console.log(`Prerendered ${written} static SEO pages.`);
