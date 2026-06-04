import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Token } from '../data/tokens';

interface TokenCardProps {
  token: Token;
  isKing?: boolean;
}

function SocialIcon({ type, href }: { type: string; href: string }) {
  const iconClass = "w-3.5 h-3.5 text-[#64748B] hover:text-[#3B82F6] transition-colors";
  const icons: Record<string, React.ReactNode> = {
    website: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    ),
    twitter: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    discord: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
      </svg>
    ),
    telegram: (
      <svg className={iconClass} viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  };

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
      {icons[type]}
    </a>
  );
}

export default function TokenCard({ token, isKing = false }: TokenCardProps) {
  const navigate = useNavigate();
  const socials = token.socials;
  const hasSocials = socials && (socials.website || socials.twitter || socials.discord || socials.telegram);

  return (
    <div
      onClick={() => navigate(`/token/${token.id}`)}
      className="cursor-pointer rounded-xl overflow-hidden transition-all duration-200 hover:border-[#3B82F6]/40"
      style={{
        background: '#111827',
        border: isKing ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid #1e293b',
        boxShadow: isKing ? '0 0 20px rgba(59, 130, 246, 0.1)' : 'none',
      }}
    >
      {/* Main Info */}
      <div className="p-3">
        <div className="flex gap-2.5">
          {/* Small Image */}
          <img
            src={token.image}
            alt={token.name}
            className="w-11 h-11 rounded-lg flex-shrink-0 object-cover"
            style={{ background: '#1e293b' }}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Ticker + Name + Socials */}
            <div className="flex items-center gap-1.5 mb-0 flex-wrap">
              <span className="font-bold text-white text-sm">{token.ticker}</span>
              <span className="text-[#64748B] text-xs">{token.name}</span>
              {hasSocials && (
                <div className="flex items-center gap-1 ml-auto">
                  {socials?.website && <SocialIcon type="website" href={socials.website} />}
                  {socials?.twitter && <SocialIcon type="twitter" href={socials.twitter} />}
                  {socials?.discord && <SocialIcon type="discord" href={socials.discord} />}
                  {socials?.telegram && <SocialIcon type="telegram" href={socials.telegram} />}
                </div>
              )}
            </div>

            {/* ID + Copy */}
            <div className="flex items-center gap-1 mb-0.5">
              <span className="font-mono text-[11px]" style={{ color: '#8b5cf6' }}>{token.shortId}</span>
              <button
                onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(token.id); }}
                className="text-[#475569] hover:text-[#3B82F6] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>

            {/* Mcap */}
            <p className="text-xs font-bold" style={{ color: '#22d3ee' }}>
              Mcap: {token.marketCap}
            </p>

            {/* Description - 1 line only */}
            <p className="text-xs text-[#64748B] truncate leading-tight mt-0.5">{token.description}</p>
          </div>
        </div>
      </div>

      {/* Bottom: Progress + Stats */}
      <div className="px-3 pb-2.5" style={{ borderTop: '1px solid #1e293b' }}>
        <div className="flex items-center gap-2 mt-2">
          {/* Progress % */}
          <span className="text-xs font-bold flex-shrink-0" style={{ color: '#22d3ee' }}>{token.progress}%</span>

          {/* Progress bar */}
          <div className="flex-1 rounded-full overflow-hidden" style={{ height: 3, background: '#1e293b' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(token.progress, 100)}%`,
                background: 'linear-gradient(90deg, #22d3ee, #3B82F6)',
              }}
            />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-1 text-[10px] text-[#475569] flex-shrink-0">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>{token.timeAgo} · {token.txs} txs · {token.volume24h} vol</span>
          </div>
        </div>
      </div>
    </div>
  );
}
