import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Trade } from '../contracts/launchpad';

type Props = {
  trades: Trade[];
  currentPrice: number;
};

function fmtTime(unix: number): string {
  return new Date(unix * 1000).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PriceChart({ trades, currentPrice }: Props) {
  // chronological executed-price points, plus the live spot price at the end
  const data = useMemo(() => {
    const points = [...trades]
      .filter((t) => t.price > 0)
      .reverse()
      .map((t) => ({ time: t.time, price: t.price, label: fmtTime(t.time) }));
    if (currentPrice > 0) {
      points.push({ time: Math.floor(Date.now() / 1000), price: currentPrice, label: 'now' });
    }
    return points;
  }, [trades, currentPrice]);

  if (data.length < 2) {
    return (
      <div className="h-40 flex items-center justify-center text-sm text-[#64748B]">
        Not enough trades to chart yet.
      </div>
    );
  }

  const up = data[data.length - 1].price >= data[0].price;
  const stroke = up ? '#22C55E' : '#EF4444';

  return (
    <div className="h-48 -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
          />
          <YAxis
            dataKey="price"
            tick={{ fill: '#64748B', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={56}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => v.toExponential(1)}
          />
          <Tooltip
            contentStyle={{
              background: '#0A0E1A',
              border: '1px solid #1E2A4A',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: '#94A3B8' }}
            formatter={(v: number) => [`${v.toExponential(3)} TON`, 'Price']}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={2}
            fill="url(#priceFill)"
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
