/**
 * Hook for TON Connect wallet state management.
 * Provides connect/disconnect + wallet address.
 */

import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';

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
  // Friendly address (non-bounceable) or raw address fallback
  const walletAddress = wallet?.account?.address ?? null;
  // Short display address: first 4 + last 4 chars
  const shortAddress = walletAddress
    ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
    : null;

  return {
    isConnected,
    wallet,
    walletAddress,
    shortAddress,
    connect,
    disconnect,
  };
};
