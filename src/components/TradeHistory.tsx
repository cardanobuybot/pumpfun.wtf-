import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import { Address } from '@ton/core';
import type { Trade } from '../contracts/launchpad';
import { tonscanBase } from '../contracts/config';

function fmt(n: number): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function ago(unix: number): string {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Compare two addresses regardless of bounceable/testnet string formatting.
function sameAddr(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  try {
    return Address.parse(a).equals(Address.parse(b));
  } catch {
    return a === b;
  }
}

export default function TradeHistory({
  trades,
  symbol,
  dev,
}: {
  trades: Trade[];
  symbol: string;
  dev?: string | null;
}) {
  if (trades.length === 0) {
    return (
      <p className="text-sm text-center text-[#64748B] py-6">No trades yet. Be the first!</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {trades.map((t) => {
        const buy = t.type === 'buy';
        const isDev = sameAddr(t.trader, dev);

        // Dev trades get a fully saturated green/red row so they jump out.
        const devBg = buy ? '#15803D' : '#B91C1C'; // green-700 / red-700
        const devRing = buy ? '0 0 0 1px #22C55E' : '0 0 0 1px #EF4444';

        return (
          <a
            key={t.hash}
            href={`${tonscanBase}/transaction/${t.hash}`}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              isDev ? 'hover:brightness-110' : 'hover:bg-[#1E2A4A]'
            }`}
            style={
              isDev
                ? { background: devBg, boxShadow: devRing }
                : { background: '#0A0E1A' }
            }
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: isDev
                  ? 'rgba(255,255,255,0.2)'
                  : buy
                    ? 'rgba(34,197,94,0.15)'
                    : 'rgba(239,68,68,0.15)',
              }}
            >
              {buy ? (
                <ArrowUpRight size={15} className={isDev ? 'text-white' : 'text-[#22C55E]'} />
              ) : (
                <ArrowDownRight size={15} className={isDev ? 'text-white' : 'text-[#EF4444]'} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-sm font-semibold ${
                    isDev ? 'text-white' : buy ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {buy ? 'Buy' : 'Sell'}
                </span>
                {isDev && (
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-white/25 text-white rounded px-1.5 py-0.5 leading-none">
                    DEV
                  </span>
                )}
                <span
                  className={`font-mono text-xs ${isDev ? 'text-white/80' : 'text-[#64748B]'}`}
                >
                  {t.trader.slice(0, 4)}…{t.trader.slice(-4)}
                </span>
              </div>
              <p className={`text-xs ${isDev ? 'text-white/90' : 'text-[#94A3B8]'}`}>
                {fmt(t.tokenAmount)} {symbol}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={`text-sm font-medium ${isDev ? 'text-white' : 'text-white'}`}>
                {t.tonAmount.toFixed(3)} GRAM
              </p>
              <p
                className={`text-[10px] flex items-center gap-1 justify-end ${
                  isDev ? 'text-white/70' : 'text-[#64748B]'
                }`}
              >
                {ago(t.time)} ago <ExternalLink size={9} />
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
