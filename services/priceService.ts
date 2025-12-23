
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
 * Uses CoinGecko for crypto and Yahoo Finance (via proxy) for stocks.
 * Implements a simple memory cache to minimize external network requests.
 */
export const fetchLivePrices = async (tickers: string[], currency: string = 'cad'): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  const now = Date.now();
  const normalizedCurrency = currency.toLowerCase();
  
  // 1. Identify which tickers need a fresh fetch vs which are in cache
  const uniqueRequested = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const tickersToFetch: string[] = [];

  uniqueRequested.forEach(ticker => {
    // Cache key includes currency to ensure accuracy if user were to change base currency
    const cacheKey = `${ticker}_${normalizedCurrency}`;
    const cached = PRICE_CACHE[cacheKey];

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      prices[ticker] = cached.price;
    } else {
      tickersToFetch.push(ticker);
    }
  });

  // If everything is cached, return immediately
  if (tickersToFetch.length === 0) {
    return prices;
  }

  // 2. Separate the needed tickers into Crypto vs Stocks
  const cryptoToFetch: string[] = [];
  const stocksToFetch: string[] = [];

  tickersToFetch.forEach(t => {
      if (COINGECKO_MAP[t]) {
          cryptoToFetch.push(t);
      } else {
          // Filter out likely invalid or placeholder tickers
          if (t && t !== 'UNKNOWN' && !t.includes('DOLLAR')) {
              stocksToFetch.push(t);
          }
      }
  });

  const promises = [];

  // 3. Fetch Crypto (CoinGecko)
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
                        // Update cache
                        PRICE_CACHE[`${t}_${normalizedCurrency}`] = { price, timestamp: now };
                    }
                });
            }
        } catch (e) {
            console.warn("Crypto price fetch failed", e);
        }
      })());
  }

  // 4. Fetch Stocks (Yahoo Finance via AllOrigins Proxy)
  if (stocksToFetch.length > 0) {
      promises.push((async () => {
        try {
            // Yahoo Finance v7 Quotes API supports multiple symbols
            const symbols = stocksToFetch.join(',');
            // Using AllOrigins as a reliable free CORS proxy
            // Add timestamp to prevent proxy caching
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
                        // Update cache
                        PRICE_CACHE[`${symbol}_${normalizedCurrency}`] = { price, timestamp: now };
                    }
                });
            }
        } catch (e) {
            console.warn("Stock price fetch failed", e);
        }
      })());
  }

  await Promise.all(promises);
  return prices;
};
