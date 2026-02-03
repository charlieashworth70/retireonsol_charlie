import { createContext, useContext, useState, useCallback, useMemo, useEffect, type FC, type ReactNode } from 'react';
import { 
  ConnectionProvider, 
  WalletProvider as SolanaWalletProvider,
  useWallet as useSolanaWallet,
  useConnection
} from '@solana/wallet-adapter-react';
import { WalletModalProvider, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';

// Import wallet adapter CSS
import '@solana/wallet-adapter-react-ui/styles.css';

// JitoSOL mint address on mainnet
const JITOSOL_MINT = new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn');

interface WalletContextType {
  connected: boolean;
  balance: number | null;
  jitoBalance: number | null;
  address: string | null;
  connect: () => void;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  isRefreshing: boolean;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  balance: null,
  jitoBalance: null,
  address: null,
  connect: () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
  isRefreshing: false
});

export const useWallet = () => useContext(WalletContext);

const WalletContent: FC<{ children: ReactNode }> = ({ children }) => {
  const { connected, publicKey, disconnect: walletDisconnect, wallet } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [jitoBalance, setJitoBalance] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const address = useMemo(() => publicKey?.toBase58() || null, [publicKey]);

  // Fetch SOL and JitoSOL balance
  const refreshBalance = useCallback(async () => {
    if (!publicKey || !connection) {
      setBalance(null);
      setJitoBalance(null);
      return;
    }

    setIsRefreshing(true);
    try {
      // Fetch SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setBalance(solBalance / LAMPORTS_PER_SOL);

      // Fetch JitoSOL balance
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          mint: JITOSOL_MINT
        });
        
        if (tokenAccounts.value.length > 0) {
          const jitoAccount = tokenAccounts.value[0];
          const jitoAmount = jitoAccount.account.data.parsed?.info?.tokenAmount?.uiAmount || 0;
          setJitoBalance(jitoAmount);
        } else {
          setJitoBalance(0);
        }
      } catch {
        // JitoSOL fetch failed, set to 0
        setJitoBalance(0);
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      
      // Log helpful message for RPC errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        console.error('RPC rate limit hit. Consider configuring VITE_SOLANA_RPC_URL in .env');
      }
      
      setBalance(null);
      setJitoBalance(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [publicKey, connection]);

  // Fetch balance when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      refreshBalance();
    } else {
      setBalance(null);
      setJitoBalance(null);
    }
  }, [connected, publicKey, refreshBalance]);

  const connect = useCallback(() => {
    // If no wallet is selected, open the modal to select one
    if (!wallet) {
      setVisible(true);
    }
  }, [wallet, setVisible]);

  const disconnect = useCallback(async () => {
    await walletDisconnect();
    setBalance(null);
    setJitoBalance(null);
  }, [walletDisconnect]);

  const value: WalletContextType = {
    connected,
    balance,
    jitoBalance,
    address,
    connect,
    disconnect,
    refreshBalance,
    isRefreshing
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = useMemo(() => {
    // Use environment variable or fall back to Ankr's free RPC
    return import.meta.env.VITE_SOLANA_RPC_URL || 'https://rpc.ankr.com/solana';
  }, []);
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ], []);

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
