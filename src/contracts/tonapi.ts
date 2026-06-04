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
