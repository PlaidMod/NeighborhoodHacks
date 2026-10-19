# News article fixtures (Step 11b)

- `pages/hpm-*.html`: live Houston Public Media pages fetched Oct 19, 2026 with the bot UA (untrimmed, < 150 KB each).
  `hpm-engines-podcast-short.html` is a short show page (118 words) standing in for a TV video page.
- `pages/handmade-paywall.html`: hand-made, with JSON-LD `isAccessibleForFree: false` and a `paywall-gate` class.
- `robots/houstonpublicmedia.org.txt`, `robots/communityimpact.com.txt`: live, Oct 19, 2026.
- `robots/handmade-*.txt`: hand-made (path disallow + Crawl-delay; D36 named AI-crawler group; group naming our bot).

No Community Impact or TV article pages are recorded: those outlets' terms forbid automated copying/storage,
so `fetch_articles: false` (see `.plans/scraper-progress.md`, Step 11b).
