'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import { DAO_ABI, FORWARDER_ABI } from '@/lib/abi';

interface Web3ContextType {
  account: string | null;
  provider: BrowserProvider | null;
  signer: ethers.Signer | null;
  daoContract: ethers.Contract | null;
  forwarderContract: ethers.Contract | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
}

const Web3Context = createContext<Web3ContextType>({
  account: null,
  provider: null,
  signer: null,
  daoContract: null,
  forwarderContract: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  isConnected: false,
});

export const useWeb3 = () => useContext(Web3Context);

export const Web3Provider = ({ children }: { children: ReactNode }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [daoContract, setDaoContract] = useState<ethers.Contract | null>(null);
  const [forwarderContract, setForwarderContract] = useState<ethers.Contract | null>(null);

  const DAO_ADDRESS = process.env.NEXT_PUBLIC_DAO_ADDRESS || '';
  const FORWARDER_ADDRESS = process.env.NEXT_PUBLIC_FORWARDER_ADDRESS || '';

  const connectWallet = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Obtener las cuentas
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        
        const web3Provider = new BrowserProvider(window.ethereum);
        const web3Signer = await web3Provider.getSigner();

        const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, web3Signer);
        const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, web3Signer);

        setAccount(accounts[0]);
        setProvider(web3Provider);
        setSigner(web3Signer);
        setDaoContract(dao);
        setForwarderContract(forwarder);
        
        // Guardar que el usuario se conectó
        localStorage.setItem('walletConnected', 'true');
      } catch (error: any) {
        console.error('Error connecting wallet:', error);
        alert('Failed to connect wallet: ' + (error.message || 'Unknown error'));
      }
    } else {
      alert('Please install MetaMask!');
    }
  }, [DAO_ADDRESS, FORWARDER_ADDRESS]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setDaoContract(null);
    setForwarderContract(null);
    
    // Guardar que el usuario se desconectó
    localStorage.removeItem('walletConnected');
  }, []);

  useEffect(() => {
    // Auto-connect if previously connected
    const checkConnection = async () => {
      if (typeof window.ethereum !== 'undefined') {
        try {
          // Solo reconectar si el usuario había elegido conectarse
          const wasConnected = localStorage.getItem('walletConnected');
          
          if (!wasConnected) {
            return; // No auto-conectar si el usuario se desconectó
          }
          
          const accounts = await window.ethereum.request({
            method: 'eth_accounts',
          });
          
          if (accounts.length > 0) {
            // User is already connected, reconnect silently
            const web3Provider = new BrowserProvider(window.ethereum);
            const web3Signer = await web3Provider.getSigner();

            const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, web3Signer);
            const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, web3Signer);

            setAccount(accounts[0]);
            setProvider(web3Provider);
            setSigner(web3Signer);
            setDaoContract(dao);
            setForwarderContract(forwarder);
          }
        } catch (error) {
          console.error('Auto-reconnect failed:', error);
        }
      }
    };

    checkConnection();
  }, [DAO_ADDRESS, FORWARDER_ADDRESS]);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log('Account changed detected:', accounts);
        if (accounts.length > 0) {
          // Forzar actualización con la nueva cuenta
          try {
            const web3Provider = new BrowserProvider(window.ethereum);
            const web3Signer = await web3Provider.getSigner();
            
            const dao = new ethers.Contract(DAO_ADDRESS, DAO_ABI, web3Signer);
            const forwarder = new ethers.Contract(FORWARDER_ADDRESS, FORWARDER_ABI, web3Signer);
            
            setAccount(accounts[0]);
            setProvider(web3Provider);
            setSigner(web3Signer);
            setDaoContract(dao);
            setForwarderContract(forwarder);
          } catch (error) {
            console.error('Error updating account:', error);
          }
        } else {
          disconnectWallet();
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [DAO_ADDRESS, FORWARDER_ADDRESS]);

  return (
    <Web3Context.Provider
      value={{
        account,
        provider,
        signer,
        daoContract,
        forwarderContract,
        connectWallet,
        disconnectWallet,
        isConnected: !!account,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
};
