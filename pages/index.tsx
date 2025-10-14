import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useState } from 'react';

declare global {
  interface Window {
    freighterApi?: any;
  }
}

export default function Home() {
  const router = useRouter();
  const [manualKey, setManualKey] = useState('');
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('publicKey');
    if (saved) router.push('/main');
    // detect freighter availability only on client
    setHasFreighter(typeof window !== 'undefined' && !!(window as any).freighterApi);
  }, [router]);

  const connect = async () => {
    try {
      if (!window.freighterApi) {
        alert('Freighter not found. Install Freighter extension.');
        return;
      }
      const res = await window.freighterApi.requestAccess();
      if (res && res.address) {
        localStorage.setItem('publicKey', res.address);
        router.push('/main');
      }
    } catch (e) {
      console.error('Connect failed', e);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="p-6 bg-white rounded shadow">
        <h1 className="text-xl font-semibold mb-4">CrediSkill</h1>
        <button
          onClick={connect}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Connect Freighter
        </button>

        {/* Manual public key fallback for development when Freighter isn't available (client-only) */}
        {hasFreighter === false && (
          <div className="mt-4">
            <div className="text-sm mb-2">Or paste your public key (G...)</div>
            <input value={manualKey} onChange={(e) => setManualKey(e.target.value)} className="w-full mb-2 p-2 border rounded" />
            <button
              onClick={() => { localStorage.setItem('publicKey', manualKey); router.push('/main'); }}
              className="px-3 py-1 bg-gray-600 text-white rounded"
            >
              Use public key
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
