// Mapping of common tickers to CoinGecko API IDs
const COINGECKO_MAP: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'SOL': 'solana',
  'ADA': 'cardano',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'DOT': 'polkadot',
  'LTC': 'litecoin',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'MATIC': 'matic-network',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'BNB': 'binancecoin',
  'SHIB': 'shiba-inu',
  'TRX': 'tron',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'XMR': 'monero',
  'ETC': 'ethereum-classic',
  'BCH': 'bitcoin-cash',
  'FIL': 'filecoin',
  'NEAR': 'near',
  'ALGO': 'algorand',
  'ICP': 'internet-computer',
  'VET': 'vechain',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AAVE': 'aave',
  'EOS': 'eos'
};

interface CacheEntry {
  price: number;
  timestamp: number;
}

// In-memory cache for prices
const PRICE_CACHE: Record<string, CacheEntry> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Fetches live prices for a list of tickers.
 */
export const fetchLivePrices = async (tickers: string[], currency: string = 'cad'): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  const now = Date.now();
  const normalizedCurrency = currency.toLowerCase();
  
  const uniqueRequested = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickersToFetch: string[] = [];

  uniqueRequested.forEach(ticker => {
    const cacheKey = `${ticker}_${normalizedCurrency}`;
    const cached = PRICE_CACHE[cacheKey];
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      prices[ticker] = cached.price;
    } else {
      tickersToFetch.push(ticker);
    }
  });

  if (tickersToFetch.length === 0) return prices;

  const cryptoToFetch: string[] = [];
  const stocksToFetch: string[] = [];

  tickersToFetch.forEach(t => {
      if (COINGECKO_MAP[t]) cryptoToFetch.push(t);
      else if (t && t !== 'UNKNOWN' && !t.includes('DOLLAR')) stocksToFetch.push(t);
  });

  const promises = [];

  if (cryptoToFetch.length > 0) {
      promises.push((async () => {
        try {
            const idsToFetch = cryptoToFetch.map(t => COINGECKO_MAP[t]);
            const idsParam = idsToFetch.join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=${normalizedCurrency}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                cryptoToFetch.forEach(t => {
                    const id = COINGECKO_MAP[t];
                    if (data[id] && data[id][normalizedCurrency]) {
                        const price = data[id][normalizedCurrency];
                        prices[t] = price;
                        PRICE_CACHE[`${t}_${normalizedCurrency}`] = { price, timestamp: now };
                    }
                });
            }
        } catch (e) { console.warn("Crypto price fetch failed", e); }
      })());
  }

  if (stocksToFetch.length > 0) {
      promises.push((async () => {
        try {
            const symbols = stocksToFetch.join(',');
            const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&_t=${now}`;
            const proxyUrl = "https://api.allorigins.win/raw?url=";
            const res = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
            if (res.ok) {
                const data = await res.json();
                const quotes = data.quoteResponse?.result || [];
                quotes.forEach((q: any) => {
                    const symbol = q.symbol.toUpperCase();
                    if (q.regularMarketPrice) {
                        const price = q.regularMarketPrice;
                        prices[symbol] = price;
                        PRICE_CACHE[`${symbol}_${normalizedCurrency}`] = { price, timestamp: now };
                    }
                });
            }
        } catch (e) { console.warn("Stock price fetch failed", e); }
      })());
  }

  await Promise.all(promises);
  return prices;
};

/**
 * Fetches historical price series for a ticker.
 */
export const fetchHistoricalPrices = async (ticker: string, startDate: string): Promise<{date: string, price: number}[]> => {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const endTimestamp = Math.floor(Date.now() / 1000);
    const targetUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startTimestamp}&period2=${endTimestamp}&interval=1d`;
    const proxyUrl = "https://api.allorigins.win/raw?url=";
    
    try {
        const res = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
        if (!res.ok) return [];
        const data = await res.json();
        const result = data.chart?.result?.[0];
        if (!result) return [];

        const timestamps = result.timestamp || [];
        const prices = result.indicators?.quote?.[0]?.close || [];
        
        return timestamps.map((ts: number, i: number) => {
            const d = new Date(ts * 1000);
            return {
                date: d.toISOString().split('T')[0],
                price: prices[i] || prices[i-1] || 0
            };
        }).filter((p: any) => p.price > 0);
    } catch (e) {
        console.warn("Historical fetch failed", e);
        return [];
    }
};