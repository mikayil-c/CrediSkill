import { useEffect, useState } from 'react';
import { callExchangeSkill, readTotals } from '../lib/stellar';

declare global {
  interface Window {
    freighterApi?: any;
  }
}

export default function Main() {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('1');
  const [total, setTotal] = useState<number | null>(null);
  const [lastParticipant, setLastParticipant] = useState<string | null>(null);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('publicKey');
    if (!saved) return;
    setAccount(saved);
    // Read totals (placeholder) and populate UI
    (async () => {
      try {
        const res = await readTotals();
        setTotal(res.total);
        setLastParticipant(res.last);
      } catch (e) {
        console.error('readTotals failed', e);
      }
    })();
  }, []);

  const disconnect = () => {
    localStorage.removeItem('publicKey');
    setAccount(null);
    window.location.href = '/';
  };

  const sendCredit = async () => {
    if (!account) return;
    try {
      if (!window.freighterApi) throw new Error('Freighter not available');

      setTxStatus('pending');
      setTxMessage('Preparing transaction...');

      const resp = await callExchangeSkill(account, provider, Number(amount), description);
      console.log('callExchangeSkill response', resp);

      // If the library submitted the tx and returned a Horizon response, try to read hash
      if (resp && resp.hash) {
        setTxStatus('success');
        setTxMessage('Transaction submitted successfully');
        setTxHash(resp.hash as string);
      } else if (resp && resp.result) {
        // some SDKs return result wrapper
        setTxStatus('success');
        setTxMessage('Transaction result received');
      } else if (resp && resp.signed) {
        // Signed but not submitted — still a success for signing step
        setTxStatus('success');
        setTxMessage('Transaction signed (not submitted) — check network submission');
      } else {
        setTxStatus('success');
        setTxMessage('Transaction processed (no hash available)');
      }

      // optimistic UI update
      setLastParticipant(provider);
      setTotal((t: number | null) => (t ?? 0) + Number(amount));

      // Refresh totals from contract (placeholder read)
      try {
        const latest = await readTotals();
        setTotal(latest.total);
        setLastParticipant(latest.last);
      } catch (e) {
        console.warn('readTotals after tx failed', e);
      }
    } catch (e: any) {
      console.error('Send failed', e);
      setTxStatus('error');
      setTxMessage(e?.message ? String(e.message) : String(e));
    }
  };

  // Check extension object
  !!window.freighterApi;
  // Check basic API (async)
  (async () => {
    console.log('isConnected:', await window.freighterApi?.isConnected());
    console.log('isAllowed:', await window.freighterApi?.isAllowed());
    // requestAccess will prompt the user (only call when user expects a prompt)
    // const access = await window.freighterApi?.requestAccess(); console.log(access);
  })();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">CrediSkill — Main</h2>
          <div>
            <div className="text-sm">{account}</div>
            <button onClick={disconnect} className="text-xs text-red-600">Disconnect</button>
          </div>
        </div>

  <label className="block mb-2">Provider address</label>
  <input value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full mb-3 p-2 border rounded" disabled={txStatus === 'pending'} />

  <label className="block mb-2">Service description</label>
  <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full mb-3 p-2 border rounded" disabled={txStatus === 'pending'} />

        <label className="block mb-2">Amount (CREDI)</label>
        <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full mb-3 p-2 border rounded" disabled={txStatus === 'pending'} />

        <button onClick={sendCredit} className="px-4 py-2 bg-green-600 text-white rounded" disabled={txStatus === 'pending'}>
          {txStatus === 'pending' ? 'Processing...' : 'Send Credit'}
        </button>

        <div className="mt-3">
          {txStatus !== 'idle' && (
            <div className={`p-3 rounded ${txStatus === 'success' ? 'bg-green-50 text-green-800' : txStatus === 'error' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'}`}>
              <div className="text-sm font-medium">{txStatus.toUpperCase()}</div>
              <div className="text-xs mt-1">{txMessage}</div>
              {txHash && <div className="text-xs mt-1">Tx Hash: {txHash}</div>}
            </div>
          )}
        </div>

        <div className="mt-4">
          <div>Total exchanged: {total ?? 0}</div>
          <div>Last participant: {lastParticipant ?? '—'}</div>
        </div>
      </div>
    </div>
  );
}
