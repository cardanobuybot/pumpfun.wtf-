import { ArrowDownRight, ArrowUpRight, ExternalLink } from 'lucide-react';
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

export default function TradeHistory({ trades, symbol }: { trades: Trade[]; symbol: string }) {
  if (trades.length === 0) {
    return (
      <p className="text-sm text-center text-[#64748B] py-6">No trades yet. Be the first!</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {trades.map((t) => {
        const buy = t.type === 'buy';
        return (
          <a
            key={t.hash}
            href={`${tonscanBase}/transaction/${t.hash}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-[#1E2A4A]"
            style={{ background: '#0A0E1A' }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: buy ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)' }}
            >
              {buy ? (
                <ArrowUpRight size={15} className="text-[#22C55E]" />
              ) : (
                <ArrowDownRight size={15} className="text-[#EF4444]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-sm font-semibold ${buy ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                  {buy ? 'Buy' : 'Sell'}
                </span>
                <span className="font-mono text-xs text-[#64748B]">
                  {t.trader.slice(0, 4)}…{t.trader.slice(-4)}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8]">
                {fmt(t.tokenAmount)} {symbol}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm text-white font-medium">{t.tonAmount.toFixed(3)} TON</p>
              <p className="text-[10px] text-[#64748B] flex items-center gap-1 justify-end">
                {ago(t.time)} ago <ExternalLink size={9} />
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
