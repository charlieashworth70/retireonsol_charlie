import { useState, useEffect, useMemo } from 'react';
import { formatUSD, formatSOL } from '../utils/calculations';
import { runDrawdownSimulation, formatMonth, type DrawdownResult } from '../utils/drawdownMonteCarlo';
import { DrawdownChart } from './DrawdownChart';

interface SpendTabProps {
  startingSOL: number;
  startingPrice: number;
  startingValueUSD: number;
  defaultInflationRate: number;
  spendNow: boolean;
}

export function SpendTab({
  startingSOL,
  startingPrice,
  startingValueUSD,
  defaultInflationRate,
  spendNow,
}: SpendTabProps) {
  const [monthlyIncome, setMonthlyIncome] = useState(3000);
  const [monthlyIncomeMax, setMonthlyIncomeMax] = useState(10000);
  const [retirementYears, setRetirementYears] = useState(30);
  const [volatility, setVolatility] = useState(0.25);
  const [realGrowthRate, setRealGrowthRate] = useState(0.05);
  const [inflationRate, setInflationRate] = useState(defaultInflationRate);
  const [simulations, setSimulations] = useState(500);
  const [settingsExpanded, setSettingsExpanded] = useState(false);

  const [isCalculating, setIsCalculating] = useState(false);
  const [drawdownResult, setDrawdownResult] = useState<DrawdownResult | null>(null);

  // Run simulation when inputs change
  useEffect(() => {
    if (startingSOL <= 0 || startingPrice <= 0) {
      setDrawdownResult(null);
      return;
    }

    setIsCalculating(true);

    const timeoutId = setTimeout(() => {
      const result = runDrawdownSimulation({
        startingSOL,
        startingPrice,
        monthlyIncomeToday: monthlyIncome,
        retirementYears,
        volatility,
        realGrowthRate,
        simulations,
        inflationRate,
      });
      setDrawdownResult(result);
      setIsCalculating(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [startingSOL, startingPrice, monthlyIncome, retirementYears, volatility, realGrowthRate, simulations, inflationRate]);

  // Calculate annual withdrawal rate
  const annualWithdrawalRate = useMemo(() => {
    if (startingValueUSD <= 0) return 0;
    return (monthlyIncome * 12) / startingValueUSD;
  }, [monthlyIncome, startingValueUSD]);

  // Safe withdrawal rate (4% rule, adjusted for duration)
  const safeWithdrawalRate = useMemo(() => {
    const baseRate = 0.04;
    const baseYears = 30;
    const adjustment = Math.sqrt(baseYears / retirementYears);
    return Math.min(0.08, Math.max(0.025, baseRate * adjustment));
  }, [retirementYears]);

  const safeMonthlyWithdrawal = useMemo(() => {
    return Math.round(startingValueUSD * safeWithdrawalRate / 12);
  }, [startingValueUSD, safeWithdrawalRate]);

  return (
    <>
      <section className="adv-section">
        <h2>Portfolio at Retirement</h2>
        <div className="spend-portfolio-summary" style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: '1rem',
          padding: '1rem',
          background: 'var(--bg-dark)',
          borderRadius: '8px'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              Portfolio Value
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--sol-green)' }}>
              {formatUSD(startingValueUSD)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              SOL Balance
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              {formatSOL(startingSOL)} SOL
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              SOL Price
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              ${startingPrice.toLocaleString()}
            </div>
          </div>
        </div>
        {!spendNow && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.75rem', fontStyle: 'italic' }}>
            Values from Grow tab (median projection)
          </p>
        )}
      </section>

      <section className="adv-section">
        <h2>Withdrawal Plan</h2>

        <div className="input-group slider-group">
          <label htmlFor="monthlyIncome">
            Monthly Income: <span className="slider-value">{formatUSD(monthlyIncome)}</span>
          </label>
          <input
            id="monthlyIncome"
            type="range"
            min="500"
            max={monthlyIncomeMax}
            step={monthlyIncomeMax <= 20000 ? 100 : 500}
            value={Math.min(monthlyIncome, monthlyIncomeMax)}
            onChange={(e) => setMonthlyIncome(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>$500</span>
            <span className="slider-marker" style={{ position: 'absolute', left: `${(safeMonthlyWithdrawal / monthlyIncomeMax) * 100}%`, transform: 'translateX(-50%)' }}>
              {formatUSD(safeMonthlyWithdrawal)} ({(safeWithdrawalRate * 100).toFixed(1)}%)
            </span>
            <span>${(monthlyIncomeMax / 1000).toFixed(0)}K</span>
          </div>
          <div className="limit-buttons">
            {[10000, 20000, 50000].map((limit) => (
              <button
                key={limit}
                type="button"
                className={`limit-btn ${monthlyIncomeMax === limit ? 'active' : ''}`}
                onClick={() => setMonthlyIncomeMax(limit)}
              >
                ${limit >= 1000 ? `${limit / 1000}K` : limit}
              </button>
            ))}
          </div>
          <span className="input-hint">
            {annualWithdrawalRate > 0 && (
              <>Annual withdrawal rate: {(annualWithdrawalRate * 100).toFixed(1)}%</>
            )}
          </span>
        </div>

        <div className="input-group slider-group">
          <label htmlFor="retirementYears">
            Retirement Duration: <span className="slider-value">{retirementYears} years</span>
          </label>
          <input
            id="retirementYears"
            type="range"
            min="10"
            max="50"
            value={retirementYears}
            onChange={(e) => setRetirementYears(Number(e.target.value))}
          />
          <div className="slider-labels">
            <span>10 years</span>
            <span>50 years</span>
          </div>
        </div>

        <button
          type="button"
          className={`params-toggle ${settingsExpanded ? 'expanded' : ''}`}
          onClick={() => setSettingsExpanded(!settingsExpanded)}
        >
          <span className="params-toggle-label">Simulation Settings</span>
          <span className="params-toggle-summary">
            {Math.round(volatility * 100)}% vol, {Math.round(realGrowthRate * 100)}% growth
          </span>
          <span className={`toggle-arrow ${settingsExpanded ? 'expanded' : ''}`}>▼</span>
        </button>

        <div className={`growth-params-content ${settingsExpanded ? 'expanded' : ''}`}>
          <div className="input-group slider-group">
            <label htmlFor="spendVolatility">
              Price Volatility: <span className="slider-value">{Math.round(volatility * 100)}%</span>
            </label>
            <input
              id="spendVolatility"
              type="range"
              min="10"
              max="60"
              step="5"
              value={volatility * 100}
              onChange={(e) => setVolatility(Number(e.target.value) / 100)}
            />
            <div className="slider-labels">
              <span>10%</span>
              <span>60%</span>
            </div>
            <span className="input-hint">Mature assets: 15-25%. Higher vol = more risk but also more upside potential.</span>
          </div>

          <div className="input-group slider-group">
            <label htmlFor="spendRealGrowth">
              Real Growth Rate: <span className="slider-value">{Math.round(realGrowthRate * 100)}%</span>
            </label>
            <input
              id="spendRealGrowth"
              type="range"
              min="0"
              max="15"
              step="1"
              value={realGrowthRate * 100}
              onChange={(e) => setRealGrowthRate(Number(e.target.value) / 100)}
            />
            <div className="slider-labels">
              <span>0%</span>
              <span>15%</span>
            </div>
            <span className="input-hint">Expected return above inflation. 0% = conservative, 7-8% = stock-like, 10%+ = optimistic.</span>
          </div>

          <div className="input-group slider-group">
            <label htmlFor="spendInflation">
              Inflation Rate: <span className="slider-value">{(inflationRate * 100).toFixed(1)}%</span>
            </label>
            <input
              id="spendInflation"
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={inflationRate * 100}
              onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
            />
            <div className="slider-labels">
              <span>0%</span>
              <span>10%</span>
            </div>
            <span className="input-hint">Withdrawal amount increases yearly to maintain purchasing power.</span>
          </div>

          <div className="input-group slider-group">
            <label htmlFor="spendSimulations">
              Simulations: <span className="slider-value">{simulations}</span>
            </label>
            <input
              id="spendSimulations"
              type="range"
              min="100"
              max="2000"
              step="100"
              value={simulations}
              onChange={(e) => setSimulations(Number(e.target.value))}
            />
            <div className="slider-labels">
              <span>100</span>
              <span>2000</span>
            </div>
          </div>
        </div>
      </section>

      {drawdownResult && (
        <section className="adv-section results-section">
          <div className="results-header">
            <h2>Drawdown Results</h2>
          </div>

          <div className="summary-cards">
            <div className="summary-card">
              <span className="card-label">Success Rate</span>
              <span className={`card-value ${drawdownResult.successRate >= 0.9 ? 'highlight' : drawdownResult.successRate >= 0.7 ? '' : 'warning'}`}>
                {Math.round(drawdownResult.successRate * 100)}%
              </span>
              <span className="card-subvalue" style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                {drawdownResult.successRate >= 0.9 ? 'Excellent' : drawdownResult.successRate >= 0.7 ? 'Good' : 'Risky'}
              </span>
            </div>
            <div className="summary-card">
              <span className="card-label">Median Ending</span>
              <span className="card-value">
                {formatUSD(drawdownResult.medianEndingValue)}
              </span>
              <span className="card-subvalue" style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                After {retirementYears} years
              </span>
            </div>
            <div className="summary-card">
              <span className="card-label">Failed Runs</span>
              <span className={`card-value ${drawdownResult.successRate < 1 ? 'warning' : ''}`}>
                {Math.round((1 - drawdownResult.successRate) * simulations)}
              </span>
              {drawdownResult.medianFailureMonth && (
                <span className="card-subvalue" style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
                  Median: {formatMonth(drawdownResult.medianFailureMonth)}
                </span>
              )}
            </div>
          </div>

          <div className="chart-container">
            {isCalculating && (
              <div className="mc-loading-overlay" style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'var(--sol-purple)',
                fontWeight: 'bold'
              }}>
                <div>Running simulations...</div>
              </div>
            )}
            <DrawdownChart
              result={drawdownResult}
              retirementYears={retirementYears}
              monthlyIncome={monthlyIncome}
            />
          </div>

          <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(153, 69, 255, 0.05)', borderRadius: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <p style={{ margin: 0 }}>
              Simulating {simulations} retirement scenarios with {formatUSD(monthlyIncome)}/month withdrawals
              (inflation-adjusted at {(inflationRate * 100).toFixed(1)}% annually).
              {drawdownResult.successRate < 0.9 && (
                <span style={{ color: '#FF9500', fontWeight: 'bold' }}>
                  {' '}Consider reducing monthly income to {formatUSD(safeMonthlyWithdrawal)} for higher success rate.
                </span>
              )}
            </p>
          </div>
        </section>
      )}
    </>
  );
}
