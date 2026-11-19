#!/usr/bin/env python3
"""Fetch CardTrack's credited CC-BY-4.0 Pokémon-vs-assets historical CSV.
No price interpolation or manufactured points. Keep last committed dataset if unavailable.
"""
import csv
import io
import json
import os
import re
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

SOURCE = "https://cardtrack.com/data/pokemon-vs-assets"
DEST = Path("data/market-benchmarks.json")
HEADERS = {"User-Agent": "Tradr151MarketResearch/1.0 (public historical benchmark)"}


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.href = None
        self.text = []

    def handle_starttag(self, name, attrs):
        if name == "a":
            self.href = dict(attrs).get("href")
            self.text = []

    def handle_data(self, data):
        if self.href is not None:
            self.text.append(data)

    def handle_endtag(self, name):
        if name == "a" and self.href:
            self.links.append((self.href, " ".join(self.text).strip()))
            self.href = None
            self.text = []


def download(url):
    request = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(request, timeout=30) as r:
        body = r.read(12 * 1024 * 1024)
    return body.decode("utf-8-sig")


def col_name(label):
    return re.sub(r"[^a-z0-9]", "", label.lower())


def ident(label):
    name = col_name(label)
    if any(t in name for t in ("ct100", "cardtrack100", "pokemon100", "pokemoncards")):
        return "pokemon"
    if "bitcoin" in name or "btcusd" in name or name == "btc":
        return "bitcoin"
    if "sp500" in name or "gspc" in name or "spx" in name or "sandp500" in name or "standardpoors500" in name:
        return "sp500"
    return None


def parse_date(raw):
    value = (raw or "").strip()
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y-%m", "%b %Y", "%Y-%m-%dT%H:%M:%S", "%m/%d/%Y"):
        try:
            d = datetime.strptime(value, fmt)
            return d.date().isoformat()
        except ValueError:
            pass
    return None


def numeric(raw):
    value = (raw or "").strip().replace(",", "").replace("$", "").replace("%", "")
    try:
        n = float(value)
        return n if 0 < n < 1000000000000 else None
    except ValueError:
        return None


def parse_csv(content):
    clean = "\n".join(line for line in content.splitlines() if line.strip() and not line.lstrip().startswith("#"))
    reader = csv.DictReader(io.StringIO(clean))
    if not reader.fieldnames:
        raise ValueError("Historical CSV missing headers")
    names = reader.fieldnames
    date_column = next((c for c in names if col_name(c) in ("date", "month", "period", "datetime", "timestamp")), None)
    if date_column is None:
        raise ValueError("Could not find CSV date column: " + str(names))
    mapping = {c: ident(c) for c in names}
    result = {"pokemon": {}, "bitcoin": {}, "sp500": {}}
    asset_column = next((c for c in names if col_name(c) in ("asset", "series", "instrument", "ticker", "symbol")), None)
    value_column = next((c for c in names if col_name(c) in ("index", "value", "close", "level", "price", "normalizedvalue", "rebased")), None)
    for row in reader:
        date = parse_date(row.get(date_column))
        if not date or date < "2021-08-01" or date > datetime.now(timezone.utc).date().isoformat():
            continue
        for column, asset in mapping.items():
            if asset and column != asset_column:
                n = numeric(row.get(column))
                if n is not None:
                    result[asset][date] = n
        if asset_column and value_column:
            asset = ident(row.get(asset_column, ""))
            if asset:
                n = numeric(row.get(value_column))
                if n is not None:
                    result[asset][date] = n
    if min(len(r) for r in result.values()) < 8:
        raise ValueError("Too few real observations in CSV: " + str({k: len(v) for k, v in result.items()}))
    # Monthly match: wide history can contain different trading dates for each series.
    # Use each asset's first observed value from the same September 2021 starting month.
    final = {}
    for asset, records in result.items():
        ordered = sorted(records.items())
        starts = [p for p in ordered if p[0][:7] == "2021-09"]
        if not starts:
            raise ValueError("No September 2021 baseline for " + asset)
        baseline = starts[0][1]
        final[asset] = [[d, round(value / baseline * 100, 4)] for d, value in ordered if d >= starts[0][0]]
        if len(final[asset]) < 8:
            raise ValueError("Insufficient post-baseline points for " + asset)
    return final


def main():
    html = download(SOURCE)
    parser = Links()
    parser.feed(html)
    candidates = []
    for href, label in parser.links:
        combined = (label + " " + href).lower()
        if ("csv" in combined and ("history" in combined or "assets" in combined or "comparison" in combined)):
            candidates.append((0 if "full history" in combined else 1, urllib.parse.urljoin(SOURCE, href), label))
    candidates.sort(key=lambda x: x[0])
    if not candidates:
        raise ValueError("CardTrack does not expose a public historical CSV link on source page")
    errors = []
    for _, url, label in candidates:
        try:
            data = parse_csv(download(url))
            payload = {
                "source": "CardTrack Pokémon vs assets history (CC BY 4.0)",
                "source_url": SOURCE,
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "series": data,
            }
            DEST.parent.mkdir(parents=True, exist_ok=True)
            DEST.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
            print("Saved historical series:", {k: len(v) for k, v in data.items()}, "from", url)
            return
        except Exception as exc:
            errors.append(url + ": " + str(exc))
    raise RuntimeError("Historical CSV could not be parsed: " + "; ".join(errors[:3]))


if __name__ == "__main__":
    main()
