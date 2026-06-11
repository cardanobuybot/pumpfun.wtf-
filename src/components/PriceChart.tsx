import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
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

export default function PriceChart({ trades, currentPrice }: Props) {
  const [iv, setIv] = useState<Interval>(INTERVALS[1]); // 5m default
  const { candles, vols } = useMemo(
    () => aggregate(trades, currentPrice, iv.seconds),
    [trades, currentPrice, iv],
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // create chart once
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

    chartRef.current = chart;
    candleRef.current = candle;
    volRef.current = vol;
    return () => {
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volRef.current = null;
    };
  }, []);

  // push data whenever candles change
  useEffect(() => {
    const candle = candleRef.current;
    const vol = volRef.current;
    const chart = chartRef.current;
    if (!candle || !vol || !chart) return;
    if (candles.length) {
      // prices are tiny (~1e-8 TON/token); derive a minMove of ~2 sig figs so
      // the axis doesn't collapse every value to 0.00, and label exponentially.
      const minLow = Math.min(...candles.map((c) => c.low));
      const minMove =
        minLow > 0 ? Math.pow(10, Math.floor(Math.log10(minLow)) - 1) : 1e-8;
      candle.applyOptions({
        priceFormat: { type: 'custom', minMove, formatter: (p: number) => p.toExponential(2) },
      });
    }
    candle.setData(candles);
    vol.setData(vols);
    chart.timeScale().fitContent();
  }, [candles, vols]);

  return (
    <div>
      <div className="flex justify-end gap-1 mb-2">
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
      <div className="relative h-64">
        <div ref={containerRef} className="absolute inset-0" />
        {candles.length < 2 && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-[#64748B] pointer-events-none">
            Not enough trades to chart yet.
          </div>
        )}
      </div>
    </div>
  );
}
