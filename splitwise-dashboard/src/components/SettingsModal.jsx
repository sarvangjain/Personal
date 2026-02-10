import { useState } from 'react';
import { X, Key, Hash, Globe } from 'lucide-react';

export default function SettingsModal({ onClose, onSave }) {
  const [apiKey, setApiKey] = useState(import.meta.env.VITE_SPLITWISE_API_KEY || '');
  const [userId, setUserId] = useState(import.meta.env.VITE_SPLITWISE_USER_ID || '');
  const [baseUrl, setBaseUrl] = useState(import.meta.env.VITE_SPLITWISE_BASE_URL || 'https://secure.splitwise.com/api/v3.0');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full max-w-md mx-4 p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-stone-100">Configuration</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Key size={12} /> API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="Your Splitwise API key"
              className="w-full px-3 py-2.5 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Hash size={12} /> User ID
            </label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="Your Splitwise user ID"
              className="w-full px-3 py-2.5 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-1.5">
              <Globe size={12} /> Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={e => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>
        </div>

        <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/10 rounded-lg">
          <p className="text-xs text-amber-400/80 leading-relaxed">
            These values are stored in <code className="font-mono bg-stone-800/50 px-1 py-0.5 rounded">.env</code> file.
            Update the file and restart the dev server for changes to persist.
          </p>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors font-medium"
          >
            Save & Reload
          </button>
        </div>
      </div>
    </div>
  );
}
