const INFO={
 quotes:['Price-guide sources','TCGdex supplies TCGplayer USD and Cardmarket EUR market guides. They are not two independent verified sold comps, may reflect different variants, and must not be averaged without matching printings and FX conversion. GitHub Actions can refresh these publicly on a schedule.'],
 market:['Market analytics','The headline metrics reflect only matched, recorded sales in your covered card universe. They are NOT the global Pokémon market cap or worldwide sales volume. Rankings require two separate historical periods. Source coverage and freshness matter.'],
 fear:['Pokémon Fear & Greed','A 0–100 sentiment model is planned using momentum, verified sales volume, market breadth, volatility and search interest. With at least 20 cards with sufficient history, the app displays an experimental observed-sample pulse using price momentum (30%), sale volume (25%), breadth (30%) and stability (15%). This is not a complete global Pokémon sentiment index; search and social data are not yet available.'],
 guide:['Market data','Tradr151 searches the free TCGdex catalogue. Some cards have live USD/EUR guide prices, but these are not verified GBP sales. PSA 9/10 values and true historical highs/lows require comparable completed sales. When data is missing, the app shows “No data” instead of inventing a number.'],
 search:['Search & photos','Search by Pokémon name or card number and select the correct printing and language. Photo upload currently displays a preview for manual comparison; automatic AI photo identification is not enabled yet.'],
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
