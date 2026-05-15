# SEO Indexing Checklist

## What Was Wrong

Google Search Console could read `https://animalbattlestats.com/sitemap.xml`, but most sitemap URLs were SPA fallback pages. Animal URLs such as `/stats/african-elephant` returned `200`, yet the initial HTML was the same `index.html` shell as the homepage:

- Homepage title and description.
- Homepage canonical URL.
- No crawlable animal-specific profile content before JavaScript.
- Multiple template headings from inactive views.

That made many discovered animal URLs look duplicate or thin to crawlers even though the client-side app could render them for users.

## What Changed

- Public routes now render crawlable HTML through `api/seo.js` while keeping the same browser URLs and client-side app behavior.
- Animal pages at `/stats/<slug>` include unique title, description, canonical, H1, structured data, stats, habitat, diet, measurements, description, and internal links.
- `sitemap.xml` is generated from `animal_stats.json` and includes only canonical public URLs.
- `robots.txt` remains permissive and points to the sitemap.
- `scripts/seo-audit.mjs` checks sitemap URLs for status, redirects, title, description, canonical, noindex, and H1 coverage.

## How To Run The Audit

Regenerate the sitemap:

```bash
npm run seo:sitemap
```

Audit production:

```bash
npm run seo:audit -- --write
```

Audit a local Vercel dev server:

```bash
vercel dev
npm run seo:audit -- --sitemap sitemap.xml --base http://localhost:3000 --write
```

The JSON report is written to `reports/seo-audit.json` when `--write` is passed.

## Google Search Console After Deploy

1. Inspect these URLs first:
   - `https://animalbattlestats.com/`
   - `https://animalbattlestats.com/stats`
   - `https://animalbattlestats.com/stats/african-elephant`
   - `https://animalbattlestats.com/stats/great-white-shark`
   - `https://animalbattlestats.com/rankings`
2. Use URL Inspection and confirm Google sees the final canonical as the inspected URL.
3. Confirm rendered HTML contains the animal name, stats, habitat, diet, and profile content.
4. Resubmit `https://animalbattlestats.com/sitemap.xml` if the sitemap timestamp has not refreshed.
5. Request validation for:
   - Discovered - currently not indexed
   - Crawled - currently not indexed
   - Page with redirect, if any old examples remain

## Ongoing Checks

- Run `npm run seo:sitemap` whenever animal data changes.
- Run `npm run seo:audit -- --write` after each deployment that touches routes, metadata, sitemap, or animal data.
- Keep auth, profile, API, and other private or low-value utility routes out of the sitemap.
- Do not use `robots.txt` for noindex behavior.
