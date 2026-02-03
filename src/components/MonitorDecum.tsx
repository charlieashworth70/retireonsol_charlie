import { formatUSD, formatSOL } from '../utils/calculations';

interface MonitorDecumProps {
  currentSOL: number;
  currentPrice: number;
  monthlyIncome: number;
  retirementYears: number;
  walletSOL: number | null;
  walletJitoSOL: number | null;
  connected: boolean;
}

export function MonitorDecum({
  currentSOL,
  currentPrice,
  monthlyIncome,
  retirementYears,
  walletSOL,
  walletJitoSOL,
  connected,
}: MonitorDecumProps) {
  const solBalance = walletSOL ?? 0;
  const jitoBalance = walletJitoSOL ?? 0;
  const totalBalance = solBalance + jitoBalance;
  const walletValueUSD = totalBalance * currentPrice;

  const startingValueUSD = currentSOL * currentPrice;

  // Simple mock: assume we're at start of retirement
  const monthsElapsed = 0;
  const totalRetirementMonths = retirementYears * 12;

  return (
    <div>
      <section className="adv-section">
        <h2>💰 Balance Status</h2>
        {!connected ? (
          <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
            Connect your wallet to compare your balance against the plan
          </p>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--bg-dark)',
              borderRadius: '8px'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Wallet value:</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: 'var(--sol-green)' }}>
                  {formatUSD(walletValueUSD)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  ({formatSOL(totalBalance)} SOL)
                </div>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '1rem',
              background: 'var(--bg-dark)',
              borderRadius: '8px'
            }}>
              <span style={{ color: 'var(--text-secondary)' }}>Expected remaining:</span>
              <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                {formatUSD(startingValueUSD)}
              </div>
            </div>

            <div style={{ 
              padding: '1rem', 
              background: 'rgba(20, 241, 149, 0.1)', 
              border: '1px solid var(--sol-green)',
              borderRadius: '8px',
              color: 'var(--sol-green)',
              textAlign: 'center',
              fontWeight: 'bold'
            }}>
              ✅ You're on track with your withdrawal plan
            </div>
          </div>
        )}
      </section>

      <section className="adv-section">
        <h2>📅 Withdrawal Schedule</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Monthly withdrawal:</span>
            <span style={{ fontWeight: 'bold' }}>{formatUSD(monthlyIncome)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Withdrawals made:</span>
            <span style={{ fontWeight: 'bold' }}>
              {monthsElapsed} of {totalRetirementMonths} total
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Total withdrawn (est.):</span>
            <span style={{ fontWeight: 'bold' }}>
              {formatUSD(monthsElapsed * monthlyIncome)}
            </span>
          </div>
        </div>
        <p style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: 'rgba(153, 69, 255, 0.05)', 
          borderRadius: '8px',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)'
        }}>
          💡 Activate plan tracking to monitor actual withdrawals over time
        </p>
      </section>

      <section className="adv-section">
        <h2>📈 Spend Progress</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Months elapsed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {monthsElapsed}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Months remaining
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {totalRetirementMonths - monthsElapsed}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Retirement plan
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              {retirementYears} years
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
