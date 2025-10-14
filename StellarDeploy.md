Elbette! Aşağıda verdiğin içeriği sade, okunabilir ve yapılandırılmış bir şekilde **Markdown formatına** dönüştürdüm:

---

# 2. Deploy to Testnet

## Setup Özeti

Şimdiye kadar şunları yaptık:

* Rust akıllı kontratlar yazmak için yerel ortamımızı kurduk
* `stellar-cli` aracını yükledik
* `stellar-cli`'yi RPC üzerinden Stellar Testnet ile iletişim kuracak şekilde yapılandırdık
* İşlemleri imzalamak için bir kimlik yapılandırdık

## Hello World

* `hello-world` adında bir proje oluşturduk
* Kontratı test etmeyi ve derlemeyi öğrendik

Artık bu kontratı **Testnet**'e deploy edip onunla etkileşime geçmeye hazırız.

---

## 🚀 Deploy

HelloWorld kontratını deploy etmek için şu komutu çalıştır:

### macOS / Linux

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm \
  --source alice \
  --network testnet \
  --alias hello_world
```

### Windows (PowerShell)

```powershell
stellar contract deploy `
  --wasm target/wasm32-unknown-unknown/release/hello_world.wasm `
  --source alice `
  --network testnet `
  --alias hello_world
```

Bu komut size bir **contract id** döndürecektir. Bu id genellikle `C` harfi ile başlar.

> Örnek contract id:
> `CACDYF3CYMJEJTIVFESQYZTN67GO2R5D5IUABTCUG3HXQSRXCSOROBAN`
> (Kendi contract id'niz ile değiştirin.)

### 📝 Not

* `--alias` bayrağı, `.stellar/contract-ids/hello_world.json` dosyasını oluşturur.
* Böylece kontratı, id yerine `hello_world` takma adıyla referans verebilirsiniz.

---

