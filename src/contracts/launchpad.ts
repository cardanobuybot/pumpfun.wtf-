import { Address, beginCell, toNano, fromNano } from '@ton/core';
import type { TupleItem } from '@ton/core';
import { getClient } from './client';
import { FACTORY_ADDRESS, OP, TOKEN_DECIMALS, NETWORK } from './config';
import { buildTokenContent, parseTokenContent } from './metadata';
import type { TokenMetadata } from './metadata';
import { ipfsToHttp } from './ipfs';
import { fetchCreatedAt, fetchLastActivity } from './tonapi';

const FACTORY = Address.parse(FACTORY_ADDRESS);
const UNIT = 10 ** TOKEN_DECIMALS;

export type OnchainToken = {
    id: number;
    address: string;
    name: string;
    symbol: string;
    description: string;
    image: string;
    realTon: number;
    tokenReserve: number;
    totalSupply: number;
    priceTon: number;
    marketCapTon: number;
    progress: number; // % toward graduation
    graduated: boolean;
    createdAt: number; // unix seconds the curve was deployed (0 if unknown)
    lastActivity: number; // unix seconds of last on-chain activity (0 if unknown)
    txCount: number; // number of recent on-chain trades (capped, 0 if unknown)
};

async function runGet(address: Address, method: string, args: TupleItem[] = []) {
    const client = await getClient();
    return client.runMethod(address, method, args);
}

export async function fetchFactoryData() {
    const res = await runGet(FACTORY, 'get_factory_data');
    return {
        tokenCount: Number(res.stack.readBigNumber()),
        admin: res.stack.readAddress(),
        platform: res.stack.readAddress(),
        creationFee: res.stack.readBigNumber(),
    };
}

export async function fetchTokenAddrById(id: number): Promise<Address> {
    const res = await runGet(FACTORY, 'get_token_addr', [{ type: 'int', value: BigInt(id) }]);
    return res.stack.readAddress();
}

export async function fetchTokenInfo(id: number, address: Address): Promise<OnchainToken> {
    const curve = await runGet(address, 'get_curve_data');
    curve.stack.readBigNumber(); // id
    const tonReserve = curve.stack.readBigNumber();
    const virtualTon = curve.stack.readBigNumber();
    const tokenReserve = curve.stack.readBigNumber();
    const totalSupply = curve.stack.readBigNumber();
    const graduated = curve.stack.readBigNumber() !== 0n;
    const graduationTon = curve.stack.readBigNumber();

    const jetton = await runGet(address, 'get_jetton_data');
    jetton.stack.readBigNumber(); // total_supply
    jetton.stack.readBoolean(); // mintable
    jetton.stack.readAddress(); // admin
    const content = jetton.stack.readCell();
    const meta = parseTokenContent(content);

    const realTon = Number(fromNano(tonReserve - virtualTon));
    const priceTon = Number(tonReserve) / Number(tokenReserve); // TON per whole token
    const totalSupplyWhole = Number(totalSupply) / UNIT;
    const marketCapTon = priceTon * totalSupplyWhole;
    const progress = graduationTon > 0n ? (realTon / Number(fromNano(graduationTon))) * 100 : 0;

    // Real age / last-activity come from the tonapi index; best-effort so a
    // failure here never blocks rendering the token.
    const addrStr = address.toString({ testOnly: true, bounceable: true });
    const [createdAt, lastActivity, txCount] = await Promise.all([
        fetchCreatedAt(addrStr).catch(() => 0),
        fetchLastActivity(addrStr).catch(() => 0),
        fetchTrades(addrStr, 50).then((t) => t.length).catch(() => 0),
    ]);

    return {
        id,
        address: addrStr,
        name: meta.name || 'Unknown',
        symbol: meta.symbol || '???',
        description: meta.description || '',
        image: meta.image ? ipfsToHttp(meta.image) : '',
        realTon,
        tokenReserve: Number(tokenReserve) / UNIT,
        totalSupply: totalSupplyWhole,
        priceTon,
        marketCapTon,
        progress: Math.min(progress, 100),
        graduated,
        createdAt,
        lastActivity,
        txCount,
    };
}

export async function listTokens(limit = 40): Promise<OnchainToken[]> {
    const { tokenCount } = await fetchFactoryData();
    const start = Math.max(0, tokenCount - limit);
    const ids: number[] = [];
    for (let i = tokenCount - 1; i >= start; i--) ids.push(i);

    // Load tokens with bounded concurrency: fast for long lists, but capped so we
    // don't burst the RPC / tonapi. Cached fields (see tonapi.ts) keep repeat
    // loads cheap. Preserve newest-first ordering by id.
    const CONCURRENCY = 4;
    const results = new Map<number, OnchainToken>();
    let cursor = 0;
    const worker = async () => {
        while (cursor < ids.length) {
            const id = ids[cursor++];
            try {
                const addr = await fetchTokenAddrById(id);
                results.set(id, await fetchTokenInfo(id, addr));
            } catch (e) {
                console.warn('failed to load token', id, e);
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

    return ids.map((id) => results.get(id)).filter((t): t is OnchainToken => !!t);
}

export async function fetchTokenByAddress(address: string): Promise<OnchainToken> {
    return fetchTokenInfo(-1, Address.parse(address));
}

export async function fetchBuyEstimate(address: string, tonIn: string): Promise<number> {
    const res = await runGet(Address.parse(address), 'get_buy_estimate', [
        { type: 'int', value: toNano(tonIn || '0') },
    ]);
    return Number(res.stack.readBigNumber()) / UNIT;
}

export async function fetchSellEstimate(address: string, tokenIn: number): Promise<number> {
    const value = BigInt(Math.floor(tokenIn * UNIT));
    const res = await runGet(Address.parse(address), 'get_sell_estimate', [
        { type: 'int', value },
    ]);
    return Number(fromNano(res.stack.readBigNumber()));
}

// Whether the jetton can still be minted. For a bonding-curve token this stays
// true (the curve mints on each buy) until graduation; mintable AFTER graduation
// means the admin can dilute supply — a rug signal. Used by the rug check.
export async function fetchMintable(address: string): Promise<boolean> {
    const res = await runGet(Address.parse(address), 'get_jetton_data');
    res.stack.readBigNumber(); // total_supply
    return res.stack.readBoolean(); // mintable
}

// Creator ("dev") wallet of a token, as stored on the curve contract.
// Returned in the same string form used for Trade.trader so the two compare equal.
export async function fetchCreatorAddress(address: string): Promise<string> {
    const res = await runGet(Address.parse(address), 'get_curve_addresses');
    res.stack.readAddress(); // factory
    const creator = res.stack.readAddress(); // creator
    return creator.toString({ testOnly: true });
}

// ===== Trade history (parsed from the curve's on-chain transactions) =====

const OP_INTERNAL_TRANSFER = 0x178d4519;
const OP_BURN_NOTIFICATION = 0x7bdd97de;

export type Trade = {
    type: 'buy' | 'sell';
    trader: string; // address of the buyer/seller
    tonAmount: number; // TON spent (buy) or received net (sell)
    tokenAmount: number; // tokens received (buy) or sold (sell)
    price: number; // executed TON per whole token
    time: number; // unix seconds
    hash: string;
};

export async function fetchTrades(address: string, limit = 30): Promise<Trade[]> {
    const client = await getClient();
    const addr = Address.parse(address);
    const txs = await client.getTransactions(addr, { limit });
    const trades: Trade[] = [];

    for (const tx of txs) {
        const inMsg = tx.inMessage;
        if (!inMsg || inMsg.info.type !== 'internal') continue;
        const body = inMsg.body.beginParse();
        if (body.remainingBits < 32) continue;
        const op = body.loadUint(32);
        const time = tx.now;
        const hash = tx.hash().toString('hex');

        if (op === OP.buy) {
            // tokens minted live in the outgoing internal_transfer message
            let tokenAmount = 0;
            for (const [, out] of tx.outMessages) {
                if (out.info.type !== 'internal') continue;
                const ob = out.body.beginParse();
                if (ob.remainingBits < 32) continue;
                if (ob.loadUint(32) !== OP_INTERNAL_TRANSFER) continue;
                ob.loadUint(64); // query_id
                tokenAmount = Number(ob.loadCoins()) / UNIT;
                break;
            }
            const tonAmount = Number(fromNano(inMsg.info.value.coins));
            trades.push({
                type: 'buy',
                trader: inMsg.info.src?.toString({ testOnly: true }) ?? '',
                tonAmount,
                tokenAmount,
                price: tokenAmount > 0 ? tonAmount / tokenAmount : 0,
                time,
                hash,
            });
        } else if (op === OP_BURN_NOTIFICATION) {
            body.loadUint(64); // query_id
            const tokenAmount = Number(body.loadCoins()) / UNIT;
            const fromAddr = body.loadAddress();
            // net TON paid back is the outgoing message to the seller. If the
            // platform fee also routes to this address (e.g. self-trade), the net
            // payout is the larger of the two — take the max to stay correct.
            let tonAmount = 0;
            for (const [, out] of tx.outMessages) {
                if (out.info.type !== 'internal' || !out.info.dest) continue;
                if (out.info.dest.equals(fromAddr)) {
                    tonAmount = Math.max(tonAmount, Number(fromNano(out.info.value.coins)));
                }
            }
            trades.push({
                type: 'sell',
                trader: fromAddr.toString({ testOnly: true }),
                tonAmount,
                tokenAmount,
                price: tokenAmount > 0 ? tonAmount / tokenAmount : 0,
                time,
                hash,
            });
        }
    }
    return trades;
}

// ===== On-chain chat (text comments sent to the curve address) =====

export type ChatMessage = {
    from: string; // sender address
    text: string;
    time: number; // unix seconds
    hash: string;
};

// Reads text comments people sent to the token address. A standard TON comment
// is an internal message whose body is op=0 (32 zero bits) followed by the UTF-8
// text. The curve bounces these, but the inbound tx (with the comment) stays
// on-chain, so we surface them as a holder chat.
export async function fetchChatMessages(address: string, limit = 50): Promise<ChatMessage[]> {
    const client = await getClient();
    const addr = Address.parse(address);
    const txs = await client.getTransactions(addr, { limit });
    const msgs: ChatMessage[] = [];

    for (const tx of txs) {
        const inMsg = tx.inMessage;
        if (!inMsg || inMsg.info.type !== 'internal' || inMsg.info.bounced) continue;
        try {
            const body = inMsg.body.beginParse();
            if (body.remainingBits < 32) continue;
            if (body.loadUint(32) !== 0) continue; // not a text comment
            const text = body.loadStringTail().trim();
            if (!text) continue;
            msgs.push({
                from: inMsg.info.src?.toString({ testOnly: NETWORK === 'testnet' }) ?? '',
                text,
                time: tx.now,
                hash: tx.hash().toString('hex'),
            });
        } catch {
            // not a well-formed comment — skip
        }
    }
    return msgs;
}

// op=0 + UTF-8 text — the standard TON "comment" body.
export function buildCommentPayload(text: string): string {
    const body = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
    return body.toBoc().toString('base64');
}

export async function fetchUserTokenBalance(tokenAddress: string, owner: Address): Promise<number> {
    const token = Address.parse(tokenAddress);
    const waRes = await runGet(token, 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ]);
    const walletAddr = waRes.stack.readAddress();
    const client = await getClient();
    const state = await client.getContractState(walletAddr);
    if (state.state !== 'active') return 0;
    const balRes = await runGet(walletAddr, 'get_wallet_data');
    return Number(balRes.stack.readBigNumber()) / UNIT;
}

export async function getUserWalletAddress(tokenAddress: string, owner: Address): Promise<Address> {
    const res = await runGet(Address.parse(tokenAddress), 'get_wallet_address', [
        { type: 'slice', cell: beginCell().storeAddress(owner).endCell() },
    ]);
    return res.stack.readAddress();
}

// ===== Message builders (return base64 BOC payloads for TON Connect) =====

export function buildCreateTokenPayload(meta: TokenMetadata): string {
    const body = beginCell()
        .storeUint(OP.createToken, 32)
        .storeUint(0n, 64)
        .storeRef(buildTokenContent(meta))
        .endCell();
    return body.toBoc().toString('base64');
}

export function buildBuyPayload(): string {
    const body = beginCell().storeUint(OP.buy, 32).storeUint(0n, 64).endCell();
    return body.toBoc().toString('base64');
}

export function buildBurnPayload(tokenAmount: number, responseAddress: Address): string {
    const amount = BigInt(Math.floor(tokenAmount * UNIT));
    const body = beginCell()
        .storeUint(OP.burn, 32)
        .storeUint(0n, 64)
        .storeCoins(amount)
        .storeAddress(responseAddress)
        .endCell();
    return body.toBoc().toString('base64');
}

// predicted address for a token the connected user is about to create
export async function predictTokenAddress(creator: Address, meta: TokenMetadata): Promise<Address> {
    const { tokenCount } = await fetchFactoryData();
    const res = await runGet(FACTORY, 'get_token_address', [
        { type: 'int', value: BigInt(tokenCount) },
        { type: 'slice', cell: beginCell().storeAddress(creator).endCell() },
        { type: 'cell', cell: buildTokenContent(meta) },
    ]);
    return res.stack.readAddress();
}

export { FACTORY };
