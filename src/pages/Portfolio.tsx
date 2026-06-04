import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, RefreshCw } from 'lucide-react';
import { Address } from '@ton/core';
import { useTonAddress, useTonConnectUI } from '@tonconnect/ui-react';
import { listTokens, fetchUserTokenBalance } from '../contracts/launchpad';
import type { OnchainToken } from '../contracts/launchpad';

type Holding = OnchainToken & { balance: number; valueTon: number };

function fmt(n: number): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export default function Portfolio() {
  const navigate = useNavigate();
  const address = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    try {
      const owner = Address.parse(address);
      const tokens = await listTokens();
      const results = await Promise.all(
        tokens.map(async (t) => {
          const balance = await fetchUserTokenBalance(t.address, owner).catch(() => 0);
          return { ...t, balance, valueTon: balance * t.priceTon };
        }),
      );
      setHoldings(results.filter((h) => h.balance > 0).sort((a, b) => b.valueTon - a.valueTon));
    } catch (e) {
      setError('Failed to load portfolio: ' + ((e as Error)?.message ?? ''));
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  if (!address) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#1E2A4A' }}
        >
          <Wallet size={28} className="text-[#64748B]" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-sm text-[#94A3B8] max-w-xs mb-5">
          Connect your TON wallet to view your portfolio and manage your tokens.
        </p>
        <button
          onClick={() => tonConnectUI.openModal()}
          className="h-11 px-6 rounded-xl font-bold text-white text-sm transition-all hover:scale-[1.02]"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          }}
        >
          Connect Wallet
        </button>
      </div>
    );
  }

  const totalValue = holdings.reduce((s, h) => s + h.valueTon, 0);

  return (
    <div className="space-y-4 py-4">
      {/* Total value */}
      <section
        className="rounded-2xl p-5 text-center"
        style={{
          background: 'linear-gradient(135deg, #1e4a8a 0%, #163060 60%, #111827 100%)',
          border: '1px solid #3B82F6',
        }}
      >
        <p className="text-xs text-[#94A3B8] mb-1">Portfolio value</p>
        <p className="text-3xl font-black text-white">{fmt(totalValue)} TON</p>
        <p className="font-mono text-xs text-[#8b5cf6] mt-2">
          {address.slice(0, 6)}…{address.slice(-6)}
        </p>
      </section>

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">
          Holdings {holdings.length > 0 && `(${holdings.length})`}
        </h3>
        <button
          onClick={load}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1E2A4A]"
        >
          <RefreshCw size={15} className={`text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* States */}
      {loading && <p className="text-center text-[#64748B] py-10">Loading holdings from chain…</p>}
      {error && <p className="text-center text-[#EF4444] py-6 text-sm">{error}</p>}
      {!loading && !error && holdings.length === 0 && (
        <div className="text-center py-12 space-y-3">
          <p className="text-[#94A3B8]">No tokens yet. Go buy some! 🚀</p>
          <button onClick={() => navigate('/')} className="text-[#3B82F6] font-semibold">
            Browse tokens →
          </button>
        </div>
      )}

      {/* Holdings list */}
      {!loading && !error && holdings.length > 0 && (
        <div className="space-y-2">
          {holdings.map((h) => (
            <button
              key={h.address}
              onClick={() => navigate(`/token/${h.address}`)}
              className="w-full flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-[#1E2A4A] text-left"
              style={{ background: '#0F1629', border: '1px solid #1E2A4A' }}
            >
              <img
                src={h.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${h.symbol}`}
                alt={h.name}
                className="w-11 h-11 rounded-lg flex-shrink-0 object-cover"
                style={{ background: '#1E2A4A' }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{h.symbol}</span>
                  <span className="text-xs text-[#94A3B8] truncate">{h.name}</span>
                </div>
                <p className="text-xs text-[#64748B]">{fmt(h.balance)} tokens</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-white">{fmt(h.valueTon)} TON</p>
                <p className="text-[10px] text-[#64748B]">{h.priceTon.toExponential(2)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
