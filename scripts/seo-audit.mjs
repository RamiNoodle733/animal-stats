import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_SITEMAP = 'https://animalbattlestats.com/sitemap.xml';

function parseArgs(argv) {
  const options = {
    sitemap: DEFAULT_SITEMAP,
    base: '',
    write: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--sitemap') options.sitemap = argv[++i];
    else if (arg === '--base') options.base = argv[++i].replace(/\/+$/, '');
    else if (arg === '--write') options.write = true;
  }

  return options;
}

function extractUrls(xml) {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeXml(match[1]));
}

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

async function readSitemap(sitemap) {
  if (/^https?:\/\//i.test(sitemap)) {
    const response = await fetch(sitemap);
    if (!response.ok) throw new Error(`Failed to fetch sitemap ${sitemap}: ${response.status}`);
    return response.text();
  }
  return fs.readFileSync(sitemap, 'utf8');
}

function getTag(html, pattern) {
  const match = html.match(pattern);
  return match ? match[1].trim() : '';
}

function hasNoindex(html) {
  return /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html);
}

function h1Count(html) {
  return (html.match(/<h1\b/gi) || []).length;
}

function hasValidH1(url, count) {
  const pathname = new URL(url).pathname;
  return pathname === '/' ? count > 0 : count === 1;
}

function titleFrom(html) {
  return getTag(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s+/g, ' ');
}

function descriptionFrom(html) {
  return getTag(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
}

function canonicalFrom(html) {
  return getTag(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i);
}

function toAuditUrl(url, base) {
  if (!base) return url;
  const original = new URL(url);
  return `${base}${original.pathname}`;
}

async function auditUrl(url, options) {
  const requestedUrl = toAuditUrl(url, options.base);
  const manual = await fetch(requestedUrl, { redirect: 'manual' });
  const location = manual.headers.get('location') || '';
  const redirected = manual.status >= 300 && manual.status < 400;

  let finalUrl = requestedUrl;
  let status = manual.status;
  let html = '';

  if (!redirected) {
    finalUrl = manual.url;
    status = manual.status;
    html = await manual.text();
  } else {
    const followed = await fetch(requestedUrl);
    finalUrl = followed.url;
    status = followed.status;
    html = await followed.text();
  }

  const canonical = canonicalFrom(html);
  const expectedCanonical = url;
  const primaryH1Count = h1Count(html);

  return {
    url,
    checkedUrl: requestedUrl,
    status,
    redirected,
    finalUrl,
    redirectLocation: location,
    title: titleFrom(html),
    hasTitle: Boolean(titleFrom(html)),
    hasDescription: Boolean(descriptionFrom(html)),
    canonical,
    canonicalMatches: canonical === expectedCanonical,
    noindex: hasNoindex(html),
    h1Count: primaryH1Count,
    hasH1: hasValidH1(url, primaryH1Count)
  };
}

const options = parseArgs(process.argv.slice(2));
const sitemapXml = await readSitemap(options.sitemap);
const urls = extractUrls(sitemapXml);

const results = [];
for (const url of urls) {
  try {
    results.push(await auditUrl(url, options));
  } catch (error) {
    results.push({
      url,
      checkedUrl: toAuditUrl(url, options.base),
      status: 'ERROR',
      redirected: false,
      finalUrl: '',
      redirectLocation: '',
      title: '',
      hasTitle: false,
      hasDescription: false,
      canonical: '',
      canonicalMatches: false,
      noindex: false,
      h1Count: 0,
      hasH1: false,
      error: error.message
    });
  }
}

const rows = results.map((result) => ({
  status: result.status,
  redirected: result.redirected ? 'yes' : 'no',
  path: new URL(result.url).pathname,
  title: result.hasTitle ? 'yes' : 'no',
  desc: result.hasDescription ? 'yes' : 'no',
  canonical: result.canonicalMatches ? 'match' : 'bad',
  noindex: result.noindex ? 'yes' : 'no',
  h1: result.h1Count
}));

console.table(rows);

const failures = results.filter((result) => (
  result.status !== 200 ||
  result.redirected ||
  !result.hasTitle ||
  !result.hasDescription ||
  !result.canonicalMatches ||
  result.noindex ||
  !result.hasH1
));

console.log(`Audited ${results.length} URLs. Failures: ${failures.length}.`);

if (options.write) {
  fs.mkdirSync('reports', { recursive: true });
  const reportPath = path.join('reports', 'seo-audit.json');
  fs.writeFileSync(reportPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), options, results, failures }, null, 2)}\n`);
  console.log(`Wrote ${reportPath}`);
}

if (failures.length > 0) {
  process.exitCode = 1;
}
