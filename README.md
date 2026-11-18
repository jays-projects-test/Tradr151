# Tradr151 V3 — a trading-terminal interface for Pokémon cards

Original, static, mobile-first app. Deploy on GitHub Pages without a framework or build process. No fake prices, fake transactions or filler datasets.

## What's included

- Market overview inspired by **the design category** of financial market apps, not copied artwork, branding, or layouts.
- Verified-sample 30-day raw sales value, 30-day market breadth, tracked printings, and a **conditional, experimental** Pokémon sentiment proxy (available only with 20 qualifying cards).
- Movers, gainers, losers and raw median valuations, with minimum samples of 3 sales in each of two consecutive 30-day windows.
- TCGdex live card search for EN, JP and FR, card images and available TCGplayer / Cardmarket guide price estimates. The app does not confuse quote prices with completed transactions.
- Card page: raw and PSA 9/10 recorded-sale medians, observed high/low, price chart, a basic transparent signal, 14-day-closing RSI on actual daily medians, 30-day change, observed price-range position and PSA-10 gross price premium.
- Watchlists, portfolio, backup JSON and optional email magic-link sign-in via Supabase.
- Photograph preview and **manual** matching. Automatic AI card identification is **not** implemented.
- CSV import of user-checked completed-sales data; source and printing checks, date and price validation and deduplication. Import is not independently audited.
- Free scheduled GitHub Actions refresher that requests TCGdex pricing for selected cards every six hours and publishes USD and EUR guide snapshots. **This is not automated sold-sales ingestion.**
- Optional `data/market-feed.json` read-only adapter for authorized, external sold-sale records and listings.

## GitHub Pages installation

1. Upload **all files and folders** from the ZIP to the root of repository `tradr151`. Keep the `.github/workflows` directory and `data/` folder structure. Do not upload the ZIP itself as a single file.
2. Repo → Settings → Pages → **Deploy from a branch** → `main` → `/(root)` → Save.
3. Open `https://jays-projects-test.github.io/tradr151/` once published. Hard-refresh the browser if it shows the previous design.
4. Repo → Actions → **Refresh public card guide quotes** → **Run workflow**. This is optional but populates the quote board. Give Actions `Read and write permissions` if the workflow's commit is denied. Scheduled workflows can be delayed or disabled after inactivity.
5. To edit featured snapshot cards, edit `data/featured-cards.json` with up to 40 **exact TCGdex IDs**. Re-run workflow. This refreshes marketplace guides, not card sale histories.
6. Optional private account: create a project at [Supabase](https://supabase.com); run `supabase.sql` in SQL Editor; configure Auth Site URL + Redirect URL for your GitHub Pages address; on Tradr151 go to More → Cloud sync. Use ONLY the public publishable/anon key. RLS must stay enabled.
7. Optional import: More → **Import completed sales** → upload a CSV with `card_id,date,grade,price_gbp,source,external_id`. A header-only template is in `data/sales-template.csv`. Card ID is `en:base1-4` (language colon exact TCGdex ID); grades are `raw`, `psa9`, or `psa10`. Use only genuine completed sales and list the source. The importer cannot verify your assertion.

## Inputs and coverage requirements

**Actual observed sample volume**: Sum of matched verified/user-verified raw completed-sales prices in last 30 days. Not global volume. Duplicate records are removed by source/sale ID when available; otherwise on card/date/grade/price/source. User import provenance is labelled user-verified, not independently audited.

**Observed breadth**: Of cards with at least 3 raw sales in latest 30D and at least 3 raw sales in preceding 30D, percent with positive change in period medians. Displays only if at least five cards qualify.

**Return/movers**: `(median raw price latest 30D / median raw price preceding 30D - 1) × 100`. Both periods require at least 3 observations.

**Experimental observed-sample sentiment proxy**: Requires at least 20 cards with 3+ trades in each period. Combines bounded relative median momentum (30%), sample sales-volume acceleration (25%), breadth (30%), and cross-sectional price stability (15%). It is not the global Pokémon Fear & Greed Index. Collectors can manipulate small markets, so data coverage and cross-provider checks are essential. Full index would additionally need representative data, search/social trends, robust provenance and volume over more history.

**RSI 14**: Simple 14-period closing gains/losses over a card's latest 15 distinct daily raw-sale median closes; incomplete days are not forward-filled. This differs from traditional exchange daily close (and is noisy in illiquid markets). Under 30 is technically oversold; over 70 is technically overbought. Neither means intrinsically under/overvalued.

**PSA premium**: `100 × (PSA10 sold median / raw sold median - 1)` calculated only when both grades have matched sale observations. This is **not** expected grading profit.

**Confidence**: Existing experimental buy/hold/sell model requires 5 raw sales, including 3 in 90D, and is appropriately labelled low/medium. It is NOT backtested investment advice. More sophisticated grade-specific fair-value, cross-market weighting, spreads, population changes and grading EV remain future work.

## Data sources and restrictions

| Source | Available now | Limits |
| --- | --- | --- |
| TCGdex | Free card catalogue and marketplace guide quotes; works immediately | Some eras missing, variant matching not always reliable, not verified sold comps |
| TCGplayer via TCGdex | Available USD guide quotes | Not separate independent sales evidence (TCGdex is an aggregator) |
| Cardmarket via TCGdex | Available EUR guide quotes | Different currency and supply geography; don't average USD/EUR directly |
| CSV completed-sale import | User-supplied actual sale records | Must verify grade/variant/authenticity/source yourself |
| PkmnPrices | Optional API (not connected to V3) | Free 500 credits/day includes daily market data; graded populations/eBay sold comps require paid plan |
| PriceCharting | Potential licensed paid quote data | API does not provide historical sales/history |
| eBay | Listings via approved API access; sold comps restricted | Marketplace Insights sold API is Limited Release; don't scrape against site rules |
| Supabase | Free-tier secure user account and saved data | RLS, project URL and public key setup needed |
| GitHub Actions | Free-tier scheduled snapshot updates | Scheduled jobs aren't guaranteed real-time; public Actions workflow can pause after inactivity |

### External feed schema (`data/market-feed.json`)

```
{
  "schema_version":1,
  "updated_at":"2026-11-18T00:00:00Z",
  "sales":[
    {"card_id":"en:base1-4","date":"2026-11-16","grade":"raw","price":75,
      "source":"approved-provider","provenance":"verified-provider","external_id":"sale-123"}
  ],
  "listings":[]
}
```

The `sales` example above is **schema only and invented to illustrate the format**. The shipped feed contains zero records; never publish that example as a real sale. Do not publish private records, private customer data, or paywalled source data in a public Pages repository without redistribution permission. Use a secure backend for API credentials and sensitive feeds.

## Roadmap toward a real market terminal

1. Secure a legitimate completed-sale feed with reliable **card variant**, **grade**, **sale date**, **sale price**, **listing URL/ID**, and applicable rights; this is the main blocker.
2. Store normalized sales and active listings in Supabase with deduplication, audit timestamps, provider/source metadata, and per-variant IDs. Run nightly or hourly incremental ingestion using server-side credentials.
3. Add exchange-rate conversion on transaction date, shipping/fees, seller region, and transparent marketplace spreads; compare actual matched variants rather than mixing 1st Edition/unlimited or holo/nonholo.
4. Build active listing tracking, actual sell-through (sold / listed during a defined window), offer-price distribution, snapshot history, and provenance-based trust scores. Do **not** treat ask prices as realized sales.
5. Expand standardized market coverage and compute defensible sentiment measures only after reaching statistically useful breadth and freshness.
6. Add PSA, BGS, CGC population datasets where licensed, grade probability modelling, realistic grading fees and liquidity discounts.
7. Add optional server-side photo identification AI with exact-print confirmation and optional search/social interest indices with permitted APIs.

## Security & deployment notes

GitHub Pages is public static hosting, not a private backend. Never commit a service-role key, private provider tokens, credentials or other secrets. Supabase browser client uses a public key plus strict RLS. CSV and sample feed are designed to contain market records only; do not commit personal information. GitHub scheduled Actions commit public guide prices and metadata. Provider terms may restrict public redistribution, so verify for production use.
