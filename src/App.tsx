import { useState, useMemo } from 'react';
import { WalletProvider } from './contexts/WalletProvider';
import { Header } from './components/Header';
import { Calculator } from './components/Calculator';
import { Results } from './components/Results';
import { Monitor } from './components/Monitor';
import { calculateRetirement } from './utils/calculations';
import './App.css';

export type Tab = 'plan' | 'monitor';

function App() {
  const [tab, setTab] = useState<Tab>('plan');
  
  // Core inputs
  const [currentSOL, setCurrentSOL] = useState(100);
  const [dcaMonthly, setDcaMonthly] = useState(500);
  const [years, setYears] = useState(10);
  const [withdrawalMonthly, setWithdrawalMonthly] = useState(3000);
  
  // Calculate projection
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
        <Header tab={tab} onTabChange={setTab} />
        
        <main className="container">
          {tab === 'plan' ? (
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
              <Results projection={projection} />
            </>
          ) : (
            <Monitor />
          )}
        </main>
      </div>
    </WalletProvider>
  );
}

export default App;
