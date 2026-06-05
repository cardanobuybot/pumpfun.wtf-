// tonapi.io client — indexed on-chain data the lite RPC can't give us
// (full jetton holder lists, etc.).
//
// Requests go through our own nginx reverse proxy at /api/tonapi/, which injects
// the API key server-side. The key therefore never ships in the browser bundle,
// and the upstream host (testnet/mainnet tonapi) is chosen in the nginx config.
const TONAPI_BASE = '/api/tonapi';
const UNIT = 1_000_000_000; // 9 decimals

export type Holder = {
  owner: string; // owner wallet address (raw form)
  amount: number; // balance in whole tokens
  name?: string; // known label (e.g. "STON.fi DEX") if tonapi recognises it
  isScam?: boolean;
};

// Top holders of a jetton (the token / bonding-curve address is the master).
export async function fetchHolders(jettonMaster: string, limit = 100): Promise<Holder[]> {
  const url = `${TONAPI_BASE}/v2/jettons/${encodeURIComponent(jettonMaster)}/holders?limit=${limit}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`tonapi holders ${res.status}`);
  const data = await res.json();
  const rows: Array<{
    owner?: { address?: string; name?: string; is_scam?: boolean };
    address?: string;
    balance?: string;
  }> = data.addresses ?? [];
  return rows
    .map((r) => ({
      owner: r.owner?.address ?? r.address ?? '',
      amount: Number(r.balance ?? 0) / UNIT,
      name: r.owner?.name,
      isScam: r.owner?.is_scam,
    }))
    .filter((h) => h.owner && h.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

// ===== caching =====
// With many tokens, fetching age/activity per token on every load would hammer
// tonapi. createdAt is immutable (a contract's deploy time never changes), so we
// cache it forever in localStorage. lastActivity changes as people trade, so it
// gets a short in-memory TTL — long enough to dedupe a manual refresh, short
// enough to keep "Last Bump" sorting fresh.

const ACTIVITY_TTL_MS = 60_000;
const activityCache = new Map<string, { value: number; at: number }>();

function readCreatedCache(account: string): number {
  try {
    return Number(localStorage.getItem(`pf:createdAt:${account}`) ?? 0);
  } catch {
    return 0;
  }
}

function writeCreatedCache(account: string, t: number): void {
  if (t <= 0) return; // never cache a failed/unknown lookup
  try {
    localStorage.setItem(`pf:createdAt:${account}`, String(t));
  } catch {
    /* storage disabled or full — fine, we just refetch next time */
  }
}

// Unix time (seconds) the account was deployed — the utime of its oldest
// transaction. Used to show a token's real age. Returns 0 when unavailable.
// Immutable, so it's cached permanently in localStorage.
export async function fetchCreatedAt(account: string): Promise<number> {
  const cached = readCreatedCache(account);
  if (cached > 0) return cached;
  const url = `${TONAPI_BASE}/v2/blockchain/accounts/${encodeURIComponent(
    account,
  )}/transactions?limit=1&sort_order=asc`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`tonapi tx ${res.status}`);
  const data = await res.json();
  const t = Number(data.transactions?.[0]?.utime ?? 0);
  writeCreatedCache(account, t);
  return t;
}

// Unix time (seconds) of the account's last activity — used to sort by
// "Last Bump" (most recently traded). Returns 0 when unavailable.
// Cached in memory for a short TTL.
export async function fetchLastActivity(account: string): Promise<number> {
  const hit = activityCache.get(account);
  if (hit && Date.now() - hit.at < ACTIVITY_TTL_MS) return hit.value;
  const url = `${TONAPI_BASE}/v2/accounts/${encodeURIComponent(account)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`tonapi account ${res.status}`);
  const data = await res.json();
  const t = Number(data.last_activity ?? 0);
  activityCache.set(account, { value: t, at: Date.now() });
  return t;
}
