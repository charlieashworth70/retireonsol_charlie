import { useWallet } from '../contexts/WalletProvider';
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
  const { connected, balance, connect } = useWallet();

  const handleImportWallet = () => {
    if (!connected) {
      connect();
    } else if (balance !== null) {
      onCurrentSOLChange(balance);
    }
  };

  return (
    <div className="calculator card">
      <h2>Your Plan</h2>
      
      <div className="input-group">
        <div className="label-row">
          <label>Current SOL Holdings</label>
          {!connected ? (
            <button className="link-btn" onClick={handleImportWallet}>
              Connect Wallet
            </button>
          ) : (
            <button className="link-btn" onClick={handleImportWallet}>
              Import Balance
            </button>
          )}
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
        <label>Monthly Income in Retirement (USD)</label>
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
