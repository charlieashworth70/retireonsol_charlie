import { formatUSD, type RetirementProjection } from '../utils/calculations';
import './Results.css';

interface ResultsProps {
  projection: RetirementProjection;
}

export function Results({ projection }: ResultsProps) {
  const roi = ((projection.endValue - projection.totalInvested) / projection.totalInvested) * 100;
  const sustainable = projection.yearsOfIncome >= 30;

  return (
    <div className="results">
      <div className="result-card primary">
        <div className="result-label">Projected Portfolio Value</div>
        <div className="result-value">{formatUSD(projection.endValue)}</div>
        <div className="result-range">
          <span className="range-label">90% confidence:</span>
          <span className="range-values">
            {formatUSD(projection.worstCase)} — {formatUSD(projection.bestCase)}
          </span>
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
