import { useEffect, useState } from 'react';
import { Address } from '@ton/core';
import type { Trade } from '../contracts/launchpad';
import { fetchHolders, type Holder } from '../contracts/tonapi';

function fmt(n: number): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function sameAddr(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return a === b;
  }
}

// Fallback: aggregate net token balances per wallet from recent trade history,
// used only if the tonapi holder index is unavailable.
function holdersFromTrades(trades: Trade[]): Holder[] {
  const balances = new Map<string, number>();
  for (const t of trades) {
    if (!t.trader) continue;
    const delta = t.type === 'buy' ? t.tokenAmount : -t.tokenAmount;
    balances.set(t.trader, (balances.get(t.trader) ?? 0) + delta);
  }
  return [...balances.entries()]
    .map(([owner, amount]) => ({ owner, amount }))
    .filter((h) => h.amount > 0.000001)
    .sort((a, b) => b.amount - a.amount);
}

export default function Holders({
  tokenAddress,
  totalSupply,
  curveReserve,
  trades,
  symbol,
  dev,
}: {
  tokenAddress: string;
  totalSupply: number; // tokens already minted to buyers
  curveReserve: number; // unsold tokens still held by the bonding curve
  trades: Trade[];
  symbol: string;
  dev?: string | null;
}) {
  const [holders, setHolders] = useState<Holder[] | null>(null);
  const [approx, setApprox] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setHolders(null);
    fetchHolders(tokenAddress)
      .then((h) => {
        if (cancelled) return;
        setApprox(false);
        setHolders(h);
      })
      .catch(() => {
        if (cancelled) return;
        setApprox(true);
        setHolders(holdersFromTrades(trades));
      });
    return () => {
      cancelled = true;
    };
  }, [tokenAddress, trades]);

  if (holders === null) {
    return <p className="text-sm text-center text-[#64748B] py-6">Loading holders…</p>;
  }

  // Tokens are lazily minted to buyers; the unsold remainder lives in the
  // bonding curve (it isn't a real jetton holder, so we add it synthetically).
  // The denominator is the full planned supply = minted + curve reserve, so the
  // curve shows as the majority holder until the token graduates.
  const buyers = holders.filter((h) => !sameAddr(h.owner, tokenAddress));
  const mintedSum = buyers.reduce((s, h) => s + h.amount, 0);
  const mintedTotal = !approx && totalSupply > 0 ? totalSupply : mintedSum;
  const reserve = curveReserve > 0 ? curveReserve : 0;
  const denom = mintedTotal + reserve;

  const display: Holder[] = reserve > 0
    ? [{ owner: tokenAddress, amount: reserve, name: 'Bonding Curve' }, ...buyers]
    : [...buyers];
  display.sort((a, b) => b.amount - a.amount);

  if (display.length === 0) {
    return (
      <p className="text-sm text-center text-[#64748B] py-6">
        No holders yet. Be the first to buy!
      </p>
    );
  }

  const buyerCount = buyers.length;

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-[#64748B] mb-1">
        {approx
          ? `Estimated from recent trades · ${buyerCount} holder${buyerCount === 1 ? '' : 's'}`
          : `${buyerCount} holder${buyerCount === 1 ? '' : 's'} · share of total supply`}
      </p>
      {display.map((h, i) => {
        const isCurve = sameAddr(h.owner, tokenAddress);
        const isDev = !isCurve && sameAddr(h.owner, dev);
        const pct = denom > 0 ? (h.amount / denom) * 100 : 0;
        return (
          <div
            key={h.owner}
            className="rounded-lg px-3 py-2"
            style={
              isCurve
                ? { background: 'rgba(59,130,246,0.12)', boxShadow: '0 0 0 1px #3B82F6' }
                : isDev
                  ? { background: 'rgba(34,197,94,0.12)', boxShadow: '0 0 0 1px #22C55E' }
                  : { background: '#0A0E1A' }
            }
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-[#64748B] w-5 flex-shrink-0">#{i + 1}</span>
              <span className="text-xs text-[#94A3B8] truncate" title={h.owner}>
                {isCurve ? (
                  <span className="text-[#E2E8F0] font-medium">🪙 Bonding Curve</span>
                ) : h.name ? (
                  <span className="text-[#E2E8F0] font-medium">{h.name}</span>
                ) : (
                  <span className="font-mono">
                    {h.owner.slice(0, 4)}…{h.owner.slice(-4)}
                  </span>
                )}
              </span>
              {isCurve && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#3B82F6] text-white rounded px-1.5 py-0.5 leading-none flex-shrink-0">
                  CURVE
                </span>
              )}
              {isDev && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#22C55E] text-white rounded px-1.5 py-0.5 leading-none flex-shrink-0">
                  DEV
                </span>
              )}
              {h.isScam && (
                <span className="text-[10px] font-bold uppercase tracking-wide bg-[#EF4444] text-white rounded px-1.5 py-0.5 leading-none flex-shrink-0">
                  SCAM
                </span>
              )}
              <span className="ml-auto text-xs text-white font-semibold">{pct.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: '#1E2A4A' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(pct, 100)}%`,
                    background: isCurve ? '#3B82F6' : isDev ? '#22C55E' : '#60A5FA',
                  }}
                />
              </div>
              <span className="text-[11px] text-[#64748B] flex-shrink-0">
                {fmt(h.amount)} {symbol}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
