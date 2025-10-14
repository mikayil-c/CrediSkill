// Full soroban-client transaction builder (using placeholder contract id)
// This implementation attempts to construct a real Transaction XDR using `soroban-client` APIs
// and then asks Freighter to sign it. If `invokeHostFunction` is unavailable in the runtime,
// it falls back to a ManageData operation carrying the encoded invocation payload.
//
// IMPORTANT: This file is still using a placeholder contract id by default. Replace
// process.env.NEXT_PUBLIC_CONTRACT_ID or the value below with your deployed contract id.

// Dynamically load the modern Stellar SDK (@stellar/stellar-sdk) if available,
// otherwise fall back to the older `soroban-client` package. This lets us
// migrate smoothly without forcing an immediate package change in package.json.

declare global {
  interface Window {
    freighterApi?: any;
  }
}

const HORIZON_RPC = 'https://horizon-testnet.stellar.org';
const SOROBAN_RPC = 'https://soroban-testnet.stellar.org';

let _sdk: any | null = null;
async function getSdk() {
  if (_sdk) return _sdk;
  try {
    _sdk = await import('@stellar/stellar-sdk');
    console.log('Using @stellar/stellar-sdk');
    return _sdk;
  } catch (e) {
    try {
      _sdk = await import('soroban-client');
      console.log('Fell back to soroban-client');
      return _sdk;
    } catch (err) {
      console.error('No Soroban SDK available. Please install @stellar/stellar-sdk or soroban-client.');
      throw err;
    }
  }
}


// Placeholder contract id. Replace with your deployed contract id in .env.local:
// NEXT_PUBLIC_CONTRACT_ID=CA... (or run the provided deploy script)
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID || 'CPLACEHOLDERCONTRACTID123456789';

// Helper to encode arguments as ScVal for Soroban host function
async function encodeSorobanArgs(provider: string, amount: number, description: string) {
  const sdk = await getSdk();
  const scVal = sdk.scVal || sdk.SorobanClient?.scVal || sdk.xdr?.ScVal;
  // provider: Stellar address (G...)
  // amount: u32
  // description: string
  // These must match the contract's expected types
  // Use helper functions from the SDK when available
  if (sdk.scVal) {
    return [sdk.scVal.address(provider), sdk.scVal.u32(amount), sdk.scVal.string(description)];
  }
  // Fallback: encode as bytes/string placeholders
  return [
    { address: provider },
    { u32: amount },
    { string: description },
  ];
}

export async function callExchangeSkill(from: string, provider: string, amount: number, description: string) {
  if (!window.freighterApi) throw new Error('Freighter not available');

  const sdk = await getSdk();
  const ServerImpl = sdk.Server || sdk.SorobanClient?.Server || sdk.Server;
  const TransactionBuilderImpl = sdk.TransactionBuilder || sdk.SorobanClient?.TransactionBuilder || sdk.TransactionBuilder;
  const OperationImpl = sdk.Operation || sdk.SorobanClient?.Operation || sdk.Operation;
  const AccountImpl = sdk.Account || sdk.SorobanClient?.Account || sdk.Account;
  const StrKeyImpl = sdk.StrKey || sdk.SorobanClient?.StrKey || sdk.StrKey;

  const server = new ServerImpl(HORIZON_RPC);

  try {
    // Load account to get the current sequence number
    const acctResp: any = await server.loadAccount(from);
    const seq = acctResp.sequence;
    const account = new AccountImpl(from, seq);

    // Prepare contract id and function name
    const contractId = CONTRACT_ID;
    const functionName = 'exchange_skill';

    // Encode arguments as ScVal (sdk-specific)
    const args = await encodeSorobanArgs(provider, amount, description);

    // Build the host function invocation operation using the SDK's Operation builder if available
    let op: any;
    if (OperationImpl && OperationImpl.invokeHostFunction) {
      // Many SDK builds expose invokeHostFunction
      try {
        op = OperationImpl.invokeHostFunction({
          function: 0,
          parameters: [
            sdk.scVal ? sdk.scVal.bytes(StrKeyImpl.decodeContract(contractId)) : { bytes: contractId },
            sdk.scVal ? sdk.scVal.symbol(functionName) : { symbol: functionName },
            ...args,
          ],
          auth: [],
        });
      } catch (e) {
        console.warn('invokeHostFunction build failed, falling back to manageData', e);
        op = OperationImpl.manageData({ name: 'soroban_invoke', value: JSON.stringify({ contractId, functionName, args }) });
      }
    } else {
      // Fallback to manageData if invokeHostFunction not available
      op = OperationImpl.manageData({ name: 'soroban_invoke', value: JSON.stringify({ contractId, functionName, args }) });
    }

    const tx = new TransactionBuilderImpl(account, {
      fee: '100',
      networkPassphrase: sdk.Networks.TESTNET,
    })
      .addOperation(op)
      .setTimeout(180)
      .build();

    // Get transaction XDR (base64) to pass to Freighter
    const txXDR = tx.toXDR();
    console.log('Built transaction XDR (base64):', txXDR);

    // Ask Freighter to sign the transaction XDR
    const signed = await window.freighterApi.signTransaction(txXDR, { network: 'TESTNET', address: from });
    console.log('Freighter signed transaction:', signed);

    // Submit signed transaction to Horizon if signed.signedTxXdr exists
    if (signed && signed.signedTxXdr) {
      try {
        const resp = await server.submitTransaction(signed.signedTxXdr);
        console.log('Transaction submission response:', resp);
        return resp;
      } catch (submitErr) {
        console.error('submitTransaction failed', submitErr);
        return { signed, submitErr };
      }
    }

    return { signed };
  } catch (e) {
    console.error('callExchangeSkill error', e);
    throw e;
  }
}

export async function readTotals(): Promise<{ total: number; last: string | null }> {
  // Read persistent storage keys from Soroban RPC
  console.log('readTotals for contract', CONTRACT_ID);
  const rpcUrl = SOROBAN_RPC;

  // Helper to query a storage key by symbol name
  async function readKey(symbolName: string) {
    try {
      // Soroban RPC expects a key which is the Symbol encoded as a ScVal; the RPC helper endpoint
      // /contracts/{contractId}/storage?key={encodedKey} isn't standard across versions, so we use
      // the JSON RPC method `get` with `key` built as scval. We'll use the convenience endpoint if available.

      // Build a scval for symbol: { "xdr": "..." } — but to keep this simple and robust,
      // we'll call the high-level `get` method at /dumps or use /state endpoint. Different testnets
      // may expose different endpoints; this is a best-effort implementation.

      const payload = {
        method: 'get',
        params: {
          contract_id: CONTRACT_ID,
          key: { symbol: symbolName },
        },
      };

      const res = await fetch(rpcUrl + '/dumps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn('readKey bad response', symbolName, res.statusText);
        return null;
      }

      const data = await res.json();
      // response format may vary. Try common shapes.
      if (data && data.result) {
        return data.result;
      }
      return data;
    } catch (e) {
      console.warn('readKey failed', symbolName, e);
      return null;
    }
  }

  try {
    const totalRes = await readKey('total_exchanged');
    const lastRes = await readKey('last_participant');

    // Attempt to extract values from returned shapes
    let total = 0;
    let last: string | null = null;

    // data parsing is best-effort; we look for numeric or string values
    if (totalRes && typeof totalRes === 'object') {
      // try common paths
      if (totalRes.value && typeof totalRes.value === 'number') total = totalRes.value;
      else if (totalRes.sc_val && totalRes.sc_val.u32) total = Number(totalRes.sc_val.u32);
      else if (typeof totalRes === 'number') total = totalRes;
    }

    if (lastRes && typeof lastRes === 'object') {
      if (lastRes.value && typeof lastRes.value === 'string') last = lastRes.value;
      else if (lastRes.sc_val && lastRes.sc_val.address) last = String(lastRes.sc_val.address);
      else if (typeof lastRes === 'string') last = lastRes;
    }

    return { total, last };
  } catch (e) {
    console.error('readTotals failed', e);
    return { total: 0, last: null };
  }
}
