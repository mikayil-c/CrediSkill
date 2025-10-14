# CrediSkill — Minimal Skill-Exchange dApp

This workspace contains a minimal Next.js (TypeScript) + Tailwind frontend and a simple Soroban (Rust) contract for a skill-exchange demo.

What I added:
- Next.js scaffold (pages/index.tsx, pages/main.tsx)
- Freighter connect flow (uses `window.freighterApi.requestAccess()`)
- `lib/stellar.ts` helper (skeleton for soroban-client calls)
- A minimal Soroban contract under `contract/` implementing `exchange_skill`, `get_total_exchanged`, `get_last_participant` using persistent storage.

Files you asked to check:
- `pdr.md`
- `FreighterWalletDocs.md`
- `StellarDeploy.md`

Quick start (local):

# CrediSkill — Minimal Skill-Exchange dApp

This repository contains a minimal skill-exchange dApp demonstrating a Next.js (TypeScript) frontend integrated with a Soroban smart contract on Stellar Testnet. It focuses on the basic flow: wallet connect (Freighter), contract invocation (Soroban), and reading persistent contract state.

This README includes:
- Project structure
- Requirements and quick setup
- Installing dependencies and starting the frontend
- Building & deploying the Soroban contract
- Freighter usage and testing
- Where to replace placeholders and environment variables
- Troubleshooting and next steps

---

## Project structure

- `pages/` — Next.js pages
	- `index.tsx` — Connect page (Freighter connect + manual public-key fallback)
	- `main.tsx` — Main UI: provider address, description, amount, Send Credit button, transaction status and totals
- `components/` — small reusable components
	- `FreighterButton.tsx` — Freighter connect button
- `lib/stellar.ts` — Soroban integration helpers (transaction builder + storage read). Dynamically loads `@stellar/stellar-sdk` if available, otherwise falls back to `soroban-client`.
- `contract/` — Rust Soroban contract (source + Cargo)
- `scripts/deploy-contract.ps1` — PowerShell helper to build & deploy the contract (Windows)
- `styles/` — Tailwind global CSS
- `package.json` — project scripts and dependencies

---

## Requirements

- Node.js (v18+) and npm
- Rust toolchain for contract compilation (`rustup`, `cargo`) and the `wasm32-unknown-unknown` target
- `stellar` CLI (for the deploy helper) and Soroban tooling if you use the included PowerShell script
- Brave/Chrome with Freighter Wallet extension for signing transactions

On Windows, download Node.js from https://nodejs.org and restart your terminal after installation.

---

## Install dependencies

From the project root run:

```powershell
npm install
```

If a dependency's postinstall requires `yarn`, install yarn globally:

```powershell
npm install -g yarn
```

Optionally install the modern Stellar SDK (recommended):

```powershell
npm install @stellar/stellar-sdk
```

The code will dynamically prefer `@stellar/stellar-sdk` if present, otherwise it will use the installed `soroban-client` fallback.

---

## Run the frontend

```powershell
npm run dev
```

Open http://localhost:3000 in your browser.

Notes:
- If Freighter is not available, the index page shows a manual public key input that saves a key to `localStorage` so you can continue testing the UI without the extension.
- `main.tsx` provides transaction UI with pending / success / error feedback and optimistic updates.

---

## Soroban contract (Rust)

The minimal contract in `contract/src/lib.rs` implements:

- `exchange_skill(address, amount, description)` — saves `total_exchanged` and `last_participant` to persistent storage
- `get_total_exchanged()` → u32
- `get_last_participant()` → Address

Build the contract wasm (ensure the wasm target is installed):

```powershell
cd contract
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
```

WASM output will be in `contract/target/wasm32-unknown-unknown/release/`.

---

## Deploying the contract (helper)

Use the included PowerShell helper to build + deploy using the `stellar` CLI. It attempts to parse the returned contract id and writes it to `contract/contract-id.txt` and `.env.local`:

```powershell
./scripts/deploy-contract.ps1 -SourceAccount alice
```

After the script runs, it writes `NEXT_PUBLIC_CONTRACT_ID` to `.env.local` for the frontend to pick up. Restart the dev server after changing `.env.local`.

---

## Frontend ↔ Contract Integration

Key functions in `lib/stellar.ts`:

- `callExchangeSkill(from, provider, amount, description)` — builds a host-function transaction (uses the modern SDK if available), gets the tx XDR, asks Freighter to sign, and submits the signed XDR to Horizon when possible.
- `readTotals()` — best-effort read of persistent storage keys `total_exchanged` and `last_participant` from the Soroban RPC. The RPC response format may differ by provider; see Troubleshooting for adjustments.

Placeholders to replace after deployment:

1. Set the contract id in `.env.local` at repo root:

```
NEXT_PUBLIC_CONTRACT_ID=C...YOUR_CONTRACT_ID
```

2. Confirm `SOROBAN_RPC` in `lib/stellar.ts` matches your RPC provider (defaults to `https://soroban-testnet.stellar.org`).

3. Restart the dev server so Next picks up `.env.local`.

---

## Freighter Wallet usage

1. Install the Freighter extension in Brave/Chrome and create/import a key.
2. Switch Freighter to Testnet (if required by your setup) and copy the public key (G...).
3. Fund the test account (optional for signing-only flows) using Friendbot:

```
https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY
```

4. On the dApp, click Connect Freighter and accept the permission prompt. The app will store the public key in `localStorage` and redirect to `/main`.

If Freighter is not detected, the index page now shows a manual public-key input so you can continue testing.

---

## Troubleshooting

- "Freighter not found":
	- Ensure Freighter extension is enabled and site access is allowed (not "On click").
	- Disable Brave Shields for the site or allow scripts.
	- Run these checks in the console:
		```js
		!!window.freighterApi
		await window.freighterApi.isConnected()
		await window.freighterApi.isAllowed()
		```

- "window is not defined" (SSR): The app avoids accessing `window` during SSR and checks availability client-side. Make sure you're using the latest code.

- Soroban RPC parsing: If `readTotals()` returns default values, inspect the RPC response in Network devtools and paste it here; I will adapt the parser.

- npm install errors: If a package's postinstall expects `yarn`, run `npm i -g yarn` and retry `npm install`.

---

## Next improvements (recommended)

- Migrate fully to `@stellar/stellar-sdk` and remove the fallback for clearer APIs.
- Harden `readTotals()` to the exact RPC provider response format.
- Add transaction history UI and more robust error parsing of Horizon responses.
- Add automated tests for the contract and a small integration test that mocks RPC responses.

---

If you want I can:
- adapt `readTotals()` to your RPC provider if you paste a sample response,
- finish migrating to `@stellar/stellar-sdk` with precise ScVal encodings, or
- add CI scripts for contract build + deploy.

Tell me which direction you want and I'll continue.
