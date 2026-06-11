import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, RefreshCw, Clock, Eye, ArrowLeftRight, Users, MessageCircle } from 'lucide-react';
import { Address, toNano } from '@ton/core';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import ProgressBar from '../components/ProgressBar';
import PriceChart from '../components/PriceChart';
import TradeHistory from '../components/TradeHistory';
import Holders from '../components/Holders';
import TokenChat from '../components/TokenChat';
import RugCheck from '../components/RugCheck';
import VestingCard from '../components/VestingCard';
import {
  fetchTokenByAddress,
  fetchTrades,
  fetchCreatorAddress,
  fetchBuyEstimate,
  fetchSellEstimate,
  fetchUserTokenBalance,
  getUserWalletAddress,
  buildBuyPayload,
  buildBurnPayload,
} from '../contracts/launchpad';
import type { OnchainToken, Trade } from '../contracts/launchpad';
import { SELL_GAS, tonscanBase } from '../contracts/config';
import { timeAgo } from '../lib/utils';

function fmt(n: number, digits = 2): string {
  if (!isFinite(n)) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  if (n > 0 && n < 0.0001) return n.toExponential(2);
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export default function TokenDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const [token, setToken] = useState<OnchainToken | null>(null);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [dev, setDev] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'trades' | 'holders' | 'chat'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isBuy, setIsBuy] = useState(true);
  const [amount, setAmount] = useState('');
  const [estimate, setEstimate] = useState(0);
  const [balance, setBalance] = useState(0);
  const [slippage, setSlippage] = useState(5); // % tolerance, presets 1/3/5/10
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      const t = await fetchTokenByAddress(id);
      setToken(t);
      fetchTrades(id).then(setTrades).catch(() => setTrades([]));
      fetchCreatorAddress(id).then(setDev).catch(() => setDev(null));
    } catch (e) {
      setError('Token not found or not yet indexed. ' + ((e as Error)?.message ?? ''));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // load the user's balance of this token
  useEffect(() => {
    if (!id || !address) {
      setBalance(0);
      return;
    }
    fetchUserTokenBalance(id, Address.parse(address)).then(setBalance).catch(() => setBalance(0));
  }, [id, address, token]);

  // live estimate as the user types
  useEffect(() => {
    if (!id || !amount || Number(amount) <= 0) {
      setEstimate(0);
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        if (isBuy) {
          const tokens = await fetchBuyEstimate(id, amount);
          if (!cancelled) setEstimate(tokens);
        } else {
          const ton = await fetchSellEstimate(id, Number(amount));
          if (!cancelled) setEstimate(ton);
        }
      } catch {
        if (!cancelled) setEstimate(0);
      }
    };
    const h = setTimeout(run, 350);
    return () => {
      cancelled = true;
      clearTimeout(h);
    };
  }, [id, amount, isBuy]);

  // Set the sell amount to a percentage of the user's token balance. The live
  // "you receive" estimate recalculates automatically when `amount` changes.
  const setSellPct = (p: number) => {
    if (balance <= 0) return;
    // 100% sells the exact balance; partials trim to 6 dp to avoid long floats.
    setAmount(p >= 1 ? String(balance) : String(Number((balance * p).toFixed(6))));
  };

  const handleTrade = async () => {
    if (!id) return;
    if (!address) {
      tonConnectUI.openModal();
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setStatus('Enter an amount.');
      return;
    }
    if (!isBuy && Number(amount) > balance) {
      setStatus('Not enough tokens.');
      return;
    }

    // Slippage guard. The bonding-curve ops carry no on-chain min-out, so we
    // re-quote at submit time and abort if the live estimate has slipped more
    // than the chosen tolerance below the figure the user was shown.
    const quoted = estimate;
    if (quoted > 0) {
      setStatus('Checking price…');
      let fresh = quoted;
      try {
        fresh = isBuy ? await fetchBuyEstimate(id, amount) : await fetchSellEstimate(id, Number(amount));
      } catch {
        fresh = quoted;
      }
      const minReceive = quoted * (1 - slippage / 100);
      if (fresh < minReceive) {
        const unit = isBuy ? token?.symbol ?? 'tokens' : 'GRAM';
        const now = isBuy ? fmt(fresh) : fresh.toFixed(4);
        setStatus(`⚠️ Price moved more than ${slippage}% (now ~${now} ${unit}) — trade cancelled.`);
        return;
      }
    }

    try {
      setStatus('Confirm in your wallet…');
      if (isBuy) {
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [{ address: id, amount: toNano(amount).toString(), payload: buildBuyPayload() }],
        });
      } else {
        const walletAddr = await getUserWalletAddress(id, Address.parse(address));
        const payload = buildBurnPayload(Number(amount), Address.parse(address));
        await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 300,
          messages: [
            { address: walletAddr.toString(), amount: toNano(SELL_GAS).toString(), payload },
          ],
        });
      }
      setStatus('✅ Sent! Updating in a few seconds…');
      setAmount('');
      setTimeout(() => {
        load();
        setStatus(null);
      }, 6000);
    } catch (err) {
      setStatus('Failed: ' + ((err as Error)?.message ?? String(err)));
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-[#94A3B8]">Loading token…</div>;
  }
  if (error || !token) {
    return (
      <div className="py-20 text-center space-y-4">
        <p className="text-[#94A3B8]">{error ?? 'Token not found'}</p>
        <button onClick={() => navigate('/')} className="text-[#3B82F6]">← Back home</button>
      </div>
    );
  }

  const card = { background: '#0F1629', border: '1px solid #1E2A4A' } as const;

  return (
    <div className="space-y-5 py-5">
      {/* Token Info Card */}
      <section className="rounded-2xl p-4" style={card}>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1E2A4A]"
            style={{ background: '#1E2A4A' }}
          >
            <ArrowLeft size={18} className="text-[#94A3B8]" />
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-lg">{token.symbol}</span>
            <span className="text-[#94A3B8]">{token.name}</span>
          </div>
          <button
            onClick={load}
            className="ml-auto w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#1E2A4A]"
          >
            <RefreshCw size={15} className="text-[#64748B]" />
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <img
            src={token.image || `https://api.dicebear.com/7.x/shapes/svg?seed=${token.symbol}`}
            alt={token.name}
            className="w-20 h-20 rounded-xl flex-shrink-0 object-cover"
            style={{ background: '#1E2A4A' }}
          />
          <div className="flex-1 min-w-0">
            <a
              href={`${tonscanBase}/address/${token.address}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs text-[#3B82F6] mb-1 flex items-center gap-1 hover:underline"
            >
              {token.address.slice(0, 6)}…{token.address.slice(-6)} <ExternalLink size={11} />
            </a>
            {token.createdAt > 0 && (
              <p className="text-xs text-[#64748B] mb-1 flex items-center gap-1">
                <Clock size={11} /> Created {timeAgo(token.createdAt)} ago
              </p>
            )}
            <p className="text-sm text-[#94A3B8]">{token.description}</p>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          <ProgressBar value={token.progress} label="Bonding curve progress" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg py-2" style={{ background: '#0A0E1A' }}>
            <p className="text-[10px] text-[#64748B]">Market cap</p>
            <p className="text-sm text-white font-semibold">{fmt(token.marketCapTon)} GRAM</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: '#0A0E1A' }}>
            <p className="text-[10px] text-[#64748B]">Raised</p>
            <p className="text-sm text-white font-semibold">{fmt(token.realTon)} GRAM</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: '#0A0E1A' }}>
            <p className="text-[10px] text-[#64748B]">Price</p>
            <p className="text-sm text-white font-semibold">{token.priceTon.toExponential(2)}</p>
          </div>
        </div>
        {token.graduated && (
          <p className="mt-3 text-center text-xs text-[#F59E0B]">🎓 Graduated — trading locked</p>
        )}
      </section>

      {/* One-tap rug analysis (deterministic on-chain signals + Cocoon AI) */}
      <RugCheck token={token} dev={dev} />

      {/* Tab bar */}
      <div className="grid grid-cols-4 gap-2">
        {([
          ['overview', 'Overview', Eye, '#22d3ee'],
          ['trades', 'Trades', ArrowLeftRight, '#22c55e'],
          ['holders', 'Holders', Users, '#f59e0b'],
          ['chat', 'Chat', MessageCircle, '#a855f7'],
        ] as const).map(([key, label, Icon, color]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-all"
              style={{
                background: active ? 'linear-gradient(135deg, #3B82F6, #2563EB)' : '#111827',
                color: active ? '#FFFFFF' : '#94A3B8',
                boxShadow: active ? `0 0 16px ${color}55` : 'none',
              }}
            >
              <Icon size={20} color={color} strokeWidth={2.4} />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== Overview tab ===== */}
      {tab === 'overview' && (
      <>
      {/* Price Chart */}
      <section className="rounded-2xl p-4" style={card}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-white">Price</h3>
          <span className="text-xs text-[#64748B]">{token.priceTon.toExponential(2)} GRAM</span>
        </div>
        <PriceChart trades={trades} currentPrice={token.priceTon} />
      </section>

      {/* Vesting / token locks (hidden when there are none) */}
      <VestingCard jetton={token.address} symbol={token.symbol} />

      {/* Trading Panel */}
      <section className="rounded-2xl p-4" style={card}>
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => { setIsBuy(true); setAmount(''); }}
            className="flex-1 h-11 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: isBuy ? '#22C55E' : '#3D3D3D' }}
          >
            Buy
          </button>
          <button
            onClick={() => { setIsBuy(false); setAmount(''); }}
            className="flex-1 h-11 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: !isBuy ? '#EF4444' : '#3D3D3D' }}
          >
            Sell
          </button>
        </div>

        <div className="mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-[#94A3B8]">
              Amount ({isBuy ? 'GRAM' : token.symbol})
            </label>
            {!isBuy && (
              <button className="text-xs text-[#3B82F6]" onClick={() => setAmount(String(balance))}>
                Balance: {fmt(balance)} (max)
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#1E2A4A' }}
            >
              <span className="text-[#3B82F6] font-bold text-[10px]">{isBuy ? 'GRAM' : 'TKN'}</span>
            </div>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d*$/.test(val)) setAmount(val);
              }}
              placeholder="0"
              className="flex-1 h-12 rounded-xl px-4 text-white text-lg font-medium outline-none"
              style={{ background: '#0A0E1A', border: '1px solid #1E2A4A', minWidth: 0 }}
            />
          </div>

          {/* Quick sell amounts — % of the user's token balance */}
          {!isBuy && (
            <div className="grid grid-cols-4 gap-2 mt-2">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button
                  key={p}
                  type="button"
                  disabled={balance <= 0}
                  onClick={() => setSellPct(p)}
                  className="h-9 rounded-lg text-xs font-semibold text-[#94A3B8] hover:text-white transition-colors disabled:opacity-40"
                  style={{ background: '#0A0E1A', border: '1px solid #1E2A4A' }}
                >
                  {p === 1 ? 'MAX' : `${p * 100}%`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Slippage tolerance — guards both buy and sell against adverse moves */}
        <div className="mb-4">
          <label className="block text-sm text-[#94A3B8] mb-2">Slippage tolerance</label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 3, 5, 10].map((s) => {
              const active = slippage === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlippage(s)}
                  className="h-9 rounded-lg text-xs font-semibold transition-colors"
                  style={{
                    background: active ? '#1E2A4A' : '#0A0E1A',
                    border: `1px solid ${active ? '#3B82F6' : '#1E2A4A'}`,
                    color: active ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  {s}%
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-sm text-[#94A3B8] mb-2">You receive (est.)</label>
          <div className="flex items-center justify-between">
            <span className="text-white text-lg font-medium">
              {isBuy ? fmt(estimate) : estimate.toFixed(4)}
            </span>
            <span className="text-[#94A3B8] font-semibold text-sm">
              {isBuy ? token.symbol : 'GRAM'}
            </span>
          </div>
          {estimate > 0 && (
            <p className="text-xs text-[#64748B] mt-1">
              Min received at {slippage}%:{' '}
              {isBuy
                ? fmt(estimate * (1 - slippage / 100))
                : (estimate * (1 - slippage / 100)).toFixed(4)}{' '}
              {isBuy ? token.symbol : 'GRAM'}
            </p>
          )}
        </div>

        {status && <p className="text-sm text-center text-[#94A3B8] mb-3">{status}</p>}

        <button
          onClick={handleTrade}
          disabled={token.graduated}
          className="w-full h-12 rounded-xl font-semibold text-white text-base transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          style={{
            background: isBuy
              ? 'linear-gradient(135deg, #22C55E, #16A34A)'
              : 'linear-gradient(135deg, #EF4444, #DC2626)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          }}
        >
          {!address ? 'Connect wallet' : isBuy ? `⚡ Buy ${token.symbol}` : `Sell ${token.symbol}`}
        </button>

        <p className="text-[11px] text-center text-[#64748B] mt-3">
          Trading fee 1% · creator earns 0.5% — we split fees 50/50
        </p>
      </section>
      </>
      )}

      {/* ===== Trades tab ===== */}
      {tab === 'trades' && (
        <section className="rounded-2xl p-4" style={card}>
          <h3 className="text-sm font-semibold text-white mb-3">Recent trades</h3>
          <TradeHistory trades={trades} symbol={token.symbol} dev={dev} />
        </section>
      )}

      {/* ===== Holders tab ===== */}
      {tab === 'holders' && (
        <section className="rounded-2xl p-4" style={card}>
          <h3 className="text-sm font-semibold text-white mb-3">Holders</h3>
          <Holders
            tokenAddress={token.address}
            totalSupply={token.totalSupply}
            curveReserve={token.tokenReserve}
            trades={trades}
            symbol={token.symbol}
            dev={dev}
          />
        </section>
      )}

      {/* ===== Chat tab (on-chain comments) ===== */}
      {tab === 'chat' && (
        <section className="rounded-2xl p-4" style={card}>
          <TokenChat tokenAddress={token.address} />
        </section>
      )}
    </div>
  );
}
