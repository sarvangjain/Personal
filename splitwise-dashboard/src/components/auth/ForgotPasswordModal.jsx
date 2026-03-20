import { useState } from 'react';
import { Mail, ArrowLeft, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function ForgotPasswordModal({ onClose, onBack }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await sendPasswordReset(email.trim());
      
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          /* Success State */
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display text-xl text-stone-100 mb-2">Check your email</h2>
            <p className="text-sm text-stone-400 mb-6">
              We've sent a password reset link to <span className="text-stone-200">{email}</span>
            </p>
            <button
              onClick={onBack}
              className="w-full py-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Back to Sign In
            </button>
          </div>
        ) : (
          /* Form State */
          <>
            <div className="mb-6">
              <h2 className="font-display text-xl text-stone-100 mb-1">Reset password</h2>
              <p className="text-sm text-stone-500">
                Enter your email and we'll send you a link to reset your password.
              </p>
            </div>

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
                  autoFocus
                  autoComplete="email"
                  className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/50 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/10 transition-all disabled:opacity-50"
                />
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
                disabled={loading || !email.trim()}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 disabled:text-stone-500 text-white text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/15 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>

              {/* Back link */}
              <button
                type="button"
                onClick={onBack}
                className="w-full py-2 text-sm text-stone-400 hover:text-stone-200 transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft size={14} />
                Back to Sign In
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
