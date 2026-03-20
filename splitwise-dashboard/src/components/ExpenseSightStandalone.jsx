/**
 * ExpenseSightStandalone - Full screen ExpenseSight for Firebase-only users
 * This component wraps ExpenseSightApp for users who haven't connected Splitwise
 */

import { useState } from 'react';
import { ExpenseSightApp } from './ExpenseSight';
import { Settings, Key, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ExpenseSightStandalone({ userId }) {
  const { logout, currentUser } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [showConnectSplitwise, setShowConnectSplitwise] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-stone-950 relative">
      {/* ExpenseSight App - takes full screen, no close button since this is standalone */}
      <ExpenseSightApp 
        userId={userId} 
        onClose={null}
      />

      {/* Floating Account Settings Button */}
      <div className="fixed top-4 right-4 z-50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2.5 rounded-xl bg-stone-900/90 backdrop-blur-sm border border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors shadow-lg"
          >
            <User size={20} />
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-stone-900 border border-stone-800 rounded-xl shadow-xl z-50 overflow-hidden">
                {/* User info */}
                <div className="px-4 py-3 border-b border-stone-800">
                  <p className="text-sm font-medium text-stone-200 truncate">
                    {currentUser?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-stone-500 truncate">
                    {currentUser?.email}
                  </p>
                </div>
                
                {/* Connect Splitwise option */}
                <button
                  onClick={() => {
                    setShowMenu(false);
                    setShowConnectSplitwise(true);
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-stone-300 hover:bg-stone-800 transition-colors"
                >
                  <Key size={16} className="text-teal-400" />
                  <div className="text-left">
                    <p className="font-medium">Connect Splitwise</p>
                    <p className="text-[11px] text-stone-500">Unlock full dashboard</p>
                  </div>
                </button>
                
                {/* Logout */}
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 flex items-center gap-3 text-sm text-red-400 hover:bg-stone-800 transition-colors border-t border-stone-800"
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Connect Splitwise Modal */}
      {showConnectSplitwise && (
        <ConnectSplitwiseModal onClose={() => setShowConnectSplitwise(false)} />
      )}
    </div>
  );
}

function ConnectSplitwiseModal({ onClose }) {
  const { connectSplitwise } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await connectSplitwise(apiKey.trim());
      
      if (result.error) {
        setError(result.error);
      } else {
        window.location.reload();
      }
    } catch (err) {
      setError(err.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md glass-card p-6 animate-fade-in">
        <h2 className="font-display text-xl text-stone-100 mb-1">Connect Splitwise</h2>
        <p className="text-sm text-stone-500 mb-6">
          Add your Splitwise API key to unlock the full analytics dashboard.
        </p>

        <div className="mb-4">
          <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
            <Key size={12} /> API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => { setApiKey(e.target.value); setError(''); }}
            placeholder="Paste your Splitwise API key"
            disabled={loading}
            autoFocus
            className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono disabled:opacity-50"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConnect}
            disabled={loading || !apiKey.trim()}
            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </div>

        <p className="text-[10px] text-stone-600 mt-4 text-center">
          Get your API key from{' '}
          <a 
            href="https://secure.splitwise.com/apps/new" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-emerald-400 hover:underline"
          >
            secure.splitwise.com/apps/new
          </a>
        </p>
      </div>
    </div>
  );
}
