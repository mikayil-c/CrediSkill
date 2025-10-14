<#
Builds and deploys the Soroban contract to Testnet using `stellar` CLI.
Requires:
- Rust toolchain + wasm32 target
- `stellar` CLI in PATH and configured (see StellarDeploy.md)

Usage (PowerShell):
  .\scripts\deploy-contract.ps1 -SourceAccount alice

This script will:
- build the wasm
- deploy with `stellar contract deploy --alias crediskill`
- parse the contract id from the CLI output
- write `contract/contract-id.txt` and `.env.local` with NEXT_PUBLIC_CONTRACT_ID
#>

param(
  [string]$SourceAccount = "alice"
)

Write-Host "Building contract wasm..."
Push-Location "contract"
cargo build --release --target wasm32-unknown-unknown
if ($LASTEXITCODE -ne 0) {
  Write-Error "cargo build failed"
  Pop-Location
  exit 1
}

$wasmPath = Get-ChildItem -Path target\wasm32-unknown-unknown\release -Filter *.wasm | Select-Object -Last 1
if (-not $wasmPath) {
  Write-Error "WASM not found in target folder"
  Pop-Location
  exit 1
}

Write-Host "Deploying wasm: $($wasmPath.FullName)"

# Deploy using stellar CLI. This will print the contract id to stdout.
$deployCmd = "stellar contract deploy --wasm `"$($wasmPath.FullName)`" --source $SourceAccount --network testnet --alias crediskill"
Write-Host "Running: $deployCmd"

$out = & cmd /c $deployCmd 2>&1
Write-Host $out

Pop-Location

# Try to parse a contract id (contract ids usually start with 'C')
$regex = [regex]"(C[A-Z0-9]{10,})"
$m = $regex.Match($out)
if ($m.Success) {
  $contractId = $m.Groups[1].Value
  Write-Host "Contract id: $contractId"
  $contractFile = Join-Path -Path (Get-Location).ProviderPath -ChildPath "contract\contract-id.txt"
  Set-Content -Path $contractFile -Value $contractId -Encoding UTF8

  # Write .env.local at repo root for Next.js to pick up
  $envFile = Join-Path -Path (Get-Location).ProviderPath -ChildPath ".env.local"
  Set-Content -Path $envFile -Value "NEXT_PUBLIC_CONTRACT_ID=$contractId" -Encoding UTF8

  Write-Host "Wrote contract id to contract/contract-id.txt and .env.local"
} else {
  Write-Warning "Could not parse contract id from output. Please check the CLI output above and add the id manually to contract/contract-id.txt and .env.local"
}
