import './Header.css';

export function Header() {
  const handleAdvancedClick = () => {
    // Placeholder - will link to full RetireOnSol in future
    alert('Advanced features coming soon! This will link to the full RetireOnSol calculator.');
  };

  return (
    <header className="header">
      <div className="header-brand">
        <div className="logo">☀️</div>
        <div>
          <h1>RetireOnSol</h1>
          <p className="tagline">Your Solana retirement planner</p>
        </div>
      </div>
      
      <button 
        className="advanced-btn"
        onClick={handleAdvancedClick}
        style={{
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '8px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500'
        }}
      >
        Advanced
      </button>
    </header>
  );
}
