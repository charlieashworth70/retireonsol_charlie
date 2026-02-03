import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { useState, useEffect, useCallback } from 'react';

const JITOSOL_MINT = new PublicKey('J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn');

export interface WalletBalanceResult {
  balance: number | null;
  jitoSolBalance: number | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useWalletBalance(): WalletBalanceResult {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [jitoSolBalance, setJitoSolBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      setJitoSolBalance(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch SOL balance
      const lamports = await connection.getBalance(publicKey);
      const sol = lamports / LAMPORTS_PER_SOL;

      // Fetch JitoSOL balance
      let jito = 0;
      try {
        const ata = await getAssociatedTokenAddress(JITOSOL_MINT, publicKey);
        const accountInfo = await connection.getTokenAccountBalance(ata);
        jito = Number(accountInfo.value.uiAmount ?? 0);
      } catch {
        // Account doesn't exist = 0 balance
        jito = 0;
      }

      setBalance(Math.round(sol * 100) / 100);
      setJitoSolBalance(Math.round(jito * 100) / 100);
    } catch (err) {
      console.error('Failed to fetch balance:', err);
      
      // Check if it's a 403 error (rate limiting)
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
        setError('RPC rate limit reached. Please try again in a moment or configure a custom RPC endpoint.');
      } else {
        setError('Could not fetch balance. Please check your connection.');
      }
      
      setBalance(null);
      setJitoSolBalance(null);
    } finally {
      setLoading(false);
    }
  }, [publicKey, connected, connection]);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
    } else {
      setBalance(null);
      setJitoSolBalance(null);
      setError(null);
    }
  }, [connected, publicKey, fetchBalance]);

  return { balance, jitoSolBalance, loading, error, refetch: fetchBalance };
}
