# News feed fixtures (Step 11)

`feeds/*.xml` are the live RSS feeds recorded with `npm run news -- --record` on Oct 19, 2026 (~01:50 Central),
untrimmed (all under 100 KB). Houston Landing is missing: its feed failed the TLS handshake and is disabled.

`expected_mentions.json` is the collector output for these feeds with `now = 2026-10-19T12:00:00Z`.
Only headline, outlet, link and date are stored; feed descriptions are used in memory for matching only.
