import { formatUSD, formatSOL } from '../utils/calculations';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { loadActivePlan } from '../utils/storage';

interface MonitorAccumProps {
  currentJitoSOL: number;
  currentPrice: number;
  targetSOL: number;
  years: number;
  dcaAmountUSD: number;
  dcaFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  walletSOL: number | null;
  walletJitoSOL: number | null;
  connected: boolean;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const isFunded = current >= target;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '1.1rem', fontFamily: 'monospace' }}>
      <span style={{ color: 'var(--sol-green)' }}>{bar}</span>
      <span style={{ fontSize: '0.9rem' }}>
        {formatSOL(current)}/{formatSOL(target)}
        {isFunded ? ' ✅' : ` (need ${formatSOL(Math.max(0, target - current))} more)`}
      </span>
    </div>
  );
}

export function MonitorAccum({
  currentJitoSOL,
  currentPrice,
  targetSOL,
  years,
  dcaAmountUSD,
  dcaFrequency,
  walletSOL,
  walletJitoSOL,
  connected,
}: MonitorAccumProps) {
  const { setVisible } = useWalletModal();
  const solBalance = walletSOL ?? 0;
  const jitoBalance = walletJitoSOL ?? 0;
  const targetJitoSOL = currentJitoSOL;

  const solFunded = solBalance >= targetSOL;
  const jitoFunded = jitoBalance >= targetJitoSOL;
  const allFunded = solFunded && (targetJitoSOL === 0 || jitoFunded);

  const solGap = Math.max(0, targetSOL - solBalance);
  const jitoGap = Math.max(0, targetJitoSOL - jitoBalance);
  const totalGapSOL = solGap + jitoGap;
  const gapUSD = totalGapSOL * currentPrice;

  const totalValue = (solBalance + jitoBalance) * currentPrice;

  // Calculate expected DCA contribution (simplified - assumes plan started today)
  const expectedInvested = targetSOL * currentPrice + (dcaAmountUSD * 12 * years);

  // Check if there's an active plan
  const activePlan = loadActivePlan();
  const hasActivePlan = activePlan !== null && activePlan.startPhase === 'accum';
  // Use hasActivePlan to suppress unused variable warning if needed, or remove if logic changes
  void hasActivePlan; 

  return (
    <div>
      <section className="adv-section">
        {!hasActivePlan ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(153, 69, 255, 0.05)', borderRadius: '12px' }}>
            <h3 style={{ color: 'var(--sol-purple)', margin: '0 0 1rem 0' }}>
              No Active Plan
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              You haven't executed a retirement plan yet. Go to the Plan tab to design and execute your strategy.
            </p>
          </div>
        ) : allFunded && connected ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(20, 241, 149, 0.1)', borderRadius: '12px' }}>
            <h3 style={{ color: 'var(--sol-green)', margin: '0 0 1rem 0', fontSize: '1.5rem' }}>
              ✅ Plan Funded!
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '1.1rem' }}>
              <div>
                SOL: {formatSOL(solBalance)}/{formatSOL(targetSOL)} ✅
              </div>
              {targetJitoSOL > 0 && (
                <div>
                  JitoSOL: {formatSOL(jitoBalance)}/{formatSOL(targetJitoSOL)} ✅
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <h2>📊 Fund Your Plan</h2>
            {!connected ? (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Connect your wallet to see funding progress
                </p>
                <button className="btn-primary" onClick={() => setVisible(true)}>
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-dark)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Plan Target:</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {formatSOL(targetSOL)} SOL
                      {targetJitoSOL > 0 && ` + ${formatSOL(targetJitoSOL)} JitoSOL`}
                    </span>
                  </div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    padding: '0.75rem',
                    background: 'var(--bg-dark)',
                    borderRadius: '8px'
                  }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Wallet:</span>
                    <span style={{ fontWeight: 'bold' }}>
                      {formatSOL(solBalance)} SOL
                      {targetJitoSOL > 0 && ` + ${formatSOL(jitoBalance)} JitoSOL`}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                      SOL:
                    </div>
                    <ProgressBar current={solBalance} target={targetSOL} />
                  </div>
                  {targetJitoSOL > 0 && (
                    <div>
                      <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        JitoSOL:
                      </div>
                      <ProgressBar current={jitoBalance} target={targetJitoSOL} />
                    </div>
                  )}
                </div>

                {!allFunded && (
                  <p style={{ 
                    padding: '1rem', 
                    background: 'rgba(255, 149, 0, 0.1)', 
                    border: '1px solid rgba(255, 149, 0, 0.3)',
                    borderRadius: '8px',
                    color: '#FF9500',
                    fontWeight: 'bold'
                  }}>
                    You're behind your plan by {formatUSD(gapUSD)} at current prices
                  </p>
                )}
              </>
            )}
          </>
        )}
      </section>

      <section className="adv-section">
        <h2>📅 DCA Schedule</h2>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Frequency:</span>
            <span style={{ fontWeight: 'bold' }}>
              {formatUSD(dcaAmountUSD)} / {dcaFrequency}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Accumulation period:</span>
            <span style={{ fontWeight: 'bold' }}>{years} years</span>
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
          💡 Activate plan tracking to monitor DCA payments and progress
        </p>
      </section>

      <section className="adv-section">
        <h2>📈 Progress</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
          {connected && (
            <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                Current wallet value
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--sol-green)' }}>
                {formatUSD(totalValue)}
              </div>
            </div>
          )}
          <div style={{ textAlign: 'center', padding: '1rem', background: 'var(--bg-dark)', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              Expected invested (DCA)
            </div>
            <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>
              {formatUSD(expectedInvested)}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
