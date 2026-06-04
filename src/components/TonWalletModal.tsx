import { X, QrCode, ChevronRight } from 'lucide-react';

interface TonWalletModalProps {
  open: boolean;
  onClose: () => void;
}

const wallets = [
  {
    name: 'Tonkeeper',
    description: 'Mobile & Desktop',
    color: '#45AEF5',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#45AEF5" />
        <path d="M8 12L16 8L24 12V20L16 24L8 20V12Z" fill="white" />
      </svg>
    ),
  },
  {
    name: 'MyTonWallet',
    description: 'Browser Extension',
    color: '#FF6B35',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#FF6B35" />
        <circle cx="16" cy="16" r="6" fill="white" />
      </svg>
    ),
  },
  {
    name: 'OpenMask',
    description: 'Browser Extension',
    color: '#FF5C5C',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#FF5C5C" />
        <rect x="10" y="12" width="12" height="8" rx="2" fill="white" />
      </svg>
    ),
  },
  {
    name: 'Tonhub',
    description: 'Mobile Wallet',
    color: '#22C55E',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#22C55E" />
        <path d="M10 16H22M16 10V22" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    name: 'DeWallet',
    description: 'Mobile Wallet',
    color: '#8B5CF6',
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <rect width="32" height="32" rx="8" fill="#8B5CF6" />
        <circle cx="16" cy="14" r="4" fill="white" />
        <path d="M10 24C10 20.686 12.686 18 16 18C19.314 18 22 20.686 22 24" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function TonWalletModal({ open, onClose }: TonWalletModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full sm:w-[400px] sm:rounded-2xl rounded-t-2xl overflow-hidden"
        style={{
          background: '#0F1629',
          border: '1px solid #1E2A4A',
          maxHeight: '85vh',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #1E2A4A' }}>
          <h3 className="text-white font-semibold text-lg">Connect TON Wallet</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-[#1E2A4A]"
          >
            <X size={18} className="text-[#64748B]" />
          </button>
        </div>

        {/* Wallet List */}
        <div className="px-3 py-2 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 140px)' }}>
          {wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => {/* In real app: initiate TON Connect */}}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-[#141D35] group text-left"
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0">
                {wallet.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">{wallet.name}</p>
                <p className="text-[#64748B] text-xs">{wallet.description}</p>
              </div>
              <ChevronRight size={16} className="text-[#64748B] group-hover:text-[#94A3B8] transition-colors" />
            </button>
          ))}

          {/* QR Code Option */}
          <button
            onClick={() => {/* In real app: show QR */}}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 hover:bg-[#141D35] group text-left mt-1"
            style={{ borderTop: '1px solid #1E2A4A' }}
          >
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: '#1E2A4A' }}
            >
              <QrCode size={18} className="text-[#94A3B8]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Connect via QR</p>
              <p className="text-[#64748B] text-xs">Scan with your wallet app</p>
            </div>
            <ChevronRight size={16} className="text-[#64748B] group-hover:text-[#94A3B8] transition-colors" />
          </button>
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 text-center"
          style={{ borderTop: '1px solid #1E2A4A' }}
        >
          <p className="text-[#64748B] text-xs">
            Powered by{' '}
            <span className="text-[#3B82F6] font-medium">TON Connect</span>
          </p>
        </div>
      </div>
    </div>
  );
}
