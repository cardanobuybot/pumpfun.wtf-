import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TokenCard from '../components/TokenCard';
import ProgressBar from '../components/ProgressBar';
import { kingOfHillToken, tokenFeed } from '../data/tokens';

const filterTabs = [
  { key: 'lastBump', label: 'Last Bump', emoji: '🔥', color: '#3B82F6' },
  { key: 'new', label: 'New', emoji: '✨', color: '#8b5cf6' },
  { key: 'mcap', label: 'Mcap', emoji: '📊', color: '#22d3ee' },
  { key: 'complete', label: 'Complete', emoji: '✅', color: '#22C55E' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState('lastBump');
  const navigate = useNavigate();
  const token = kingOfHillToken;
  const socials = token.socials;
  const hasSocials = socials && (socials.website || socials.twitter || socials.discord || socials.telegram);

  return (
    <div className="space-y-3 py-3">
      {/* King of the Hill - BIGGER & BLUER */}
      <section>
        <h2 className="text-center text-lg font-black tracking-wider mb-2 text-white">
          👑 KING OF THE HILL
        </h2>

        <div
          className="rounded-xl overflow-hidden cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #1e4a8a 0%, #1a3a7a 30%, #163060 60%, #111827 100%)',
            border: '2.5px solid #3B82F6',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.5), 0 0 80px rgba(59, 130, 246, 0.25), inset 0 0 40px rgba(59, 130, 246, 0.08)',
          }}
        >
          {/* Top Info */}
          <div className="p-4">
            <div className="flex gap-4">
              {/* Bigger Image */}
              <img
                src={token.image}
                alt={token.name}
                className="w-16 h-16 rounded-xl flex-shrink-0 object-cover"
                style={{ background: '#1e293b', boxShadow: '0 4px 16px rgba(0,0,0,0.4)' }}
              />

              <div className="flex-1 min-w-0">
                {/* Ticker + Name + Socials */}
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-bold text-white text-lg">{token.ticker}</span>
                  <span className="text-[#94A3B8] text-sm">{token.name}</span>
                  {hasSocials && (
                    <div className="flex items-center gap-2 ml-auto">
                      {socials?.website && (
                        <a href={socials.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="text-[#94A3B8] hover:text-white transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                        </a>
                      )}
                      {socials?.twitter && (
                        <a href={socials.twitter} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="text-[#94A3B8] hover:text-white transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                        </a>
                      )}
                      {socials?.discord && (
                        <a href={socials.discord} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                          className="text-[#94A3B8] hover:text-white transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* ID */}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="font-mono text-sm" style={{ color: '#8b5cf6' }}>{token.shortId}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(token.id); }}
                    className="text-[#475569] hover:text-[#3B82F6] transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>

                {/* Description - 2 lines */}
                <p className="text-sm text-[#94A3B8] leading-relaxed line-clamp-2">{token.description}</p>

                {/* Mcap */}
                <p className="text-sm font-bold mt-1.5" style={{ color: '#22d3ee' }}>Mcap: {token.marketCap}</p>
              </div>
            </div>
          </div>

          {/* Bottom: Progress + Stats */}
          <div className="px-4 pb-4" style={{ borderTop: '1px solid rgba(59, 130, 246, 0.25)' }}>
            {/* Progress Bar */}
            <div className="mt-3">
              <ProgressBar value={token.progress} label="Bonding Curve" />
            </div>

            {/* King of the Hill Progress */}
            <div className="mt-2">
              <ProgressBar value={token.kingOfHillProgress} variant="yellow" label="King Of The Hill Progress" />
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between mt-3 text-xs text-[#94A3B8]">
              <span>{token.timeAgo}</span>
              <span>{token.txs} txs</span>
              <span>{token.volume24h} Vol 24h</span>
            </div>
          </div>
        </div>
      </section>

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

      {/* Filter Tabs */}
      <section className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {filterTabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-1.5 px-4 h-9 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 flex-shrink-0"
              style={{
                background: isActive ? tab.color : '#111827',
                color: isActive ? '#FFFFFF' : '#64748B',
                border: isActive ? 'none' : '1px solid #1e293b',
                boxShadow: isActive ? `0 4px 16px ${tab.color}40` : 'none',
              }}
            >
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          );
        })}
      </section>

      {/* Token Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
        {tokenFeed.map((token) => (
          <TokenCard key={token.id} token={token} />
        ))}
      </section>
    </div>
  );
}
