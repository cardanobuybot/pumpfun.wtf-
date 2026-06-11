// Read-only client for the public tonscanner.io vesting index.
//
// The endpoint is a plain GET with `access-control-allow-origin: *` and no
// auth, so we fetch it straight from the browser — NO credentials and NO custom
// headers (adding either trips CORS, since allow-credentials is intentionally
// off and only Content-Type is allowed). Write/admin ops on tonscanner are
// same-origin only and never called from here; creating a lock happens on-chain.

import { Address } from '@ton/core';
import { TONSCANNER_API } from './config';

// Raw lock object exactly as returned by ?type=vesting_list. Amounts are jetton
// base units (string), timestamps are unix-seconds strings.
export type VestingLock = {
    vault_address: string;
    lock_id: string;
    factory: string;
    network: string;
    owner: string;
    beneficiary: string;
    jetton_master: string;
    jetton_wallet: string;
    total_amount: string;
    deposited: string;
    claimed: string;
    start_ts: string;
    cliff_ts: string;
    end_ts: string;
    revocable: boolean;
    revoked: boolean;
    initialized: boolean;
};

type VestingListResponse = {
    network: string;
    locker: string;
    count: number;
    locks: VestingLock[];
};

// Compare two TON addresses by their canonical raw form (workchain:hash),
// ignoring bounceable/testnet flags so a testnet token address still matches a
// mainnet-indexed entry with the same underlying hash.
function sameAddress(a: string, b: string): boolean {
    try {
        return Address.parse(a).toRawString() === Address.parse(b).toRawString();
    } catch {
        return a === b;
    }
}

// Fetch the active locks for a single jetton. Always scoped by `jetton` so only
// this token's locks surface (never other tokens' spoofed locks). Returns [] on
// any network/parse error so the token page never breaks.
export async function fetchVestingLocks(jetton: string): Promise<VestingLock[]> {
    try {
        const url = `${TONSCANNER_API}?type=vesting_list&jetton=${encodeURIComponent(jetton)}`;
        const res = await fetch(url, { credentials: 'omit' });
        if (!res.ok) return [];
        const data = (await res.json()) as VestingListResponse;
        const locks = Array.isArray(data?.locks) ? data.locks : [];
        // Defence-in-depth: keep only locks whose jetton actually matches, and
        // drop revoked ones (no longer enforced).
        return locks.filter((l) => !l.revoked && sameAddress(l.jetton_master, jetton));
    } catch {
        return [];
    }
}
