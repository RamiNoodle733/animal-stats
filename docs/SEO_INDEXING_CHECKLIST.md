# SEO Indexing Checklist

## What Was Wrong

Google Search Console could read `https://animalbattlestats.com/sitemap.xml`, but most sitemap URLs were SPA fallback pages. Animal URLs such as `/stats/african-elephant` returned `200`, yet the initial HTML was the same `index.html` shell as the homepage:

- Homepage title and description.
- Homepage canonical URL.
- No crawlable animal-specific profile content before JavaScript.
- Multiple template headings from inactive views.

That made many discovered animal URLs look duplicate or thin to crawlers even though the client-side app could render them for users.

## What Changed

- The first SEO fix rendered crawlable pages through `api/seo.js`, but that added a 13th Vercel Serverless Function and failed on the Hobby plan.
- Public SEO routes now use committed static prerendered HTML files instead of a serverless renderer.
- Animal pages at `/stats/<slug>` include unique title, description, canonical, H1, structured data, stats, habitat, diet, measurements, description, and internal links.
- `sitemap.xml` is generated from `animal_stats.json` and includes only canonical public URLs.
- `robots.txt` remains permissive and points to the sitemap.
- `scripts/seo-audit.mjs` checks sitemap URLs for status, redirects, title, description, canonical, noindex, and H1 coverage.

## How To Run The Audit

Regenerate static SEO pages and the sitemap:

```bash
npm run seo:prerender
npm run seo:sitemap
```

Audit production:

```bash
npm run seo:audit -- --write
```

Audit a local clean-URL static server:

```bash
npx http-server . -p 3000 -c-1 --proxy http://localhost:3000/index.html
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

- Run `npm run seo:prerender` whenever animal data or route SEO templates change.
- Run `npm run seo:sitemap` whenever animal data changes.
- Run `npm run seo:audit -- --write` after each deployment that touches routes, metadata, sitemap, or animal data.
- Keep auth, profile, API, and other private or low-value utility routes out of the sitemap.
- Do not use `robots.txt` for noindex behavior.
