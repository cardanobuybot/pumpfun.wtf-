import { useState } from 'react';
import { ShieldCheck, X } from 'lucide-react';
import type { OnchainToken } from '../contracts/launchpad';
import { analyzeToken, signalsToPrompt, type RugSignals, type Flag } from '../contracts/rugcheck';
import { cocoonChat, CocoonNotConfigured } from '../contracts/cocoon';

// Official Cocoon mark (downloaded from cocoon.org).
function CocoonLogo({ size = 22 }: { size?: number }) {
  return (
    <img
      src="/img/cocoon-logo.png"
      alt="Cocoon"
      width={size}
      height={size}
      className="object-contain flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

const RISK = {
  low: { label: 'LOW RISK', color: '#22C55E' },
  medium: { label: 'MEDIUM RISK', color: '#F59E0B' },
  high: { label: 'HIGH RISK', color: '#EF4444' },
} as const;

const FLAG_COLOR: Record<Flag['kind'], string> = {
  red: '#EF4444',
  warn: '#F59E0B',
  green: '#22C55E',
};

// Cocoon persona. English by default; mirrors the user's language on questions
// (ask in Russian → answer in Russian).
const SYSTEM =
  'You are a blunt, honest memecoin security analyst on the TON blockchain. ' +
  'Explain in plain human language, no fluff, no "not financial advice" disclaimers. ' +
  'Keep it to 2-4 short sentences. Call out concrete red flags (mint, liquidity, ' +
  'wallet concentration, shared funding / wallet overlap) and end with a clear verdict: ' +
  'LOW, MEDIUM or HIGH risk. Reply in English by default, but if the user writes in another ' +
  'language (e.g. Russian), reply in that same language.';

type ChatTurn = { role: 'user' | 'assistant'; text: string };

export default function RugCheck({ token, dev }: { token: OnchainToken; dev: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signals, setSignals] = useState<RugSignals | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);
  const [aiPending, setAiPending] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Follow-up Q&A — user can ask in any language; Cocoon mirrors it.
  const [chat, setChat] = useState<ChatTurn[]>([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  const run = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    setVerdict(null);
    setAiUnavailable(false);
    setChat([]);
    try {
      const s = await analyzeToken(token, dev);
      setSignals(s);
      setLoading(false);

      // Plain-language verdict from Cocoon (best-effort; chips already show).
      setAiPending(true);
      try {
        const text = await cocoonChat(
          SYSTEM,
          'Analyze this token for a rug setup based on these on-chain facts:\n\n' +
            signalsToPrompt(token, s),
        );
        setVerdict(text);
      } catch (e) {
        if (e instanceof CocoonNotConfigured) setAiUnavailable(true);
        else setVerdict(null);
      } finally {
        setAiPending(false);
      }
    } catch (e) {
      setLoading(false);
      setError('Analysis failed: ' + ((e as Error)?.message ?? 'unknown'));
    }
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || !signals || asking) return;
    setQuestion('');
    setChat((c) => [...c, { role: 'user', text: q }]);
    setAsking(true);
    try {
      const text = await cocoonChat(
        SYSTEM,
        `On-chain facts for ${token.symbol}:\n${signalsToPrompt(token, signals)}\n\nQuestion: ${q}`,
      );
      setChat((c) => [...c, { role: 'assistant', text }]);
    } catch (e) {
      const msg =
        e instanceof CocoonNotConfigured
          ? 'Cocoon AI is not configured yet.'
          : 'Cocoon was unreachable, try again.';
      setChat((c) => [...c, { role: 'assistant', text: msg }]);
    } finally {
      setAsking(false);
    }
  };

  const risk = signals ? RISK[signals.level] : null;

  return (
    <>
      <button
        onClick={run}
        className="w-full h-14 rounded-2xl flex items-center justify-center gap-2.5 font-bold text-white text-sm transition-all duration-200 hover:scale-[1.02]"
        style={{
          background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
          boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
        }}
      >
        <CocoonLogo size={22} />
        <span>Rug check with Cocoon AI</span>
        <ShieldCheck size={17} className="opacity-80" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
          style={{ background: 'rgba(2,6,18,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden max-h-[88vh] overflow-y-auto"
            style={{ background: '#0d111e', border: '1px solid #1e293b' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div
              className="flex items-center gap-2.5 px-4 py-3 sticky top-0"
              style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
            >
              <CocoonLogo size={22} />
              <div className="leading-tight">
                <p className="text-white font-bold text-sm">Cocoon AI · Rug check</p>
                <p className="text-white/70 text-[10px]">Private on-chain analysis for {token.symbol}</p>
              </div>
              <button onClick={() => setOpen(false)} className="ml-auto text-white/80 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {loading && (
                <p className="text-center text-[#94A3B8] py-8 text-sm">Reading the chain…</p>
              )}
              {error && <p className="text-center text-[#EF4444] py-6 text-sm">{error}</p>}

              {signals && !loading && (
                <>
                  {/* risk badge */}
                  <div className="flex items-center gap-3">
                    <div
                      className="px-3 py-1.5 rounded-lg font-extrabold text-sm"
                      style={{ background: `${risk!.color}22`, color: risk!.color }}
                    >
                      {risk!.label}
                    </div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1e293b' }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${signals.score}%`, background: risk!.color }}
                      />
                    </div>
                    <span className="text-xs font-bold" style={{ color: risk!.color }}>
                      {signals.score}/100
                    </span>
                  </div>

                  {/* AI verdict */}
                  <div className="rounded-xl p-3" style={{ background: '#0A0E1A', border: '1px solid #1e293b' }}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <CocoonLogo size={14} />
                      <span className="text-[11px] font-semibold text-[#94A3B8]">Cocoon verdict</span>
                    </div>
                    {aiPending && <p className="text-sm text-[#64748B]">Cocoon is thinking…</p>}
                    {!aiPending && verdict && (
                      <p className="text-sm text-[#E2E8F0] leading-relaxed whitespace-pre-line">{verdict}</p>
                    )}
                    {!aiPending && !verdict && aiUnavailable && (
                      <p className="text-xs text-[#64748B]">
                        Cocoon AI is not configured yet — showing the on-chain signals below. (Add the
                        tonconsole key to enable the plain-language verdict.)
                      </p>
                    )}
                    {!aiPending && !verdict && !aiUnavailable && (
                      <p className="text-xs text-[#64748B]">Cocoon was unreachable — see the signals below.</p>
                    )}
                  </div>

                  {/* signal chips */}
                  <div className="space-y-1.5">
                    {signals.flags.map((f, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span
                          className="mt-1.5 w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: FLAG_COLOR[f.kind] }}
                        />
                        <span className="text-[#CBD5E1]">{f.text}</span>
                      </div>
                    ))}
                  </div>

                  {/* Follow-up Q&A — ask in any language, Cocoon mirrors it */}
                  <div className="pt-1 space-y-2">
                    {chat.map((m, i) => (
                      <div
                        key={i}
                        className={`text-sm ${m.role === 'user' ? 'text-right' : ''}`}
                      >
                        <span
                          className="inline-block rounded-xl px-3 py-1.5 max-w-[85%] text-left whitespace-pre-line"
                          style={
                            m.role === 'user'
                              ? { background: '#1e293b', color: '#E2E8F0' }
                              : { background: '#0A0E1A', color: '#E2E8F0', border: '1px solid #1e293b' }
                          }
                        >
                          {m.text}
                        </span>
                      </div>
                    ))}
                    {asking && <p className="text-xs text-[#64748B]">Cocoon is thinking…</p>}
                    <div className="flex items-center gap-2">
                      <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && ask()}
                        placeholder="Ask Cocoon about this token…"
                        className="flex-1 h-10 rounded-xl px-3 bg-transparent text-white text-sm outline-none min-w-0"
                        style={{ background: '#0A0E1A', border: '1px solid #1e293b' }}
                      />
                      <button
                        onClick={ask}
                        disabled={asking || !question.trim()}
                        className="h-10 px-4 rounded-xl font-semibold text-white text-sm flex-shrink-0 disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
                      >
                        Ask
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-[#475569] leading-relaxed">
                    Heuristic on-chain analysis, not financial advice. Always do your own research.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
