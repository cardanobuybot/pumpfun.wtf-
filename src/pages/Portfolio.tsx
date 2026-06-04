import { Wallet } from 'lucide-react';

export default function Portfolio() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: '#1E2A4A' }}
      >
        <Wallet size={28} className="text-[#64748B]" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
      <p className="text-sm text-[#94A3B8] max-w-xs">
        Connect your TON wallet to view your portfolio and manage your tokens.
      </p>
    </div>
  );
}
