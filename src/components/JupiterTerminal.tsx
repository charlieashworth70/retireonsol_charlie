import { useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

declare global {
  interface Window {
    Jupiter: any;
  }
}

export function JupiterTerminal({ onClose }: { onClose: () => void }) {
  const wallet = useWallet();
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    function initJupiter() {
      attempts++;

      if (window.Jupiter?.init) {
        console.log('[Jupiter] Initializing plugin...');
        try {
          const container = document.getElementById('integrated-terminal');
          if (container) {
            container.innerHTML = '';
          }

          window.Jupiter.init({
            displayMode: 'integrated',
            integratedTargetId: 'integrated-terminal',
            endpoint: 'https://solana-mainnet.phantom.app/YBPpkkN4g91xDiAnTE9r0RcMkjg0sKUIWvAfoFVJ',
            defaultExplorer: 'SolanaFM',
            enableWalletPassthrough: true,
            passthroughWalletContextState: wallet,
            formProps: {
              fixedOutputMint: true,
              initialOutputMint: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
              initialInputMint: 'So11111111111111111111111111111111111111112',
            },
          });
          console.log('[Jupiter] Plugin initialized successfully');
        } catch (err) {
          console.error('[Jupiter] Init error:', err);
        }
      } else if (attempts < maxAttempts) {
        setTimeout(initJupiter, 500);
      } else {
        console.error('[Jupiter] Failed to load after', maxAttempts, 'attempts');
      }
    }

    const existingScript = document.querySelector('script[src*="plugin.jup.ag"]');
    if (existingScript) {
      initJupiter();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://plugin.jup.ag/plugin-v1.js';
    script.defer = true;
    script.onload = () => {
      setTimeout(initJupiter, 100);
    };
    script.onerror = () => {
      console.error('[Jupiter] Failed to load script from plugin.jup.ag');
    };
    document.head.appendChild(script);
  }, [wallet]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div style={{
        width: '100%', maxWidth: '400px', height: '600px',
        background: '#303030', borderRadius: '16px', overflow: 'hidden',
        position: 'relative',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
      }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            zIndex: 99999, background: 'rgba(40,40,40,0.95)', color: '#fff',
            border: '2px solid #14F195', borderRadius: '50%', width: '36px', height: '36px',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 'bold',
            transition: 'all 0.2s',
          }}
        >X</button>
        <div id="integrated-terminal" style={{ width: '100%', height: '100%' }}>
          <div style={{
            height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#888', fontSize: '0.9rem'
          }}>
            Loading Jupiter...
          </div>
        </div>
      </div>
    </div>
  );
}
