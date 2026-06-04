import { useState } from 'react';
import { Home, Plus, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import TonWalletModal from './TonWalletModal';

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [walletOpen, setWalletOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center justify-between px-3"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderBottom: '1px solid #1e293b',
        }}
      >
        {/* Left: Home + Logo */}
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-[#1e293b]"
          >
            <Home size={20} className="text-[#94A3B8]" />
          </Link>
          <Link to="/" className="flex items-center gap-1.5">
            <span className="text-lg font-extrabold tracking-tight rainbow-text">pumpfun.wtf</span>
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Search Toggle */}
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-[#1e293b]"
          >
            {searchOpen ? (
              <X size={18} className="text-[#94A3B8]" />
            ) : (
              <Search size={18} className="text-[#94A3B8]" />
            )}
          </button>

          {/* Create */}
          <Link
            to="/launch"
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-[#1e293b]"
          >
            <Plus size={20} className="text-[#94A3B8]" />
          </Link>

          {/* Connect Wallet */}
          <button
            onClick={() => setWalletOpen(true)}
            className="h-9 px-4 rounded-xl font-semibold text-xs transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: '#FFFFFF',
              boxShadow: '0 2px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            Connect
          </button>
        </div>
      </header>

      {/* Search Bar */}
      {searchOpen && (
        <div
          className="fixed top-14 left-0 right-0 z-40 px-3 py-2"
          style={{
            background: 'rgba(15, 23, 42, 0.98)',
            borderBottom: '1px solid #1e293b',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div className="max-w-lg mx-auto flex items-center gap-2">
            <div
              className="flex-1 flex items-center gap-2 px-3 h-10 rounded-xl"
              style={{ background: '#0d111e', border: '1px solid #1e293b' }}
            >
              <Search size={16} className="text-[#64748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder="Search by name / ticker / ID..."
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder-[#64748B]"
                autoFocus
              />
            </div>
          </div>
        </div>
      )}

      <TonWalletModal open={walletOpen} onClose={() => setWalletOpen(false)} />
    </>
  );
}
