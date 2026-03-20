import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function LoginForm({ onForgotPassword, onSuccess }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signIn(email.trim(), password);
      
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
          <Mail size={12} /> Email
        </label>
        <input
          type="email"
          value={email}
          onChange={e => { setEmail(e.target.value); setError(''); }}
          placeholder="you@example.com"
          disabled={loading}
          autoComplete="email"
          className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50"
        />
      </div>

      {/* Password */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
          <Lock size={12} /> Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(''); }}
            placeholder="Enter your password"
            disabled={loading}
            autoComplete="current-password"
            className="w-full px-4 py-3 pr-12 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-stone-500 hover:text-stone-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Forgot Password Link */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Forgot password?
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
          <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-400 leading-relaxed">{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            Sign In
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </form>
  );
}
