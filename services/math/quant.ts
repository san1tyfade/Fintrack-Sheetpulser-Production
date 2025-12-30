import { ProcessedPortfolioEntry } from '../../types';

/**
 * Calculates the annualized volatility of the portfolio based on log returns.
 */
export const calculateVolatility = (data: ProcessedPortfolioEntry[]): number => {
  if (data.length < 3) return 0;

  const returns: number[] = [];
  for (let i = 1; i < data.length; i++) {
    const prev = data[i - 1].totalValue;
    const curr = data[i].totalValue;
    if (prev > 0 && curr > 0) {
      returns.push(Math.log(curr / prev));
    }
  }

  if (returns.length < 2) return 0;

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  const standardDeviation = Math.sqrt(variance);

  const firstDate = new Date(data[0].date).getTime();
  const lastDate = new Date(data[data.length - 1].date).getTime();
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24);
  const avgGapDays = daysDiff / (data.length - 1);
  
  const annualizationFactor = Math.sqrt(365 / Math.max(1, avgGapDays));
  
  return standardDeviation * annualizationFactor * 100;
};

/**
 * Calculates a rolling volatility
 */
export const calculateRollingVolatility = (data: ProcessedPortfolioEntry[], windowSize: number = 4) => {
    if (data.length < windowSize) return [];
    const rolling = [];
    for (let i = windowSize; i <= data.length; i++) {
        const slice = data.slice(i - windowSize, i);
        const vol = calculateVolatility(slice);
        rolling.push({
            date: data[i - 1].date,
            volatility: vol
        });
    }
    return rolling;
};