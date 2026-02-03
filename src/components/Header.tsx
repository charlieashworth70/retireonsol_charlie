import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">☀️</div>
        <div>
          <h1>RetireOnSol</h1>
          <p className="tagline">Your Solana retirement planner</p>
        </div>
      </div>
    </header>
  );
}
