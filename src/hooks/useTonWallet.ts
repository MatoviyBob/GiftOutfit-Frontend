/**
 * Hook for TON Connect wallet state management.
 * Provides connect/disconnect + wallet address.
 * On connect/disconnect, syncs the wallet address to the server so the backend
 * can fetch wallet NFTs for the gift cache.
 */

import { useEffect, useRef } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { updateTonWallet } from '@/api/user';

export const useTonWalletConnect = () => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  const connect = async () => {
    await tonConnectUI.openModal();
  };

  const disconnect = async () => {
    await tonConnectUI.disconnect();
  };

  const isConnected = !!wallet;
  const walletAddress = wallet?.account?.address ?? null;
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  // Sync wallet address to server whenever it changes.
  const prevAddressRef = useRef<string | null>(undefined as unknown as null);
  useEffect(() => {
    if (prevAddressRef.current === walletAddress) return;
    prevAddressRef.current = walletAddress;
    // Fire-and-forget — keep the wallet UI responsive even if the sync fails,
    // but log the failure so a silently-broken /me/ton-wallet is diagnosable.
    updateTonWallet(walletAddress).catch((err) => {
      console.error('[useTonWallet] failed to sync wallet address to server:', err);
    });
  }, [walletAddress]);

  return {
    isConnected,
    wallet,
    walletAddress,
    shortAddress,
    connect,
    disconnect,
  };
};
