import { useState } from 'react';
import { X, Key, Hash, LogOut, Shield } from 'lucide-react';
import { getConfig, saveConfig, clearConfig } from '../utils/config';

export default function SettingsModal({ onClose, onSave, onLogout }) {
  const config = getConfig() || {};
  const [apiKey, setApiKey] = useState(config.apiKey || '');
  const [userId, setUserId] = useState(String(config.userId || ''));
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  function handleSave() {
    saveConfig({ apiKey, userId: parseInt(userId) || 0, userName: config.userName });
    onSave();
  }

  function handleLogout() {
    clearConfig();
    onLogout();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="glass-card w-full max-w-md p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl text-stone-100">Settings</h2>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Account Info */}
        {config.userName && (
          <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl mb-5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-sm font-medium text-emerald-400">
              {config.userName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-stone-200 truncate">{config.userName}</p>
              <p className="text-[10px] text-stone-500 font-mono">ID: {config.userId}</p>
            </div>
          </div>
        )}

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
              placeholder="Auto-detected from API key"
              className="w-full px-3 py-2.5 bg-stone-800/80 border border-stone-700/50 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all font-mono"
            />
          </div>
        </div>

        {/* Privacy info */}
        <div className="mt-5 flex items-start gap-2 p-3 bg-stone-800/30 border border-stone-800/40 rounded-lg">
          <Shield size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Credentials are stored in your browser only. API calls go directly to Splitwise via our dev proxy. Nothing is stored on any external server.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between">
          {/* Logout */}
          {!showConfirmLogout ? (
            <button
              onClick={() => setShowConfirmLogout(true)}
              className="flex items-center gap-1.5 text-xs text-red-400/70 hover:text-red-400 transition-colors"
            >
              <LogOut size={13} /> Sign Out
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-400">Sure?</span>
              <button onClick={handleLogout} className="text-xs text-red-400 font-medium hover:underline">Yes</button>
              <button onClick={() => setShowConfirmLogout(false)} className="text-xs text-stone-500 hover:underline">No</button>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors">
              Cancel
            </button>
            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm rounded-lg transition-colors font-medium">
              Save & Reload
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
