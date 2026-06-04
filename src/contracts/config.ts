// On-chain launchpad configuration (TON testnet).

export const NETWORK: 'testnet' | 'mainnet' = 'testnet';

// Deployed PumpFun factory (testnet). See pumpfun-contracts/deployments.json.
export const FACTORY_ADDRESS = 'EQCRReBNDwtm5brc8L4nrfQhbG424unz7vaBu2MEh7uEZsBs';

export const TOKEN_DECIMALS = 9;

// Contract op codes (must match the FunC contracts).
export const OP = {
    createToken: 0x6372746b,
    buy: 0x6275795f,
    burn: 0x595f07bc,
};

// Gas overhead the bonding curve subtracts from a buy (mint 0.06 + tx 0.03 TON).
// The user must send (spend + this) so `spend` reaches the curve.
export const BUY_GAS_OVERHEAD = 0.09;

// Value to attach when creating a token: creationFee (0.1) + curve deploy seed (0.1) + gas.
export const CREATE_TOKEN_VALUE = '0.35';

// Value to attach to a burn (sell) so the wallet->curve->payout chain has gas.
export const SELL_GAS = '0.2';

// TON attached to a chat message sent to the token (curve) address. The curve
// rejects the unknown op (0 = text comment) and bounces it back, so the sender
// only pays gas (~a cent) while the comment is permanently recorded on-chain.
export const CHAT_MSG_VALUE = '0.01';

export const tonscanBase =
    NETWORK === 'testnet' ? 'https://testnet.tonscan.org' : 'https://tonscan.org';
