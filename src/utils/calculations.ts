/**
 * Core retirement calculations
 * Simple, realistic, no BS
 */

export interface RetirementInput {
  currentSOL: number;
  dcaMonthly: number; // USD per month
  years: number;
  withdrawalMonthly: number; // USD per month in retirement
}

export interface RetirementProjection {
  startValue: number; // USD
  endValue: number; // USD
  totalInvested: number; // USD
  monthlyIncome: number; // USD
  yearsOfIncome: number;
  worstCase: number; // P10
  bestCase: number; // P90
  finalSOL: number;
}

const CURRENT_SOL_PRICE = 180; // Will fetch live later
const SOL_GROWTH_RATE = 0.25; // 25% CAGR - conservative for mature crypto
const VOLATILITY = 0.80; // 80% annualized vol

export function calculateRetirement(input: RetirementInput): RetirementProjection {
  const { currentSOL, dcaMonthly, years, withdrawalMonthly } = input;
  
  // Start value
  const startValue = currentSOL * CURRENT_SOL_PRICE;
  
  // Total DCA contributions
  const totalDCA = dcaMonthly * 12 * years;
  const totalInvested = startValue + totalDCA;
  
  // Project SOL accumulation with DCA
  let sol = currentSOL;
  let totalUSDInvested = startValue;
  
  for (let year = 0; year < years; year++) {
    // Annual growth
    sol *= (1 + SOL_GROWTH_RATE);
    
    // DCA additions (convert USD to SOL at average price throughout year)
    const yearlyDCA = dcaMonthly * 12;
    const avgPrice = CURRENT_SOL_PRICE * Math.pow(1 + SOL_GROWTH_RATE, year + 0.5);
    sol += yearlyDCA / avgPrice;
    totalUSDInvested += yearlyDCA;
  }
  
  const finalSOL = sol;
  const endValue = finalSOL * CURRENT_SOL_PRICE * Math.pow(1 + SOL_GROWTH_RATE, years);
  
  // Calculate retirement duration (using 4% rule)
  const annualWithdrawal = withdrawalMonthly * 12;
  const yearsOfIncome = endValue / annualWithdrawal;
  
  // Monte Carlo approximation (lognormal)
  const stdDev = VOLATILITY / Math.sqrt(years);
  
  const worstCase = endValue * Math.exp(-1.28 * stdDev * Math.sqrt(years)); // P10
  const bestCase = endValue * Math.exp(1.28 * stdDev * Math.sqrt(years)); // P90
  
  return {
    startValue,
    endValue,
    totalInvested,
    monthlyIncome: withdrawalMonthly,
    yearsOfIncome,
    worstCase,
    bestCase,
    finalSOL
  };
}

export function formatUSD(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(1)}K`;
  }
  return `$${value.toFixed(0)}`;
}

export function formatSOL(value: number): string {
  return value.toFixed(2);
}
