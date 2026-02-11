import { useState } from 'react';
import { Wallet, Key, ArrowRight, Loader2, ExternalLink, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import { getCurrentUser } from '../api/splitwise';
import { saveConfig, clearConfig } from '../utils/config';
import { createOrUpdateUser } from '../firebase/userService';

export default function SetupPage({ onComplete }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1); // 1 = enter key, 2 = verifying, 3 = success

  async function handleConnect() {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    setError('');
    setLoading(true);
    setStep(2);

    // Temporarily save so the API client can pick it up
    saveConfig({ apiKey: apiKey.trim(), userId: 0 });

    try {
      const user = await getCurrentUser();
      if (!user || !user.id) throw new Error('Could not retrieve user data');

      saveConfig({
        apiKey: apiKey.trim(),
        userId: user.id,
        userName: `${user.first_name} ${user.last_name || ''}`.trim(),
      });

      // Track user in Firebase (non-blocking)
      createOrUpdateUser(user).catch(() => {});

      setStep(3);
      setTimeout(() => onComplete(), 1000);
    } catch (err) {
      clearConfig();
      setError(err.message || 'Connection failed. Check your API key.');
      setStep(1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
            <Wallet size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-stone-100">SplitSight</h1>
          <p className="text-stone-500 text-sm mt-2">Splitwise Analytics Dashboard</p>
        </div>

        {/* Success State */}
        {step === 3 && (
          <div className="glass-card p-8 text-center animate-slide-up">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display text-xl text-stone-100">Connected!</h2>
            <p className="text-sm text-stone-400 mt-2">Loading your dashboard...</p>
          </div>
        )}

        {/* Main Card */}
        {step !== 3 && (
          <div className="glass-card p-6 sm:p-8 animate-fade-in">
            <h2 className="font-display text-xl text-stone-100 mb-1">Connect your account</h2>
            <p className="text-sm text-stone-500 mb-6">
              Enter your Splitwise API key to get started. Your data stays in your browser.
            </p>

            {/* API Key Input */}
            <div className="mb-4">
              <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
                <Key size={12} /> API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleConnect()}
                placeholder="Paste your API key here"
                disabled={loading}
                autoFocus
                className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono disabled:opacity-50"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl mb-4">
                <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-400 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Connect Button */}
            <button
              onClick={handleConnect}
              disabled={loading || !apiKey.trim()}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 disabled:shadow-none"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  Connect Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {/* Help Section */}
            <div className="mt-6 p-4 bg-stone-800/30 rounded-xl border border-stone-800/40">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-stone-300 mb-3">
                <HelpCircle size={12} /> How to get your API key
              </h3>
              <ol className="space-y-2 text-xs text-stone-500 leading-relaxed">
                <li className="flex gap-2">
                  <span className="text-emerald-400/70 font-mono flex-shrink-0">1.</span>
                  <a href="https://secure.splitwise.com/apps/new" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center gap-1">
                    Register a new Splitwise App <ExternalLink size={10} />
                  </a>
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400/70 font-mono flex-shrink-0">2.</span>
                  Copy the API Key from the app details page
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-400/70 font-mono flex-shrink-0">3.</span>
                  Paste it above — we'll auto-detect your account
                </li>
              </ol>
            </div>

            {/* Privacy note */}
            <p className="text-[10px] text-stone-600 mt-4 text-center leading-relaxed">
              Your API key is stored only in your browser's local storage.
              It is never sent to any server other than Splitwise.
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-8 text-center">
          <p className="text-sm sm:text-xs text-stone-600">
            Vibe Coded with <span className="text-red-400">{' '}❤️{' '}</span> by{' '}
            <a 
              href="https://www.linkedin.com/in/sarvangjain/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Sarvang Jain
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
