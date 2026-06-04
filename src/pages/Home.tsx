import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import TokenCard from '../components/TokenCard';
import ProgressBar from '../components/ProgressBar';
import type { Token } from '../data/tokens';
import { listTokens } from '../contracts/launchpad';
import type { OnchainToken } from '../contracts/launchpad';

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
    timeAgo: '',
    txs: 0,
    volume24h: `${fmt(t.realTon)} TON`,
    kingOfHillProgress: Number(t.progress.toFixed(2)),
    image: t.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${t.symbol}`,
  };
}

export default function Home() {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<OnchainToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const sorted = [...tokens].sort((a, b) => b.marketCapTon - a.marketCapTon);
  const king = sorted[0];
  const kingCard = king ? toCard(king) : null;

  return (
    <div className="space-y-3 py-3">
      {/* King of the Hill */}
      {kingCard && (
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

      {/* Heading + refresh */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">All tokens {tokens.length > 0 && `(${tokens.length})`}</h3>
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

      {/* Token Grid */}
      {!loading && !error && tokens.length > 0 && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {sorted.map((t) => (
            <TokenCard key={t.address} token={toCard(t)} />
          ))}
        </section>
      )}
    </div>
  );
}
