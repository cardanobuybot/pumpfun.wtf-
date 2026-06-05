import { Home, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';

export default function Header() {
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();
  const shortAddress = address ? `${address.slice(0, 4)}…${address.slice(-4)}` : '';

  const handleWallet = () => {
    if (address) {
      tonConnectUI.disconnect();
    } else {
      tonConnectUI.openModal();
    }
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
          {/* Create */}
          <Link
            to="/launch"
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-colors hover:bg-[#1e293b]"
          >
            <Plus size={20} className="text-[#94A3B8]" />
          </Link>

          {/* Connect Wallet */}
          <button
            onClick={handleWallet}
            className="h-9 px-4 rounded-xl font-semibold text-xs transition-all duration-200 hover:scale-[1.03]"
            style={{
              background: address
                ? 'linear-gradient(135deg, #22C55E, #16A34A)'
                : 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: '#FFFFFF',
              boxShadow: '0 2px 12px rgba(59, 130, 246, 0.3)',
            }}
          >
            {address ? shortAddress : 'Connect'}
          </button>
        </div>
      </header>
    </>
  );
}
