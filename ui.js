const INFO={
 quotes:['Price-guide sources','TCGdex supplies TCGplayer USD and Cardmarket EUR market guides. They are not two independent verified sold comps, may reflect different variants, and must not be averaged without matching printings and FX conversion. GitHub Actions can refresh these publicly on a schedule.'],
 market:['Market analytics','The market-wide section uses TCGCSV / TCGplayer daily US price guides for thousands of products independently of user searches. This is not verified global sales volume or true total-market-cap. The app checks published updates hourly, but the underlying free guide is updated daily. Actual sold and listing feeds require additional providers.'],
 fear:['Pokémon Fear & Greed','The dial is a market-guide sentiment PROXY, not CoinMarketCap’s index. It displays a score only with at least 250 matched 7-day price changes and at least 75% set coverage. The provisional model combines 55% median guide-price momentum and 45% positive-price breadth; it does not measure real sold volume, social interest or market-wide supply. The gauge stays blank if those inputs are unavailable.'],
 guide:['Market data','Tradr151 searches the free TCGdex catalogue. Some cards have live USD/EUR guide prices, but these are not verified GBP sales. PSA 9/10 values and true historical highs/lows require comparable completed sales. When data is missing, the app shows “No data” instead of inventing a number.'],
 search:['Search & photos','Market search accesses tracked TCGplayer products. The separate card catalogue search supports EN/JA/FR. Photo upload can suggest an AI match after sign-in and after a Gemini API key is configured in Supabase; users must verify the exact printing before recording it.'],
 overview:['Your overview','Cards researched counts printings you have opened. Watchlist counts saved cards. Sale records counts completed sales you added.'],
 values:['About these prices','Raw, PSA 9 and PSA 10 GBP values are medians of your entered completed sales for this exact printing. The live guide quote, when available, comes from TCGdex in its original currency and is shown separately.'],
 history:['Price history','This chart uses your saved completed raw-card sales, sorted by date. Observed highs and lows only cover those records, not the entire lifetime of the card.'],
 signal:['Tradr signal','An experimental scoring model combines your recorded price momentum, the last sale versus recent median, transaction count, volatility and sample size. At least five raw sales, three within 90 days, are required. It cannot assess social hype or predict future prices yet.'],
 watchlist:['Watchlist','Save cards you want to monitor. Data stays on this device until optional cloud sync is configured.'],
 portfolio:['Portfolio','Track the cards you own, their quantities and your purchase cost. This is a collection tracker, not a trading brokerage.'],
 gems:['Gem scanner','Scans saved cards with enough actual completed sales to compute a score. It does not automatically discover market-wide opportunities without a broader historical sales dataset.']
};
const infoDialog=document.getElementById('infoDialog');
document.addEventListener('click',e=>{const trigger=e.target.closest('[data-info]');if(trigger){const item=INFO[trigger.dataset.info];if(item){document.getElementById('infoTitle').textContent=item[0];document.getElementById('infoText').textContent=item[1];infoDialog.showModal();}}});
document.getElementById('closeInfo').addEventListener('click',()=>infoDialog.close());
infoDialog.addEventListener('click',e=>{if(e.target===infoDialog)infoDialog.close()});
document.getElementById('toggleCloud').addEventListener('click',()=>{const el=document.getElementById('cloudSetup');el.hidden=!el.hidden;document.getElementById('toggleCloud').textContent=el.hidden?'Configure →':'Hide ↑'});
document.getElementById('brandHome').addEventListener('click',e=>{e.preventDefault();document.querySelector('.nav[data-tab="discover"]').click()});
// The app maintains its original research, watchlist, saved-sales and optional Supabase functionality.
