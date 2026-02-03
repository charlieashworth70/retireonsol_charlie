import { useState, useMemo } from 'react';
import { WalletProvider } from './contexts/WalletProvider';
import { Header } from './components/Header';
import { Calculator } from './components/Calculator';
import { Results } from './components/Results';
import { AdvancedMode } from './components/AdvancedMode';
import { calculateRetirement } from './utils/calculationsBasic';
import './App.css';

type Mode = 'basic' | 'advanced';

function App() {
  // Mode toggle - state persists between switches
  const [mode, setMode] = useState<Mode>('basic');
  
  // Core inputs - shared between modes
  const [currentSOL, setCurrentSOL] = useState(100);
  const [dcaMonthly, setDcaMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [withdrawalMonthly, setWithdrawalMonthly] = useState(3000);
  
  // Calculate projection with fixed parameters (Basic mode)
  const projection = useMemo(() => {
    return calculateRetirement({
      currentSOL,
      dcaMonthly,
      years,
      withdrawalMonthly
    });
  }, [currentSOL, dcaMonthly, years, withdrawalMonthly]);

  return (
    <WalletProvider>
      <div className="app">
        <Header />
        
        {/* Mode Toggle */}
        <div className="mode-toggle-container">
          <div className="mode-toggle">
            <button
              className={`mode-btn ${mode === 'basic' ? 'active' : ''}`}
              onClick={() => setMode('basic')}
            >
              Basic mode
            </button>
            <button
              className={`mode-btn ${mode === 'advanced' ? 'active' : ''}`}
              onClick={() => setMode('advanced')}
            >
              Advanced mode
            </button>
          </div>
        </div>
        
        <main className="container">
          {mode === 'basic' ? (
            <>
              <Calculator
                currentSOL={currentSOL}
                dcaMonthly={dcaMonthly}
                years={years}
                withdrawalMonthly={withdrawalMonthly}
                onCurrentSOLChange={setCurrentSOL}
                onDcaMonthlyChange={setDcaMonthly}
                onYearsChange={setYears}
                onWithdrawalMonthlyChange={setWithdrawalMonthly}
              />
              <Results 
                projection={projection} 
                years={years}
                currentSOL={currentSOL}
                dcaMonthly={dcaMonthly}
              />
            </>
          ) : (
            <AdvancedMode 
              initialSOL={currentSOL}
              initialDCA={dcaMonthly}
              initialYears={years}
            />
          )}
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
