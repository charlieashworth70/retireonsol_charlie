import { formatUSD, type RetirementProjection } from '../utils/calculations';
import './Results.css';

interface ResultsProps {
  projection: RetirementProjection;
}

export function Results({ projection }: ResultsProps) {
  const roi = ((projection.p50 - projection.totalInvested) / projection.totalInvested) * 100;
  const sustainable = projection.yearsOfIncome >= 30;

  return (
    <div className="results">
      <div className="result-card primary">
        <div className="result-label">Projected Portfolio Value (Median)</div>
        <div className="result-value">{formatUSD(projection.p50)}</div>
        <div className="result-range">
          <div style={{ fontSize: '0.9em', marginTop: '8px', color: '#888' }}>
            <div>Pessimistic (P10): {formatUSD(projection.p10)}</div>
            <div>Median (P50): {formatUSD(projection.p50)}</div>
            <div>Optimistic (P90): {formatUSD(projection.p90)}</div>
          </div>
        </div>
      </div>

      <div className="result-grid">
        <div className="result-card">
          <div className="result-label">Total Invested</div>
          <div className="result-value-sm">{formatUSD(projection.totalInvested)}</div>
        </div>

        <div className="result-card">
          <div className="result-label">ROI</div>
          <div className={`result-value-sm ${roi > 100 ? 'positive' : ''}`}>
            +{roi.toFixed(0)}%
          </div>
        </div>

        <div className="result-card">
          <div className="result-label">Monthly Income</div>
          <div className="result-value-sm">{formatUSD(projection.monthlyIncome)}/mo</div>
        </div>

        <div className="result-card">
          <div className="result-label">Years of Income</div>
          <div className={`result-value-sm ${sustainable ? 'positive' : 'warning'}`}>
            {projection.yearsOfIncome.toFixed(1)} years
          </div>
        </div>
      </div>

      <div style={{ fontSize: '0.85em', color: '#666', marginTop: '12px', fontStyle: 'italic' }}>
        Based on 15% CAGR growth, 3.5% inflation (always applied)
      </div>

      {!sustainable && (
        <div className="warning-banner">
          ⚠️ Your portfolio may not last 30+ years at this withdrawal rate. 
          Consider increasing DCA or reducing monthly income.
        </div>
      )}

      {sustainable && (
        <div className="success-banner">
          ✅ Your plan looks sustainable! You can withdraw {formatUSD(projection.monthlyIncome)}/month 
          for {projection.yearsOfIncome.toFixed(0)} years.
        </div>
      )}
    </div>
  );
}
