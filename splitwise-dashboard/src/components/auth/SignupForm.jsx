import { useState } from 'react';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function SignupForm({ onSuccess }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordRequirements = [
    { met: password.length >= 6, label: 'At least 6 characters' },
  ];

  const allRequirementsMet = passwordRequirements.every(r => r.met);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!allRequirementsMet) {
      setError('Password does not meet requirements');
      return;
    }
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await signUp(email.trim(), password);
      
      if (result.error) {
        setError(result.error);
      } else {
        onSuccess?.();
      }
    } catch (err) {
      setError(err.message || 'Failed to create account');
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
            placeholder="Create a password"
            disabled={loading}
            autoComplete="new-password"
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
        
        {/* Password requirements */}
        {password.length > 0 && (
          <div className="mt-2 space-y-1">
            {passwordRequirements.map((req, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {req.met ? (
                  <CheckCircle2 size={12} className="text-emerald-400" />
                ) : (
                  <div className="w-3 h-3 rounded-full border border-stone-600" />
                )}
                <span className={req.met ? 'text-emerald-400' : 'text-stone-500'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Password */}
      <div>
        <label className="flex items-center gap-2 text-xs font-medium text-stone-400 mb-2">
          <Lock size={12} /> Confirm Password
        </label>
        <input
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={e => { setConfirmPassword(e.target.value); setError(''); }}
          placeholder="Confirm your password"
          disabled={loading}
          autoComplete="new-password"
          className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50"
        />
        {confirmPassword.length > 0 && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            {passwordsMatch ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-400" />
                <span className="text-emerald-400">Passwords match</span>
              </>
            ) : (
              <>
                <AlertCircle size={12} className="text-amber-400" />
                <span className="text-amber-400">Passwords do not match</span>
              </>
            )}
          </div>
        )}
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
        disabled={loading || !email.trim() || !allRequirementsMet || !passwordsMatch}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 disabled:shadow-none"
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating account...
          </>
        ) : (
          <>
            Create Account
            <ArrowRight size={16} />
          </>
        )}
      </button>

      {/* Terms */}
      <p className="text-[10px] text-stone-600 text-center leading-relaxed">
        By creating an account, you agree to our Terms of Service and Privacy Policy.
      </p>
    </form>
  );
}
