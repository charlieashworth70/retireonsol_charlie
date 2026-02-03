/**
 * MonitorAccum — Accumulation phase monitoring
 *
 * Shows:
 * 1. Funding status (wallet vs plan target with progress bars)
 * 2. DCA schedule (missed payments, next due date)
 * 3. Progress tracker (days since activation, value comparison)
 */

import { formatUSD, formatSOL } from '../utils/calculations';
import {
  calculateDCASchedule,
  formatRelativeDate,
  daysSince,
} from '../utils/dcaSchedule';
import { JupiterSwapPlaceholder } from './JupiterSwapPlaceholder';
import type { ActivePlan } from '../utils/storage';
import './MonitorAccum.css';

export interface MonitorAccumProps {
  activePlan: ActivePlan;
  walletSOL: number | null; // null = not connected
  walletJitoSOL: number | null;
  currentPrice: number | null;
  connected: boolean;
  demoDate?: Date | null;
  completedDCAs?: Set<string>;
  onMarkDCAComplete?: (isoDate: string) => void;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  const filled = Math.round(pct / 10);
  const empty = 10 - filled;
  const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);
  const isFunded = current >= target;

  return (
    <div className="progress-bar-row">
      <span className="progress-bar-text">{bar}</span>
      <span className="progress-bar-values">
        {formatSOL(current)}/{formatSOL(target)}
        {isFunded ? ' ✅' : ` (need ${formatSOL(Math.max(0, target - current))} more)`}
      </span>
    </div>
  );
}

export function MonitorAccum({
  activePlan,
  walletSOL,
  walletJitoSOL,
  currentPrice,
  connected,
  demoDate,
  completedDCAs = new Set(),
  onMarkDCAComplete,
}: MonitorAccumProps) {
  const { settings, activatedAt } = activePlan;
  const targetSOL = settings.currentSOL;
  const targetJitoSOL = settings.currentJitoSOL;

  const solBalance = walletSOL ?? 0;
  const jitoBalance = walletJitoSOL ?? 0;

  const solFunded = solBalance >= targetSOL;
  const jitoFunded = jitoBalance >= targetJitoSOL;
  const allFunded = solFunded && jitoFunded;

  const solGap = Math.max(0, targetSOL - solBalance);
  const jitoGap = Math.max(0, targetJitoSOL - jitoBalance);
  const totalGapSOL = solGap + jitoGap; // JitoSOL ≈ SOL for value purposes
  const gapUSD = currentPrice ? totalGapSOL * currentPrice : null;

  // DCA schedule (use demo date if provided)
  const dcaSchedule = calculateDCASchedule(
    activatedAt,
    settings.dcaFrequency,
    settings.dcaAmountUSD,
    demoDate || undefined
  );

  // Adjust missed count for completed DCAs
  const actualMissed = dcaSchedule.allDueDates.filter(
    (date) => !completedDCAs.has(date.toISOString())
  );
  const actualMissedCount = actualMissed.length;
  const actualMissedTotal = actualMissedCount * settings.dcaAmountUSD;
  const actualCompletedCount = dcaSchedule.totalDueCount - actualMissedCount;

  // Progress tracking
  const daysActive = daysSince(activatedAt);

  return (
    <div className="monitor-accum">
      {/* ── Funding Status ── */}
      <div className="monitor-accum-section">
        {allFunded && connected ? (
          <div className="funding-status funded">
            <h3>✅ Plan Funded!</h3>
            <div className="funding-lines">
              <div className="funding-line">
                SOL: {formatSOL(solBalance)}/{formatSOL(targetSOL)} ✅
              </div>
              {targetJitoSOL > 0 && (
                <div className="funding-line">
                  JitoSOL: {formatSOL(jitoBalance)}/{formatSOL(targetJitoSOL)} ✅
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="funding-status unfunded">
            <h3>📊 Fund Your Plan</h3>
            {!connected ? (
              <p className="funding-note">
                Connect your wallet to see funding progress
              </p>
            ) : (
              <>
                <div className="funding-targets">
                  <div className="funding-target-row">
                    <span className="funding-label">Plan Target:</span>
                    <span className="funding-value">
                      {formatSOL(targetSOL)} SOL
                      {targetJitoSOL > 0 && ` + ${formatSOL(targetJitoSOL)} JitoSOL`}
                    </span>
                  </div>
                  <div className="funding-target-row">
                    <span className="funding-label">Wallet:</span>
                    <span className="funding-value">
                      {formatSOL(solBalance)} SOL
                      {targetJitoSOL > 0 && ` + ${formatSOL(jitoBalance)} JitoSOL`}
                    </span>
                  </div>
                </div>

                <div className="funding-progress">
                  <div className="funding-progress-item">
                    <span className="funding-progress-label">SOL:</span>
                    <ProgressBar current={solBalance} target={targetSOL} />
                  </div>
                  {targetJitoSOL > 0 && (
                    <div className="funding-progress-item">
                      <span className="funding-progress-label">JitoSOL:</span>
                      <ProgressBar current={jitoBalance} target={targetJitoSOL} />
                    </div>
                  )}
                </div>

                {!allFunded && gapUSD !== null && (
                  <p className="funding-gap">
                    You&apos;re behind your plan by{' '}
                    <strong>{formatUSD(gapUSD)}</strong> at current prices
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Quick Swap (only when connected) ── */}
      {connected && (
        <div className="monitor-accum-section">
          <h3>⚡ Quick Swap</h3>
          <JupiterSwapPlaceholder
            fromToken="SOL"
            toToken="JitoSOL"
          />
        </div>
      )}

      {/* ── DCA Schedule ── */}
      <div className="monitor-accum-section">
        <h3>📅 DCA Schedule</h3>
        <div className="dca-info">
          <div className="dca-info-row">
            <span className="dca-label">Frequency:</span>
            <span className="dca-value">
              {formatUSD(settings.dcaAmountUSD)} / {settings.dcaFrequency}
            </span>
          </div>
          <div className="dca-info-row">
            <span className="dca-label">Next DCA:</span>
            <span className="dca-value">
              {formatRelativeDate(dcaSchedule.nextDCADate)} —{' '}
              {dcaSchedule.nextDCADate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="dca-info-row">
            <span className="dca-label">DCAs due since start:</span>
            <span className="dca-value">{dcaSchedule.totalDueCount}</span>
          </div>
          {actualCompletedCount > 0 && (
            <div className="dca-info-row">
              <span className="dca-label">Completed:</span>
              <span className="dca-value" style={{ color: '#14F195' }}>
                {actualCompletedCount} ✅
              </span>
            </div>
          )}
        </div>

        {actualMissedCount > 0 && (
          <div className="dca-warning">
            <span className="dca-warning-icon">⚠️</span>
            <div className="dca-warning-text">
              <strong>
                {actualMissedCount} DCA payment{actualMissedCount > 1 ? 's' : ''} overdue
              </strong>{' '}
              ({formatUSD(settings.dcaAmountUSD)} {settings.dcaFrequency})
              <br />
              You&apos;ve missed{' '}
              <strong>{formatUSD(actualMissedTotal)}</strong> in planned
              purchases.

              {onMarkDCAComplete && actualMissed.length > 0 && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {actualMissed.slice(-3).reverse().map((date) => (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => onMarkDCAComplete(date.toISOString())}
                      style={{
                        padding: '4px 10px',
                        background: 'rgba(20, 241, 149, 0.1)',
                        border: '1px solid #14F195',
                        borderRadius: '6px',
                        color: '#14F195',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}
                    >
                      Mark {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} Done
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {dcaSchedule.totalDueCount === 0 && (
          <p className="dca-note">
            No DCA payments due yet — your first one is coming up!
          </p>
        )}
      </div>

      {/* ── Progress Tracker ── */}
      <div className="monitor-accum-section">
        <h3>📈 Progress</h3>
        <div className="progress-stats">
          <div className="progress-stat">
            <span className="progress-stat-label">Days active</span>
            <span className="progress-stat-value">{daysActive}</span>
          </div>
          <div className="progress-stat">
            <span className="progress-stat-label">Plan started</span>
            <span className="progress-stat-value">
              {new Date(activatedAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
          {connected && currentPrice !== null && (
            <div className="progress-stat">
              <span className="progress-stat-label">Current wallet value</span>
              <span className="progress-stat-value">
                {formatUSD((solBalance + jitoBalance) * currentPrice)}
              </span>
            </div>
          )}
          {currentPrice !== null && (
            <div className="progress-stat">
              <span className="progress-stat-label">
                Expected invested (DCA)
              </span>
              <span className="progress-stat-value">
                {formatUSD(
                  dcaSchedule.totalDueCount * settings.dcaAmountUSD +
                    (targetSOL + targetJitoSOL) * currentPrice
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
