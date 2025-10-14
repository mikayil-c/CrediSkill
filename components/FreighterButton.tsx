import React from 'react';
import { useRouter } from 'next/router';

declare global {
  interface Window {
    freighterApi?: any;
  }
}

export const FreighterButton: React.FC = () => {
  const router = useRouter();

  const connect = async () => {
    try {
      if (!window.freighterApi) {
        alert('Freighter not found');
        return;
      }
      const res = await window.freighterApi.requestAccess();
      if (res && res.address) {
        localStorage.setItem('publicKey', res.address);
        router.push('/main');
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <button onClick={connect} className="px-4 py-2 bg-blue-600 text-white rounded">
      Connect Freighter
    </button>
  );
};
