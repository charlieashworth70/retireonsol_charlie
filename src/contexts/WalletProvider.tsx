import { createContext, useContext, useState, useCallback, useMemo, type FC, type ReactNode } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

interface WalletContextType {
  connected: boolean;
  balance: number | null;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  balance: null,
  address: null,
  connect: () => {},
  disconnect: () => {}
});

export const useWallet = () => useContext(WalletContext);

const WalletContent: FC<{ children: ReactNode }> = ({ children }) => {
  const { connected, publicKey, connect: walletConnect, disconnect: walletDisconnect } = useSolanaWallet();
  const [balance, setBalance] = useState<number | null>(null);

  const address = useMemo(() => publicKey?.toBase58() || null, [publicKey]);

  const connect = useCallback(async () => {
    try {
      await walletConnect();
      // TODO: Fetch actual balance from RPC
      setBalance(150); // Mock for now
    } catch (error) {
      console.error('Wallet connection failed:', error);
    }
  }, [walletConnect]);

  const disconnect = useCallback(async () => {
    await walletDisconnect();
    setBalance(null);
  }, [walletDisconnect]);

  const value: WalletContextType = {
    connected,
    balance,
    address,
    connect,
    disconnect
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('mainnet-beta'), []);
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletContent>{children}</WalletContent>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};
