import type { Tab } from '../App';
import './Header.css';

interface HeaderProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function Header({ tab, onTabChange }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">☀️</div>
        <div>
          <h1>RetireOnSol</h1>
          <p className="tagline">Your Solana retirement planner</p>
        </div>
      </div>
      
      <nav className="tabs">
        <button
          className={`tab ${tab === 'plan' ? 'active' : ''}`}
          onClick={() => onTabChange('plan')}
        >
          Plan
        </button>
        <button
          className={`tab ${tab === 'monitor' ? 'active' : ''}`}
          onClick={() => onTabChange('monitor')}
        >
          Monitor
        </button>
      </nav>
    </header>
  );
}
