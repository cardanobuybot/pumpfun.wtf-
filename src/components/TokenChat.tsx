import { useState, useEffect, useCallback, useRef } from 'react';
import { Send, RefreshCw, ExternalLink } from 'lucide-react';
import { toNano } from '@ton/core';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { fetchChatMessages, buildCommentPayload } from '../contracts/launchpad';
import type { ChatMessage } from '../contracts/launchpad';
import { CHAT_MSG_VALUE, tonscanBase } from '../contracts/config';

const MAX_LEN = 120;

function ago(unix: number): string {
  const s = Math.floor(Date.now() / 1000) - unix;
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

// Deterministic accent colour per sender so messages are easy to tell apart.
function colorFor(addr: string): string {
  let h = 0;
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 70%, 65%)`;
}

export default function TokenChat({ tokenAddress }: { tokenAddress: string }) {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const m = await fetchChatMessages(tokenAddress);
      // oldest → newest so the latest sits at the bottom, chat-style
      setMessages(m.slice().reverse());
    } catch {
      /* keep whatever we had */
    }
  }, [tokenAddress]);

  useEffect(() => {
    load();
    const h = setInterval(load, 15000);
    return () => clearInterval(h);
  }, [load]);

  // keep scrolled to the newest message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    if (!address) {
      tonConnectUI.openModal();
      return;
    }
    try {
      setSending(true);
      setStatus('Confirm in your wallet…');
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: tokenAddress,
            amount: toNano(CHAT_MSG_VALUE).toString(),
            payload: buildCommentPayload(body),
          },
        ],
      });
      setText('');
      setStatus('✅ Sent! It will appear in a few seconds…');
      setTimeout(() => {
        load();
        setStatus(null);
      }, 6000);
    } catch (err) {
      setStatus('Failed: ' + ((err as Error)?.message ?? String(err)));
    } finally {
      setSending(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white">Holder chat</h3>
        <button
          onClick={load}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1E2A4A]"
          title="Refresh"
        >
          <RefreshCw size={13} className="text-[#64748B]" />
        </button>
      </div>

      <div
        ref={listRef}
        className="space-y-2 mb-3 max-h-72 overflow-y-auto pr-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-center text-[#64748B] py-6">
            No messages yet. Say something to the holders!
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.hash}
              className="rounded-lg px-3 py-2"
              style={{ background: '#0A0E1A' }}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span
                  className="font-mono text-xs font-semibold"
                  style={{ color: colorFor(m.from) }}
                >
                  {m.from.slice(0, 4)}…{m.from.slice(-4)}
                </span>
                <a
                  href={`${tonscanBase}/transaction/${m.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto text-[10px] text-[#64748B] flex items-center gap-1 hover:text-[#94A3B8]"
                >
                  {ago(m.time)} ago <ExternalLink size={9} />
                </a>
              </div>
              <p className="text-sm text-[#E2E8F0] break-words whitespace-pre-wrap">{m.text}</p>
            </div>
          ))
        )}
      </div>

      {status && <p className="text-xs text-center text-[#94A3B8] mb-2">{status}</p>}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_LEN))}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={address ? 'Write a message…' : 'Connect wallet to chat'}
          className="flex-1 resize-none rounded-xl px-3 py-2 text-white text-sm outline-none"
          style={{ background: '#0A0E1A', border: '1px solid #1E2A4A', minWidth: 0 }}
        />
        <button
          onClick={send}
          disabled={sending || !text.trim()}
          className="h-10 w-10 flex-shrink-0 rounded-xl flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}
        >
          <Send size={16} />
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-[#64748B]">
        Messages are sent on-chain ({CHAT_MSG_VALUE} TON, refunded minus gas) · {text.length}/{MAX_LEN}
      </p>
    </div>
  );
}
