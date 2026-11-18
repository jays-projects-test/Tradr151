# Tradr151 — Pokémon Card Market Intelligence (starter MVP)

An original, dark, trading-inspired static website built for GitHub Pages. No build step needed.

## Features that work now
- Search English/Japanese/French card catalogue with TCGdex, show images, set and card ID. Requires internet.
- Show available TCGdex market guide quotes (USD or EUR as supplied, **not** GBP and **not** sold comps).
- Upload a photo **preview**, then manually identify the matching card. AI automatic photo identification is not included in this version.
- Record actual sold comps by date, grade and GBP amount; view observed raw all-time high/low **within recorded data** and history chart.
- An explicit, experimental composite score using historical comps, not fabricated prices. Needs 5 raw comps, of which 3 are recent.
- Watchlist and portfolio with quantity and purchase cost; local browser storage works without sign-in.
- Optional Supabase magic-link authentication and a user-isolated cloud workspace.
- Export/import JSON backup; research scanner ranks saved cards with sufficient data.

## Deploy to GitHub Pages
1. Make a public GitHub repository named `tradr151` (or any name).
2. Upload `index.html`, `styles.css`, and `app.js` to the repository root. (You can upload the other files for documentation too.)
3. In **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, `main` and `/ (root)`.
4. Your URL should be `https://YOUR-USERNAME.github.io/tradr151/`.
5. HTTPS and the hosted page are public even if your personal data is stored privately in Supabase. Do not put secrets in the repo.

## Enable cloud sync & authentication
1. Create a Supabase project.
2. Run the SQL in `supabase.sql` using Supabase's SQL editor. Enable Row Level Security (already in script).
3. In Supabase Auth settings, enable Email (magic links). Set **Site URL** to your GitHub Pages URL and add that same URL to **Redirect URLs**.
4. Visit the app → Settings. Paste only your Supabase project URL and **public publishable/anon** key. Do not use secret keys.
5. Click Sign in and enter your email. Your workspace will sync to your own account. Existing cloud data overrides local data on login; export a backup first if uncertain.

## IMPORTANT — what is not implemented / not genuine yet
- No backend price-history API integration or licensed historical completed-sale data.
- No reliable PSA population, PSA 9/10 valuations, social sentiment, or true market-wide ATH/ATL. Those show No data until real comps entered.
- No photo recognition or AI agent yet; uploaded images aren't sent to a third-party provider.
- No auto-scan across all Pokémon cards. The research lab scores researched/saved cards only.
- No direct automated currency conversion (raw provider quotes retain native USD/EUR).
- The scoring model is a prototype, not statistical proof of future returns. It never substitutes asking prices for actual sales.
- Saved Supabase settings are stored in localStorage. The public Supabase publishable key is designed for client-side use; protected data requires database RLS. Never expose provider secret tokens.

## Recommended next phase for real investment research
- Add a secured serverless proxy (Supabase Edge Function or Cloudflare Worker) for PkmnPrices/PriceCharting/historical sold comps.
- Normalize listing title, grading company, grade, language, edition, finish, sale date, shipping, and location; reject bundles and mismatches.
- Daily price snapshots via scheduled GitHub Actions or serverless cron; retain immutable source and observed timestamps.
- Add paid source or user-verified import for PSA population and raw/PSA 9/PSA 10 sold sales.
- Add Gemini vision/OCR behind a secured Edge Function. Have users confirm match before fetching values. Never expose AI key in GitHub Pages JS.
- Calculate hype from measured change in sales volume, price and listing availability; do not let LLMs fabricate a numeric signal.
- Add realistic grading EV with expected grade probabilities, grading fees, postage, marketplace fees and estimated selling time.

## Disclaimer
Tradr151 is independent and not affiliated with Trading 212, Pokémon, Nintendo or PSA. This app is a research prototype, not financial advice.
