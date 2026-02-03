import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletBalance } from '../hooks/useWalletBalance';
import './Calculator.css';

interface CalculatorProps {
  currentSOL: number;
  dcaMonthly: number;
  years: number;
  withdrawalMonthly: number;
  onCurrentSOLChange: (value: number) => void;
  onDcaMonthlyChange: (value: number) => void;
  onYearsChange: (value: number) => void;
  onWithdrawalMonthlyChange: (value: number) => void;
}

export function Calculator({
  currentSOL,
  dcaMonthly,
  years,
  withdrawalMonthly,
  onCurrentSOLChange,
  onDcaMonthlyChange,
  onYearsChange,
  onWithdrawalMonthlyChange
}: CalculatorProps) {
  const { connected } = useWallet();
  const { setVisible: setWalletModalVisible } = useWalletModal();
  const { balance, loading: walletLoading, error: walletError } = useWalletBalance();
  const [pendingImport, setPendingImport] = useState(false);
  const [imported, setImported] = useState(false);
  const importTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When wallet connects and we have a pending import, do the import
  useEffect(() => {
    if (pendingImport && connected && !walletLoading) {
      if (balance !== null) {
        onCurrentSOLChange(balance);
        setPendingImport(false);
        setImported(true);
        if (importTimerRef.current) clearTimeout(importTimerRef.current);
        importTimerRef.current = setTimeout(() => setImported(false), 3000);
      } else if (walletError) {
        setPendingImport(false);
      }
    }
  }, [pendingImport, connected, walletLoading, balance, walletError, onCurrentSOLChange]);

  const handleImportWallet = () => {
    if (connected && balance !== null) {
      onCurrentSOLChange(balance);
      setImported(true);
      if (importTimerRef.current) clearTimeout(importTimerRef.current);
      importTimerRef.current = setTimeout(() => setImported(false), 3000);
    } else {
      setPendingImport(true);
      setWalletModalVisible(true);
    }
  };

  return (
    <div className="calculator card">
      <h2>Your Plan</h2>
      
      {imported && (
        <div style={{
          background: 'rgba(20, 241, 149, 0.1)',
          border: '1px solid rgba(20, 241, 149, 0.3)',
          borderRadius: '6px',
          padding: '6px 10px',
          marginBottom: '10px',
          fontSize: '0.8rem',
          color: '#14F195',
          textAlign: 'center',
        }}>
          ✓ Balance imported from wallet
        </div>
      )}
      <div className="input-group">
        <div className="label-row">
          <label>Current SOL Holdings</label>
          <button className="link-btn" onClick={handleImportWallet} disabled={walletLoading}>
            {walletLoading ? 'Loading...' : (connected ? 'Import Balance' : 'Connect & Import')}
          </button>
        </div>
        <input
          type="number"
          className="input-lg"
          value={currentSOL}
          onChange={(e) => onCurrentSOLChange(Number(e.target.value))}
          min="0"
          step="10"
        />
        <input
          type="range"
          min="0"
          max="1000"
          step="10"
          value={Math.min(currentSOL, 1000)}
          onChange={(e) => onCurrentSOLChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="input-group">
        <label>Monthly DCA (USD)</label>
        <div className="input-with-prefix">
          <span className="prefix">$</span>
          <input
            type="number"
            className="input-lg"
            value={dcaMonthly}
            onChange={(e) => onDcaMonthlyChange(Number(e.target.value))}
            min="0"
            step="50"
          />
        </div>
        <input
          type="range"
          min="0"
          max="5000"
          step="50"
          value={Math.min(dcaMonthly, 5000)}
          onChange={(e) => onDcaMonthlyChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="input-group">
        <label>Years Until Retirement</label>
        <input
          type="number"
          className="input-lg"
          value={years}
          onChange={(e) => onYearsChange(Number(e.target.value))}
          min="1"
          max="40"
        />
        <input
          type="range"
          min="1"
          max="40"
          value={years}
          onChange={(e) => onYearsChange(Number(e.target.value))}
          className="slider"
        />
      </div>

      <div className="input-group">
        <label>Monthly Income in Retirement (in today's money)</label>
        <div className="input-with-prefix">
          <span className="prefix">$</span>
          <input
            type="number"
            className="input-lg"
            value={withdrawalMonthly}
            onChange={(e) => onWithdrawalMonthlyChange(Number(e.target.value))}
            min="0"
            step="100"
          />
        </div>
        <input
          type="range"
          min="0"
          max="10000"
          step="100"
          value={Math.min(withdrawalMonthly, 10000)}
          onChange={(e) => onWithdrawalMonthlyChange(Number(e.target.value))}
          className="slider"
        />
      </div>
    </div>
  );
}
