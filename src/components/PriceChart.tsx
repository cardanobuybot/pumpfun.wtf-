import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineType,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import type { Trade } from '../contracts/launchpad';

type Props = {
  trades: Trade[];
  currentPrice: number;
};

// Two chart modes:
//   system  — our own price feed: every executed trade price (+ the live spot)
//             plotted as a stepped line. No bucketing, so it shows the exact
//             price the curve was at for each fill — more precise than candles.
//   candles — OHLC candlesticks binned by timeframe (the classic view).
type Mode = 'system' | 'candles';

type Interval = { label: string; seconds: number };
const INTERVALS: Interval[] = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '1h', seconds: 3600 },
];

type Candle = {
  time: UTCTimestamp;
  open: number;
  high: number;
  low: number;
  close: number;
};
type Vol = { time: UTCTimestamp; value: number; color: string };
type LinePoint = { time: UTCTimestamp; value: number };

// Bin executed on-chain trade prices into OHLC candles of `bucket` seconds.
// The live spot price is appended as a synthetic point at "now" so the most
// recent candle tracks the current curve price even with no fresh trade.
function aggregate(trades: Trade[], currentPrice: number, bucket: number) {
  const points = [...trades]
    .filter((t) => t.price > 0)
    .map((t) => ({ time: t.time, price: t.price, ton: t.tonAmount }))
    .sort((a, b) => a.time - b.time);
  if (currentPrice > 0) {
    points.push({ time: Math.floor(Date.now() / 1000), price: currentPrice, ton: 0 });
  }

  const candles: Candle[] = [];
  const vols: Vol[] = [];
  let cur: Candle | null = null;
  let curVol = 0;
  const flush = () => {
    if (!cur) return;
    candles.push(cur);
    vols.push({
      time: cur.time,
      value: curVol,
      color: cur.close >= cur.open ? '#22C55E55' : '#EF444455',
    });
  };
  for (const p of points) {
    const t = (Math.floor(p.time / bucket) * bucket) as UTCTimestamp;
    if (!cur || cur.time !== t) {
      flush();
      cur = { time: t, open: p.price, high: p.price, low: p.price, close: p.price };
      curVol = p.ton;
    } else {
      cur.high = Math.max(cur.high, p.price);
      cur.low = Math.min(cur.low, p.price);
      cur.close = p.price;
      curVol += p.ton;
    }
  }
  flush();
  return { candles, vols };
}

// Build the stepped-line series: one point per trade price, deduped by second
// (lightweight-charts needs strictly ascending unique timestamps), plus the
// live spot at "now". No aggregation — this is the exact-price "system" feed.
function buildLine(trades: Trade[], currentPrice: number): LinePoint[] {
  const byTime = new Map<number, number>();
  for (const t of [...trades].sort((a, b) => a.time - b.time)) {
    if (t.price > 0) byTime.set(t.time, t.price); // last fill in a given second wins
  }
  if (currentPrice > 0) byTime.set(Math.floor(Date.now() / 1000), currentPrice);
  return [...byTime.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }));
}

// Tiny prices (~1e-8 TON/token): derive a minMove of ~2 sig figs from the
// smallest value so the axis doesn't collapse to 0.00, and label exponentially.
function priceFormatFor(minVal: number) {
  const minMove = minVal > 0 ? Math.pow(10, Math.floor(Math.log10(minVal)) - 1) : 1e-8;
  return {
    type: 'custom' as const,
    minMove,
    formatter: (p: number) => p.toExponential(2),
  };
}

export default function PriceChart({ trades, currentPrice }: Props) {
  const [mode, setMode] = useState<Mode>('system'); // our precise feed by default
  const [iv, setIv] = useState<Interval>(INTERVALS[1]); // 5m default (candles)

  const { candles, vols } = useMemo(
    () => aggregate(trades, currentPrice, iv.seconds),
    [trades, currentPrice, iv],
  );
  const line = useMemo(() => buildLine(trades, currentPrice), [trades, currentPrice]);

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const lineRef = useRef<ISeriesApi<'Line'> | null>(null);

  // (re)create the chart + the series for the active mode
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#64748B',
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: 'rgba(30,42,74,0.25)' },
        horzLines: { color: 'rgba(30,42,74,0.25)' },
      },
      rightPriceScale: { borderColor: '#1E2A4A' },
      timeScale: { borderColor: '#1E2A4A', timeVisible: true, secondsVisible: false },
      crosshair: { mode: CrosshairMode.Normal },
    });
    chartRef.current = chart;

    if (mode === 'candles') {
      const candle = chart.addSeries(CandlestickSeries, {
        upColor: '#22C55E',
        downColor: '#EF4444',
        wickUpColor: '#22C55E',
        wickDownColor: '#EF4444',
        borderVisible: false,
      });
      const vol = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      });
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      candleRef.current = candle;
      volRef.current = vol;
    } else {
      const ln = chart.addSeries(LineSeries, {
        color: '#22d3ee',
        lineWidth: 2,
        lineType: LineType.WithSteps, // staircase: price holds flat until the next fill
        pointMarkersVisible: true,
        pointMarkersRadius: 2,
        lastValueVisible: true,
      });
      lineRef.current = ln;
    }

    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
      lineRef.current = null;
    };
  }, [mode]);

  // push data whenever it changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (mode === 'candles') {
      const candle = candleRef.current;
      const vol = volRef.current;
      if (!candle || !vol) return;
      if (candles.length) {
        candle.applyOptions({ priceFormat: priceFormatFor(Math.min(...candles.map((c) => c.low))) });
      }
      candle.setData(candles);
      vol.setData(vols);
    } else {
      const ln = lineRef.current;
      if (!ln) return;
      if (line.length) {
        ln.applyOptions({ priceFormat: priceFormatFor(Math.min(...line.map((p) => p.value))) });
      }
      ln.setData(line);
    }
    chart.timeScale().fitContent();
  }, [mode, candles, vols, line]);

  const points = mode === 'candles' ? candles.length : line.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        {/* chart-source toggle: our system feed vs classic candles */}
        <div className="flex gap-1">
          {([
            ['system', 'System'],
            ['candles', 'Candles'],
          ] as [Mode, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMode(key)}
              className="px-2.5 py-0.5 rounded-md text-xs font-medium transition-colors"
              style={{
                background: mode === key ? '#22d3ee' : 'transparent',
                color: mode === key ? '#0B1220' : '#64748B',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* timeframe only applies to the candle view */}
        {mode === 'candles' && (
          <div className="flex gap-1">
            {INTERVALS.map((i) => (
              <button
                key={i.label}
                onClick={() => setIv(i)}
                className="px-2 py-0.5 rounded-md text-xs font-medium transition-colors"
                style={{
                  background: iv.label === i.label ? '#1E2A4A' : 'transparent',
                  color: iv.label === i.label ? '#fff' : '#64748B',
                }}
              >
                {i.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative h-64">
        <div ref={containerRef} className="absolute inset-0" />
        {points < 2 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#64748B] pointer-events-none">
            Not enough trades to chart yet.
          </div>
        )}
      </div>
    </div>
  );
}
