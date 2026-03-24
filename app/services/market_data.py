"""
market_data.py — Yahoo Finance Integration

Fetches real-time and historical stock/MF prices.
Uses the yfinance library which wraps Yahoo Finance's public API.
"""

from typing import Optional, Dict
import yfinance as yf


import requests

def get_current_price(ticker_symbol: str) -> Optional[float]:
    """
    Fetch the latest market price for a given ticker directly using Yahoo's v8 API.
    Avoids yfinance rate limits and KeyError bugs on Mutual Funds.
    """
    try:
        url = f"https://query2.finance.yahoo.com/v8/finance/chart/{ticker_symbol}?interval=1d&range=5d"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
        resp = requests.get(url, headers=headers, timeout=5)
        
        if resp.status_code == 200:
            data = resp.json()
            result = data.get("chart", {}).get("result")
            if result and len(result) > 0:
                # Get the meta node which usually has the very latest price
                meta = result[0].get("meta", {})
                price = meta.get("regularMarketPrice") or meta.get("previousClose")
                
                # If meta doesn't have it, look at the last available close
                if not price:
                    indicators = result[0].get("indicators", {})
                    quote = indicators.get("quote", [{}])[0]
                    closes = quote.get("close", [])
                    # filter out Nones
                    valid_closes = [c for c in closes if c is not None]
                    if valid_closes:
                        price = valid_closes[-1]
                        
                if price:
                    return float(price)

    except Exception as e:
        print(f"Error fetching price for {ticker_symbol}: {e}")
        
    return None


def get_batch_prices(ticker_symbols: list[str]) -> Dict[str, Optional[float]]:
    """
    Fetch current prices for multiple tickers in one call.
    More efficient than calling get_current_price() in a loop.

    Args:
        ticker_symbols: List of Yahoo Finance tickers.

    Returns:
        Dict mapping ticker → price (or None if unavailable).
    """
    prices = {}
    for symbol in ticker_symbols:
        prices[symbol] = get_current_price(symbol)
    return prices


def get_ticker_info(ticker_symbol: str) -> Optional[dict]:
    """
    Get comprehensive info about a ticker — name, sector, market cap, etc.
    Useful for the AI advisor to build context.

    Returns:
        Dictionary of ticker metadata, or None on failure.
    """
    try:
        ticker = yf.Ticker(ticker_symbol)
        info = ticker.info
        return {
            "symbol": ticker_symbol,
            "name": info.get("longName") or info.get("shortName"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "dividend_yield": info.get("dividendYield"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "current_price": (
                info.get("currentPrice")
                or info.get("regularMarketPrice")
                or info.get("previousClose")
            ),
        }
    except Exception:
        return None
