import { useEffect, useMemo, useState } from 'react';
import { Lock, ChevronDown, ChevronUp, Check, Plus } from 'lucide-react';
import { fetchVestingLocks } from '../contracts/vesting';
import type { VestingLock } from '../contracts/vesting';
import { PLATFORM_TOTAL_SUPPLY, VESTING_APP_URL } from '../contracts/config';

type Props = {
  jetton: string; // current token (jetton_master) address
  symbol: string;
  totalSupply?: number; // whole-token supply if known; falls back to platform max
};

const DECIMALS = 9;
const UNIT = 10 ** DECIMALS;
const MONTH = 30 * 86400;

// raw jetton base units → whole tokens
const toWhole = (raw: string): number => {
  const n = Number(raw);
  return isFinite(n) ? n / UNIT : 0;
};

// compact token amount, e.g. 316_470_000 → "316.47m"
function fmtAmount(n: number): string {
  if (!isFinite(n) || n <= 0) return '0';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'b';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'm';
  if (n >= 1e3) return (n / 1e3).toFixed(2) + 'k';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

const shortAddr = (a: string): string =>
  a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;

const fmtDate = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

// "Unlocks in N months / in 1 year"; past unlocks read "Unlocked".
function relUnlock(ts: number): string {
  const diff = ts * 1000 - Date.now();
  if (diff <= 0) return 'Unlocked';
  const days = Math.round(diff / 86_400_000);
  if (days < 1) return 'Unlocks today';
  if (days < 45) return `Unlocks in ${days} day${days === 1 ? '' : 's'}`;
  const months = Math.round(days / 30);
  if (months < 12) return `Unlocks in ${months} months`;
  const years = Math.round(months / 12);
  if (years === 1) return 'Unlocks in 1 year';
  return `Unlocks in ${years} years`;
}

type Point = { ts: number; amount: number };

// Turn a single linear (start→cliff→end) lock into discrete timeline points.
// Pure-cliff locks (cliff == end) collapse to one full-unlock point; linear
// locks add a cliff chunk plus up to a handful of monthly steps to the end.
function buildSchedule(lock: VestingLock): Point[] {
  const start = Number(lock.start_ts);
  const cliff = Number(lock.cliff_ts);
  const end = Number(lock.end_ts);
  const total = toWhole(lock.total_amount);
  if (!(end > 0) || total <= 0) return [];

  const vestedAt = (t: number): number => {
    if (t < cliff) return 0;
    if (end <= cliff || t >= end) return total;
    if (end <= start) return total;
    return (total * (t - start)) / (end - start);
  };

  const pts: Point[] = [];
  if (end <= cliff) {
    pts.push({ ts: end, amount: total });
    return pts;
  }

  let prevV = 0;
  const cliffV = vestedAt(cliff);
  if (cliffV > 1e-9) {
    pts.push({ ts: cliff, amount: cliffV });
    prevV = cliffV;
  }
  const steps = Math.min(8, Math.max(1, Math.round((end - cliff) / MONTH)));
  for (let i = 1; i <= steps; i++) {
    const t = i === steps ? end : cliff + Math.round(((end - cliff) * i) / steps);
    const v = vestedAt(t);
    const amount = v - prevV;
    if (amount > 1e-9) pts.push({ ts: t, amount });
    prevV = v;
  }
  return pts;
}

type Block = { beneficiary: string; locked: number; points: Point[] };

export default function VestingCard({ jetton, symbol, totalSupply }: Props) {
  const [locks, setLocks] = useState<VestingLock[] | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    setLocks(null);
    fetchVestingLocks(jetton)
      .then((l) => alive && setLocks(l))
      .catch(() => alive && setLocks([]));
    return () => {
      alive = false;
    };
  }, [jetton]);

  const supply = totalSupply && totalSupply > 0 ? totalSupply : PLATFORM_TOTAL_SUPPLY;

  const { blocks, totalLocked } = useMemo(() => {
    const byBen = new Map<string, Block>();
    let sum = 0;
    for (const l of locks ?? []) {
      const locked = Math.max(0, toWhole(l.total_amount) - toWhole(l.claimed));
      sum += locked;
      const b = byBen.get(l.beneficiary) ?? { beneficiary: l.beneficiary, locked: 0, points: [] };
      b.locked += locked;
      b.points.push(...buildSchedule(l));
      byBen.set(l.beneficiary, b);
    }
    const blocks = [...byBen.values()].map((b) => ({
      ...b,
      points: b.points.sort((a, c) => a.ts - c.ts),
    }));
    return { blocks, totalLocked: sum };
  }, [locks]);

  // Loading skeleton
  if (locks === null) {
    return (
      <section className="rounded-2xl p-4" style={card}>
        <div className="flex items-center gap-2">
          <Lock size={15} className="text-[#64748B]" />
          <span className="text-sm font-semibold text-white">Vesting contract</span>
          <div className="ml-auto h-3 w-16 rounded bg-[#1E2A4A] animate-pulse" />
        </div>
        <div className="mt-3 h-10 rounded-lg bg-[#0A0E1A] animate-pulse" />
      </section>
    );
  }

  // No locks → don't render an empty card, just nothing.
  if (blocks.length === 0) return null;

  const lockedPercent = (totalLocked / supply) * 100;
  const lockMoreUrl = `${VESTING_APP_URL}?jetton=${encodeURIComponent(jetton)}`;

  return (
    <section className="rounded-2xl p-4" style={card}>
      {/* Header */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 text-left"
      >
        <Lock size={15} className="text-[#3B82F6]" />
        <span className="text-sm font-semibold text-white">Vesting contract</span>
        <span className="ml-auto text-sm font-semibold text-[#3B82F6]">
          {lockedPercent < 0.01 ? '<0.01' : lockedPercent.toFixed(2)}% locked
        </span>
        {open ? (
          <ChevronUp size={16} className="text-[#64748B]" />
        ) : (
          <ChevronDown size={16} className="text-[#64748B]" />
        )}
      </button>

      {/* Sub-line: lock more · total locked */}
      <div className="mt-1 flex items-center gap-2 text-xs">
        <a
          href={lockMoreUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[#3B82F6] hover:underline"
        >
          <Plus size={11} /> Lock more
        </a>
        <span className="text-[#334155]">·</span>
        <span className="text-[#94A3B8]">
          {fmtAmount(totalLocked)} {symbol} locked
        </span>
      </div>

      {open && (
        <div className="mt-4 space-y-5">
          {blocks.map((b) => (
            <div key={b.beneficiary}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-[#64748B]">
                    Address
                  </span>
                  <span className="font-mono text-xs text-[#94A3B8]">
                    {shortAddr(b.beneficiary)}
                  </span>
                </div>
                <span className="text-xs text-[#64748B]">
                  {fmtAmount(b.locked)} {symbol}
                </span>
              </div>

              {/* Vertical unlock timeline */}
              <ol className="relative ml-1 border-l border-[#1E2A4A]">
                {b.points.map((p, i) => {
                  const done = p.ts * 1000 <= Date.now();
                  const pct = (p.amount / supply) * 100;
                  return (
                    <li key={i} className="relative pl-4 pb-4 last:pb-0">
                      <span
                        className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full flex items-center justify-center"
                        style={{ background: done ? '#22C55E' : '#3B82F6' }}
                      >
                        {done && <Check size={7} className="text-white" strokeWidth={4} />}
                      </span>
                      <div
                        className="flex items-center justify-between"
                        style={{ opacity: done ? 0.55 : 1 }}
                      >
                        <div>
                          <p className="text-xs text-white">{fmtDate(p.ts)}</p>
                          <p className="text-[11px] text-[#64748B]">{relUnlock(p.ts)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-white">
                            {fmtAmount(p.amount)} {symbol}
                          </p>
                          <p className="text-[11px] text-[#64748B]">
                            {pct < 0.01 ? '<0.01' : pct.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

const card = { background: '#0F1629', border: '1px solid #1E2A4A' } as const;
