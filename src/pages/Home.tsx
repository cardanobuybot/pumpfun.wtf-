import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Sprout, TrendingUp, BarChart3, Flag, Search } from 'lucide-react';
import TokenCard from '../components/TokenCard';
import ProgressBar from '../components/ProgressBar';
import type { Token } from '../data/tokens';
import { listTokens } from '../contracts/launchpad';
import type { OnchainToken } from '../contracts/launchpad';
import { timeAgo } from '../lib/utils';

function fmt(n: number): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function toCard(t: OnchainToken): Token {
  return {
    id: t.address,
    ticker: t.symbol,
    name: t.name,
    shortId: `${t.address.slice(0, 4)}..${t.address.slice(-4)}`,
    description: t.description || 'No description',
    progress: Number(t.progress.toFixed(2)),
    marketCap: `${fmt(t.marketCapTon)} TON`,
    timeAgo: timeAgo(t.createdAt),
    txs: t.txCount,
    volume24h: `${fmt(t.realTon)} TON`,
    kingOfHillProgress: Number(t.progress.toFixed(2)),
    image: t.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${t.symbol}`,
  };
}

type SortKey = 'bump' | 'new' | 'mcap' | 'complete';

const SORTS: { key: SortKey; label: string; Icon: typeof Sprout; color: string }[] = [
  { key: 'bump', label: 'Last Bump', Icon: TrendingUp, color: '#22d3ee' },
  { key: 'new', label: 'New', Icon: Sprout, color: '#22c55e' },
  { key: 'mcap', label: 'Mcap', Icon: BarChart3, color: '#f59e0b' },
  { key: 'complete', label: 'Complete', Icon: Flag, color: '#ef4444' },
];

function sortTokens(list: OnchainToken[], key: SortKey): OnchainToken[] {
  const arr = [...list];
  switch (key) {
    case 'bump':
      return arr.sort((a, b) => (b.lastActivity || 0) - (a.lastActivity || 0));
    case 'new':
      return arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'complete':
      return arr.sort((a, b) => b.progress - a.progress);
    case 'mcap':
    default:
      return arr.sort((a, b) => b.marketCapTon - a.marketCapTon);
  }
}

export default function Home() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<OnchainToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('bump');
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listTokens();
      setTokens(list);
    } catch (e) {
      setError('Failed to load tokens: ' + ((e as Error)?.message ?? ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // King is always the highest market-cap token (independent of the active
  // filter), shown only when not actively searching.
  const king = useMemo(
    () => [...tokens].sort((a, b) => b.marketCapTon - a.marketCapTon)[0],
    [tokens],
  );
  const kingCard = king ? toCard(king) : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? tokens.filter(
          (t) =>
            t.symbol.toLowerCase().includes(q) ||
            t.name.toLowerCase().includes(q) ||
            t.address.toLowerCase().includes(q),
        )
      : tokens;
    return sortTokens(filtered, sort);
  }, [tokens, query, sort]);

  const searching = query.trim().length > 0;

  return (
    <div className="space-y-3 py-3">
      {/* King of the Hill */}
      {kingCard && !searching && (
        <section>
          <h2 className="text-center text-lg font-black tracking-wider mb-2 text-white">
            👑 KING OF THE HILL
          </h2>
          <div
            className="rounded-xl overflow-hidden cursor-pointer"
            onClick={() => navigate(`/token/${kingCard.id}`)}
            style={{
              background: 'linear-gradient(135deg, #1e4a8a 0%, #1a3a7a 30%, #163060 60%, #111827 100%)',
              border: '2.5px solid #3B82F6',
              boxShadow: '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.25)',
            }}
          >
            <div className="p-4">
              <div className="flex gap-4">
                <img
                  src={kingCard.image}
                  alt={kingCard.name}
                  className="w-16 h-16 rounded-xl flex-shrink-0 object-cover"
                  style={{ background: '#1e293b' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-bold text-white text-lg">{kingCard.ticker}</span>
                    <span className="text-[#94A3B8] text-sm">{kingCard.name}</span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: '#8b5cf6' }}>{kingCard.shortId}</span>
                  <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-2 mt-1">{kingCard.description}</p>
                  <p className="text-sm font-bold mt-1.5" style={{ color: '#22d3ee' }}>Mcap: {kingCard.marketCap}</p>
                </div>
              </div>
            </div>
            <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(59, 130, 246, 0.25)' }}>
              <div className="mt-3">
                <ProgressBar value={kingCard.progress} label="Bonding Curve" />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Launch Token Button */}
      <button
        onClick={() => navigate('/launch')}
        className="w-full h-11 rounded-xl font-bold text-white text-sm transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
        }}
      >
        🚀 Launch Token
      </button>

      {/* Search bar */}
      <div
        className="flex items-center gap-2 px-3 h-11 rounded-xl"
        style={{ background: '#0d111e', border: '1px solid #1e293b' }}
      >
        <Search size={16} className="text-[#64748B] flex-shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, ticker or address…"
          className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#64748B] min-w-0"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-[#64748B] hover:text-white text-xs flex-shrink-0">
            Clear
          </button>
        )}
      </div>

      {/* Filter / sort buttons */}
      <div className="grid grid-cols-4 gap-2">
        {SORTS.map(({ key, label, Icon, color }) => {
          const active = sort === key;
          return (
            <button
              key={key}
              onClick={() => setSort(key)}
              className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all"
              style={{
                background: active ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : '#111827',
                color: active ? '#FFFFFF' : '#94A3B8',
                border: active ? `1px solid ${color}` : '1px solid #1e293b',
                boxShadow: active ? `0 0 16px ${color}55` : 'none',
              }}
            >
              <Icon size={20} color={color} strokeWidth={2.4} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* Heading + refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">
          {searching ? `Results (${visible.length})` : `All tokens ${tokens.length > 0 ? `(${tokens.length})` : ''}`}
        </h3>
        <button onClick={load} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1e293b]">
          <RefreshCw size={15} className={`text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* States */}
      {loading && <p className="text-center text-[#64748B] py-10">Loading tokens from chain…</p>}
      {error && <p className="text-center text-[#EF4444] py-6 text-sm">{error}</p>}
      {!loading && !error && tokens.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-[#94A3B8]">No tokens yet. Be the first to launch one! 🚀</p>
          <button onClick={() => navigate('/launch')} className="text-[#3B82F6] font-semibold">Launch a token →</button>
        </div>
      )}

      {/* No search results */}
      {!loading && !error && tokens.length > 0 && visible.length === 0 && (
        <p className="text-center text-[#64748B] py-10 text-sm">No tokens match “{query}”.</p>
      )}

      {/* Token Grid */}
      {!loading && !error && visible.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {visible.map((t) => (
            <TokenCard key={t.address} token={toCard(t)} />
          ))}
        </section>
      )}
    </div>
  );
}
