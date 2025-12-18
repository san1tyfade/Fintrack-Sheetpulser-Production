
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
 * Fetches live prices for a list of tickers from CoinGecko (free tier).
 * Defaults to CAD.
 */
export const fetchLivePrices = async (tickers: string[], currency: string = 'cad'): Promise<Record<string, number>> => {
  const prices: Record<string, number> = {};
  
  // 1. Identify valid crypto tickers
  const uniqueTickers = Array.from(new Set(tickers.map(t => t.toUpperCase())));
  const cryptoTickers: string[] = [];

  uniqueTickers.forEach(t => {
      if (COINGECKO_MAP[t]) {
          cryptoTickers.push(t);
      }
  });

  if (cryptoTickers.length === 0) return {};

  // 2. Batch Fetch
  try {
      // CoinGecko allows multiple IDs separated by commas
      const idsToFetch = cryptoTickers.map(t => COINGECKO_MAP[t]);
      const idsParam = idsToFetch.join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${idsParam}&vs_currencies=${currency.toLowerCase()}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CoinGecko API error: ${res.status}`);
      
      const data = await res.json();
      
      // 3. Map back to Tickers
      cryptoTickers.forEach(t => {
          const id = COINGECKO_MAP[t];
          if (data[id] && data[id][currency.toLowerCase()]) {
              prices[t] = data[id][currency.toLowerCase()];
          }
      });

  } catch (error) {
      console.warn('Failed to fetch live crypto prices:', error);
  }

  return prices;
};
