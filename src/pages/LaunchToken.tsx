import { useState, useRef } from 'react';
import { Upload, Globe, MessageCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Address, toNano } from '@ton/core';
import { useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import {
  buildCreateTokenPayload,
  predictTokenAddress,
} from '../contracts/launchpad';
import { FACTORY_ADDRESS, CREATE_TOKEN_VALUE } from '../contracts/config';
import { uploadImageToIPFS, ipfsConfigured } from '../contracts/ipfs';

export default function LaunchToken() {
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();
  const address = useTonAddress();
  const [image, setImage] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    ticker: '',
    description: '',
    imageUrl: '',
    website: '',
    telegram: '',
    discord: '',
    twitter: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chooseImage = () => {
    if (uploadedUrl) return uploadedUrl; // IPFS upload wins
    if (form.imageUrl.startsWith('http')) return form.imageUrl;
    if (image && image.length < 8000) return image; // small data URL only
    return `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(form.ticker || 'token')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      tonConnectUI.openModal();
      return;
    }
    if (!form.name.trim() || !form.ticker.trim()) {
      setStatus('Name and ticker are required.');
      return;
    }
    if (uploading) {
      setStatus('Image is still uploading — please wait a moment.');
      return;
    }
    setSubmitting(true);
    setStatus('Preparing transaction…');
    try {
      const meta = {
        name: form.name.trim(),
        symbol: form.ticker.trim(),
        description: form.description.trim(),
        image: chooseImage(),
      };
      const creator = Address.parse(address);
      const predicted = await predictTokenAddress(creator, meta);
      const payload = buildCreateTokenPayload(meta);

      setStatus('Confirm in your wallet…');
      await tonConnectUI.sendTransaction({
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: FACTORY_ADDRESS,
            amount: toNano(CREATE_TOKEN_VALUE).toString(),
            payload,
          },
        ],
      });

      setStatus('🎉 Token created! Opening it…');
      const friendly = predicted.toString({ testOnly: true, bounceable: true });
      setTimeout(() => navigate(`/token/${friendly}`), 4000);
    } catch (err) {
      setStatus('Failed: ' + ((err as Error)?.message ?? String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result as string);
    reader.readAsDataURL(file);

    setUploadedUrl(null);
    setUploadError(null);

    if (!ipfsConfigured) {
      setUploadError('Upload not configured — paste an image URL below instead.');
      return;
    }

    setUploading(true);
    uploadImageToIPFS(file)
      .then((url) => setUploadedUrl(url))
      .catch((err) => setUploadError((err as Error)?.message ?? 'Upload failed'))
      .finally(() => setUploading(false));
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const inputStyle = {
    background: '#0A0E1A',
    border: '1px solid #1E2A4A',
    color: '#FFFFFF',
  };

  const labelStyle = 'block text-sm font-medium text-white mb-2';

  return (
    <div className="py-5 pb-24">
      <h1 className="text-2xl font-bold text-white mb-6">🚀 Launch Token</h1>

      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Image Upload */}
        <div>
          <label className={labelStyle}>
            Image <span className="text-[#EF4444]">*</span>
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={handleImageClick}
            className="w-full h-48 rounded-2xl flex flex-col items-center justify-center gap-3 transition-colors hover:border-[#3B82F6]"
            style={{
              background: '#0A0E1A',
              border: '2px dashed #1E2A4A',
            }}
          >
            {image ? (
              <img
                src={image}
                alt="Token preview"
                className="w-full h-full object-contain rounded-2xl"
              />
            ) : (
              <>
                <Upload size={32} className="text-[#64748B]" />
                <span className="text-[#94A3B8] text-sm">Click to upload</span>
              </>
            )}
          </button>

          {/* Upload status */}
          {uploading && (
            <p className="text-xs mt-2 flex items-center gap-1.5 text-[#3B82F6]">
              <Loader2 size={13} className="animate-spin" /> Uploading to IPFS…
            </p>
          )}
          {uploadedUrl && !uploading && (
            <p className="text-xs mt-2 flex items-center gap-1.5 text-[#22C55E]">
              <CheckCircle2 size={13} /> Pinned to IPFS ✓
            </p>
          )}
          {uploadError && !uploading && (
            <p className="text-xs mt-2 text-[#F59E0B]">{uploadError}</p>
          )}

          <p className="text-xs text-[#64748B] mt-2">
            {ipfsConfigured
              ? 'Upload an image — it’s pinned to IPFS. Or paste a direct URL below.'
              : 'Paste a direct image URL below (file upload isn’t configured).'}
          </p>
          <input
            type="text"
            value={form.imageUrl}
            onChange={(e) => handleChange('imageUrl', e.target.value)}
            placeholder="https://.../image.png"
            className="w-full h-11 rounded-xl px-4 text-white text-sm outline-none transition-colors mt-2"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
          />
        </div>

        {/* Name */}
        <div>
          <label className={labelStyle}>
            Name <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter token name..."
            className="w-full h-12 rounded-xl px-4 text-white outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
          />
        </div>

        {/* Ticker */}
        <div>
          <label className={labelStyle}>
            Ticker <span className="text-[#EF4444]">*</span>
          </label>
          <input
            type="text"
            value={form.ticker}
            onChange={(e) => handleChange('ticker', e.target.value.toUpperCase())}
            placeholder="e.g. PEPE"
            className="w-full h-12 rounded-xl px-4 text-white outline-none transition-colors"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
          />
        </div>

        {/* Description */}
        <div>
          <label className={labelStyle}>
            Description <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Tell us about your token..."
            rows={4}
            className="w-full rounded-xl px-4 py-3 text-white outline-none transition-colors resize-none"
            style={inputStyle}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
          />
        </div>

        {/* Socials Section */}
        <div className="pt-2">
          <h3 className="text-white font-semibold text-sm mb-4 flex items-center gap-2">
            <Globe size={16} className="text-[#3B82F6]" />
            Social Links (optional)
          </h3>

          {/* Website */}
          <div className="mb-4">
            <label className="block text-xs text-[#94A3B8] mb-2">Website</label>
            <input
              type="text"
              value={form.website}
              onChange={(e) => handleChange('website', e.target.value)}
              placeholder="https://yourtoken.xyz"
              className="w-full h-11 rounded-xl px-4 text-white text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
            />
          </div>

          {/* X (Twitter) */}
          <div className="mb-4">
            <label className="block text-xs text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#64748B]">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              X (Twitter)
            </label>
            <input
              type="text"
              value={form.twitter}
              onChange={(e) => handleChange('twitter', e.target.value)}
              placeholder="https://x.com/yourtoken"
              className="w-full h-11 rounded-xl px-4 text-white text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
            />
          </div>

          {/* Telegram */}
          <div className="mb-4">
            <label className="block text-xs text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <MessageCircle size={12} className="text-[#64748B]" />
              Telegram
            </label>
            <input
              type="text"
              value={form.telegram}
              onChange={(e) => handleChange('telegram', e.target.value)}
              placeholder="https://t.me/yourtoken"
              className="w-full h-11 rounded-xl px-4 text-white text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
            />
          </div>

          {/* Discord */}
          <div className="mb-4">
            <label className="block text-xs text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-[#64748B]">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Discord
            </label>
            <input
              type="text"
              value={form.discord}
              onChange={(e) => handleChange('discord', e.target.value)}
              placeholder="https://discord.gg/yourtoken"
              className="w-full h-11 rounded-xl px-4 text-white text-sm outline-none transition-colors"
              style={inputStyle}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3B82F6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#1E2A4A'; }}
            />
          </div>
        </div>

        {/* Status */}
        {status && (
          <p className="text-sm text-center text-[#94A3B8]">{status}</p>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || uploading}
          className="w-full h-12 rounded-xl font-semibold text-white text-base transition-all duration-200 hover:scale-[1.02] mt-6 disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
            boxShadow: '0 4px 20px rgba(59, 130, 246, 0.3)',
          }}
        >
          {uploading
            ? 'Uploading image…'
            : submitting
              ? 'Creating…'
              : address
                ? '🚀 Create Token (0.1 TON)'
                : 'Connect wallet to launch'}
        </button>
      </form>
    </div>
  );
}
