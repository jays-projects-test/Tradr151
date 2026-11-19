#!/usr/bin/env python3
"""Refresh public BTC and S&P 500 chart observations. No invented prices.
S&P 500 market-cap estimate is left dated; its index return is refreshed independently.
"""
import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

DEST = Path("data/financial-markets.json")
USER_AGENT = "Mozilla/5.0 (compatible; Tradr151/1.0)"
NOW = datetime.now(timezone.utc)

def read_json(url, headers=None):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept":"application/json", **(headers or {})})
    with urllib.request.urlopen(req, timeout=22) as resp:
        return json.load(resp)

def yahoo(symbol):
    hosts = ["query1.finance.yahoo.com", "query2.finance.yahoo.com"]
    errors = []
    for host in hosts:
        try:
            url = f"https://{host}/v8/finance/chart/{urllib.parse.quote(symbol, safe='')}?interval=1d&range=3mo"
            raw = read_json(url)["chart"]["result"][0]
            meta = raw["meta"]
            quote = raw["indicators"]["quote"][0]["close"]
            samples = sorted({datetime.fromtimestamp(t,timezone.utc).date().isoformat():float(v)
                for t,v in zip(raw["timestamp"],quote) if isinstance(v,(int,float)) and v>0}.items())
            if len(samples)<35: raise ValueError("Not enough trading observations")
            return samples, meta
        except Exception as e: errors.append(str(e))
    raise RuntimeError(symbol+": "+"; ".join(errors))

def coingecko_btc():
    # Optional demo key in GitHub Actions secrets; public request also attempted without key.
    key=os.getenv("COINGECKO_DEMO_API_KEY","")
    headers={"x-cg-demo-api-key":key} if key else {}
    api="https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=90"
    raw=read_json(api,headers)
    prices={}
    for ms,price in raw["prices"]:
        date=datetime.fromtimestamp(ms/1000,timezone.utc).date().isoformat()
        if price>0: prices[date]=float(price)
    if len(prices)<35: raise ValueError("CoinGecko history incomplete")
    return sorted(prices.items()),{"currency":"USD","source":"CoinGecko"}

def change(prices, days):
    last_date=datetime.fromisoformat(prices[-1][0]).date()
    target=last_date-timedelta(days=days)
    prior=[p for p in prices if datetime.fromisoformat(p[0]).date()<=target]
    if not prior: return None
    return round((prices[-1][1]/prior[-1][1]-1)*100,2)

def main():
    old={}
    if DEST.exists():
        try: old=json.loads(DEST.read_text())
        except Exception: pass
    output={"updated_at":NOW.isoformat(),"assets":{}}
    for key,symbol in (("bitcoin","BTC-USD"),("sp500","^GSPC")):
        try:
            try: series,meta=yahoo(symbol);source="Yahoo Finance chart"
            except Exception:
                if key!="bitcoin": raise
                series,meta=coingecko_btc();source="CoinGecko"
            current=float(meta.get("regularMarketPrice") or series[-1][1])
            if current<=0:raise ValueError("Bad price")
            item={
                "symbol":symbol, "value_usd":round(current,2),
                "change_7d":change(series,7),"change_30d":change(series,30),
                "as_of":series[-1][0],"source":source,
                "points":[[date,round(value,2)] for date,value in series[-65:]]
            }
            if key=="bitcoin":
                # Only show a current cap when actual market cap is supplied by CoinGecko,
                # never derive it from an arbitrary assumed coin supply.
                try:
                    m=read_json("https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin",{"x-cg-demo-api-key":os.getenv("COINGECKO_DEMO_API_KEY","")} if os.getenv("COINGECKO_DEMO_API_KEY") else {})
                    cap=m[0].get("market_cap") if m else None
                    if isinstance(cap,(int,float)) and cap>0:item["market_cap_usd"]=cap
                except Exception: pass
            output["assets"][key]=item
            print(key,"asof",item["as_of"],"30d",item["change_30d"])
        except Exception as e:
            print("Unable to refresh",key,str(e))
            if old.get("assets",{}).get(key):
                output["assets"][key]=old["assets"][key]
    if not output["assets"]:raise RuntimeError("No financial history available; existing data untouched")
    DEST.parent.mkdir(exist_ok=True)
    DEST.write_text(json.dumps(output,indent=2)+"\n")
if __name__=="__main__":main()
