
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

/**
 * Fetches live prices for a list of tickers.
 * Uses CoinGecko for crypto and Yahoo Finance (via proxy) for stocks.
 */
export const fetchLivePrices = async (tickers: string[], currency: string = 'cad'): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  
  // 1. Separate Crypto vs Stocks
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const cryptoTickers: string[] = [];
  const stockTickers: string[] = [];

  uniqueTickers.forEach(t => {
      if (COINGECKO_MAP[t]) {
          cryptoTickers.push(t);
      } else {
          // Filter out likely invalid or placeholder tickers
          if (t && t !== 'UNKNOWN' && !t.includes('DOLLAR')) {
              stockTickers.push(t);
          }
      }
  });

  const promises = [];

  // 2. Fetch Crypto (CoinGecko)
  if (cryptoTickers.length > 0) {
      promises.push((async () => {
        try {
            const idsToFetch = cryptoTickers.map(t => COINGECKO_MAP[t]);
            const idsParam = idsToFetch.join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=${currency.toLowerCase()}`;
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                cryptoTickers.forEach(t => {
                    const id = COINGECKO_MAP[t];
                    if (data[id] && data[id][currency.toLowerCase()]) {
                        prices[t] = data[id][currency.toLowerCase()];
                    }
                });
            }
        } catch (e) {
            console.warn("Crypto fetch failed", e);
        }
      })());
  }

  // 3. Fetch Stocks (Yahoo Finance via AllOrigins Proxy)
  if (stockTickers.length > 0) {
      promises.push((async () => {
        try {
            // Yahoo Finance v7 Quotes API supports multiple symbols
            const symbols = stockTickers.join(',');
            // Using AllOrigins as a reliable free CORS proxy
            // Add timestamp to prevent proxy caching
            const targetUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}&_t=${Date.now()}`;
            const proxyUrl = "https://api.allorigins.win/raw?url=";
            
            const res = await fetch(`${proxyUrl}${encodeURIComponent(targetUrl)}`);
            
            if (res.ok) {
                const data = await res.json();
                const quotes = data.quoteResponse?.result || [];
                
                quotes.forEach((q: any) => {
                    const symbol = q.symbol.toUpperCase();
                    if (q.regularMarketPrice) {
                        // Yahoo returns price in native currency.
                        prices[symbol] = q.regularMarketPrice;
                    }
                });
            }
        } catch (e) {
            console.warn("Stock fetch failed", e);
        }
      })());
  }

  await Promise.all(promises);
  return prices;
};
