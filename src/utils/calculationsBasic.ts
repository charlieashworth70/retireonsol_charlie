/**
 * Core retirement calculations for Basic Mode
 * Fixed realistic parameters - no toggles
 */

export interface RetirementInput {
  currentSOL: number;
  dcaMonthly: number; // USD per month
  years: number;
  withdrawalMonthly: number; // USD per month in retirement
}

export interface RetirementProjection {
  startValue: number; // USD
  endValue: number; // USD (median/P50)
  totalInvested: number; // USD
  monthlyIncome: number; // USD
  yearsOfIncome: number;
  p10: number; // Pessimistic case
  p50: number; // Median case
  p90: number; // Optimistic case
  finalSOL: number;
}

// FIXED PARAMETERS (hardcoded, no UI controls)
const CURRENT_SOL_PRICE = 180; // Will fetch live later
const SOL_GROWTH_RATE = 0.15; // 15% CAGR - realistic long-term
const INFLATION_RATE = 0.035; // 3.5% annual inflation (always on)
const VOLATILITY = 0.60; // 60% annualized vol for mature SOL
// Debasement: 0% (not included)
// JitoSOL: disabled (pure SOL only)

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
  
  // Apply inflation to withdrawal needs
  const inflationAdjustedWithdrawal = withdrawalMonthly * Math.pow(1 + INFLATION_RATE, years);
  const annualWithdrawal = inflationAdjustedWithdrawal * 12;
  const yearsOfIncome = endValue / annualWithdrawal;
  
  // Monte Carlo confidence intervals (lognormal distribution)
  const timeVolatility = VOLATILITY * Math.sqrt(years);
  
  const p10 = endValue * Math.exp(-1.28 * timeVolatility); // Pessimistic (10th percentile)
  const p50 = endValue; // Median (50th percentile)
  const p90 = endValue * Math.exp(1.28 * timeVolatility); // Optimistic (90th percentile)
  
  return {
    startValue,
    endValue: p50,
    totalInvested,
    monthlyIncome: withdrawalMonthly,
    yearsOfIncome,
    p10,
    p50,
    p90,
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
