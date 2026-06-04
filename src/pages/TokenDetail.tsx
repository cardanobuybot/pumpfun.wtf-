import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ProgressBar from '../components/ProgressBar';
import { chartData, lastTrades } from '../data/tokens';
import type { Token } from '../data/tokens';

const demoToken: Token = {
  id: 'idte.test',
  ticker: 'TIKR',
  name: 'test',
  shortId: 'idte..test',
  description: 'test',
  progress: 23.48,
  marketCap: '$12.3K',
  timeAgo: '3h ago',
  txs: 51,
  volume24h: '$1.26k',
  kingOfHillProgress: 15.4,
  image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=test&backgroundColor=b6e3f4',
};

export default function TokenDetail() {
  useParams();
  const navigate = useNavigate();
  const [isBuy, setIsBuy] = useState(true);
  const [amount, setAmount] = useState('');

  const token = demoToken;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="rounded-lg px-3 py-2"
          style={{
            background: 'rgba(15, 22, 41, 0.95)',
            border: '1px solid #1E2A4A',
            backdropFilter: 'blur(12px)',
          }}
        >
          <p className="text-xs text-[#94A3B8]">time: 25 Dec &apos;24 {label}</p>
          <p className="text-sm font-semibold" style={{ color: '#3B82F6' }}>
            price: {payload[0].value.toFixed(6)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 py-5">
      {/* Token Info Card */}
      <section
        className="rounded-2xl p-4"
        style={{
          background: '#0F1629',
          border: '1px solid #1E2A4A',
        }}
      >
        {/* Back + Header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1E2A4A]"
            style={{ background: '#1E2A4A' }}
          >
            <ArrowLeft size={18} className="text-[#94A3B8]" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-lg">{token.ticker}</span>
              <span className="text-[#94A3B8]">{token.name}</span>
            </div>
          </div>
        </div>

        {/* Token Image + Info */}
        <div className="flex gap-4 mb-4">
          <img
            src={token.image}
            alt={token.name}
            className="w-20 h-20 rounded-xl flex-shrink-0"
            style={{ background: '#1E2A4A' }}
          />
          <div className="flex-1">
            <p className="font-mono text-xs text-[#64748B] mb-1">{token.shortId}</p>
            <p className="text-sm text-[#94A3B8] mb-3">{token.description}</p>
          </div>
        </div>

        {/* Progress Bars */}
        <div className="space-y-3 mb-4">
          <ProgressBar value={token.progress} />
          <ProgressBar
            value={token.kingOfHillProgress}
            variant="yellow"
            label="King Of The Hill Progress"
          />
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-[#64748B]">
          <span>{token.timeAgo}</span>
          <span>{token.txs} txs</span>
          <span>{token.volume24h} Vol 24h</span>
        </div>
      </section>

      {/* Trading Panel */}
      <section
        className="rounded-2xl p-4"
        style={{
          background: '#0F1629',
          border: '1px solid #1E2A4A',
        }}
      >
        {/* Buy / Sell Toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setIsBuy(true)}
            className="flex-1 h-11 rounded-xl font-semibold text-white text-sm transition-all duration-200"
            style={{
              background: isBuy ? '#22C55E' : '#3D3D3D',
              boxShadow: isBuy ? '0 4px 16px rgba(34, 197, 94, 0.3)' : 'none',
            }}
          >
            Buy
          </button>
          <button
            onClick={() => setIsBuy(false)}
            className="flex-1 h-11 rounded-xl font-semibold text-white text-sm transition-all duration-200"
            style={{
              background: !isBuy ? '#EF4444' : '#3D3D3D',
              boxShadow: !isBuy ? '0 4px 16px rgba(239, 68, 68, 0.3)' : 'none',
            }}
          >
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="block text-sm text-[#94A3B8] mb-2">Amount</label>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: '#1E2A4A' }}
            >
              <span className="text-[#3B82F6] font-bold text-[10px]">TON</span>
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
              className="flex-1 h-12 rounded-xl px-4 text-white text-lg font-medium outline-none transition-colors"
              style={{
                background: '#0A0E1A',
                border: '1px solid #1E2A4A',
                minWidth: 0,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3B82F6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#1E2A4A';
              }}
            />
          </div>
        </div>

        {/* You Receive */}
        <div className="mb-5">
          <label className="block text-sm text-[#94A3B8] mb-2">You Receive</label>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img
                src={token.image}
                alt={token.name}
                className="w-8 h-8 rounded-full"
              />
              <span className="text-white text-lg font-medium">
                {amount ? (parseFloat(amount) * 124521).toFixed(2) : '0'}
              </span>
            </div>
            <span className="text-[#94A3B8] font-semibold text-sm">{token.ticker}</span>
          </div>
        </div>

        {/* Enter Button */}
        <button
          className="w-full h-12 rounded-xl font-semibold text-white text-base transition-all duration-200 hover:scale-[1.02] active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          }}
        >
          ⚡ Enter
        </button>
      </section>

      {/* Price Chart */}
      <section
        className="rounded-2xl p-4"
        style={{
          background: '#0F1629',
          border: '1px solid #1E2A4A',
        }}
      >
        <h3 className="text-white font-semibold mb-4">📊 Price Chart</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 0.002', 'dataMax + 0.002']}
                tickFormatter={(v) => v.toFixed(3)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#priceGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: '#3B82F6',
                  stroke: '#080B14',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Last Trades */}
      <section
        className="rounded-2xl p-4"
        style={{
          background: '#0F1629',
          border: '1px solid #1E2A4A',
        }}
      >
        <h3 className="text-white font-semibold mb-4">📋 Last Trades</h3>

        {/* Table Header */}
        <div className="flex items-center mb-3 text-xs text-[#64748B]" style={{ paddingRight: 4 }}>
          <span className="w-12">Time</span>
          <span className="w-14">Type</span>
          <span className="flex-1 text-right">Amount</span>
          <span className="w-28 text-right">TON</span>
        </div>

        {/* Table Rows */}
        <div className="space-y-0">
          {lastTrades.map((trade, i) => (
            <div
              key={i}
              className="flex items-center py-2.5 text-sm"
              style={{
                borderBottom: i < lastTrades.length - 1 ? '1px solid #1E2A4A' : 'none',
              }}
            >
              <span className="w-12 text-[#94A3B8]">{trade.time}</span>
              <span className="w-14 font-semibold" style={{ color: trade.type === 'BUY' ? '#22C55E' : '#EF4444' }}>
                {trade.type}
              </span>
              <span className="flex-1 text-right text-white">{trade.amount}</span>
              <span className="w-28 text-right font-mono text-xs text-white">{trade.price}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
