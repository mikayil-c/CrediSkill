#![no_std]
use soroban_sdk::{contractimpl, symbol, Address, Env, Vec, Bytes, IntoVal};

pub struct Contract;

#[derive(Clone)]
pub struct ExchangeRecord {
    pub provider: Address,
    pub amount: u32,
    pub description: Bytes,
}

const TOTAL_KEY: &str = "total_exchanged";
const LAST_KEY: &str = "last_participant";

#[contractimpl]
impl Contract {
    // exchange_skill: save total (u32) and last participant
    pub fn exchange_skill(env: Env, provider: Address, amount: u32, description: Bytes) {
        let storage = env.storage().persistent();

        // update total
        let cur: u32 = storage.get(&symbol!(TOTAL_KEY)).unwrap_or(0u32);
        let new_total = cur + amount;
        storage.set(&symbol!(TOTAL_KEY), &new_total);

        // save last participant address
        storage.set(&symbol!(LAST_KEY), &provider.clone());

        // Optionally store last description (not necessary but useful)
        storage.set(&symbol!("last_desc"), &description.clone());
    }

    pub fn get_total_exchanged(env: Env) -> u32 {
        let storage = env.storage().persistent();
        storage.get(&symbol!(TOTAL_KEY)).unwrap_or(0u32)
    }

    pub fn get_last_participant(env: Env) -> Address {
        let storage = env.storage().persistent();
        storage.get(&symbol!(LAST_KEY)).unwrap_or_else(|| {
            // return a default address (zero) if not set — using Address::from_contract is not available
            // We will return the env.current_contract_address() as a placeholder
            env.current_contract_address()
        })
    }
}

mod test {
    use super::*;
    use soroban_sdk::{Env};

    #[test]
    fn test_exchange() {
        let env = Env::default();
        let contract = Contract;
        let addr = Address::from_account_id(&env, &Bytes::from_slice(&env, &vec![1u8;32]));
        Contract::exchange_skill(env.clone(), addr.clone(), 5u32, Bytes::from_slice(&env, b"desc"));
        let total = Contract::get_total_exchanged(env.clone());
        assert_eq!(total, 5u32);
        let last = Contract::get_last_participant(env.clone());
        assert_eq!(format!("{}", last), format!("{}", addr));
    }
}
