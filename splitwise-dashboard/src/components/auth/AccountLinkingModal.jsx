import { useState } from 'react';
import { X, Link2, AlertCircle, CheckCircle2, Loader2, ArrowRight, Database } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { migrateExpenseSightData } from '../../firebase/expenseSightService';
import { linkSplitwiseAccount } from '../../firebase/userService';

/**
 * AccountLinkingModal - Allows users to link existing Splitwise data to their Firebase account
 * Shown when a Firebase Auth user connects their Splitwise account
 */
export default function AccountLinkingModal({ 
  isOpen, 
  onClose, 
  splitwiseUserId,
  firebaseUid,
  onLinkComplete 
}) {
  const [step, setStep] = useState('confirm'); // 'confirm' | 'migrating' | 'success' | 'error'
  const [error, setError] = useState('');
  const [migratedCount, setMigratedCount] = useState(0);

  if (!isOpen) return null;

  async function handleLink() {
    setStep('migrating');
    setError('');

    try {
      // Step 1: Migrate ExpenseSight data from Splitwise ID to Firebase UID
      const migrationResult = await migrateExpenseSightData(
        String(splitwiseUserId),
        firebaseUid
      );

      if (!migrationResult.success) {
        throw new Error(migrationResult.error || 'Failed to migrate data');
      }

      setMigratedCount(migrationResult.migratedCount || 0);

      // Step 2: Link the accounts in the user profile
      const linkResult = await linkSplitwiseAccount(firebaseUid, splitwiseUserId);

      if (!linkResult.success) {
        throw new Error(linkResult.error || 'Failed to link accounts');
      }

      setStep('success');
    } catch (err) {
      console.error('Account linking error:', err);
      setError(err.message || 'An error occurred during linking');
      setStep('error');
    }
  }

  function handleComplete() {
    onLinkComplete?.();
    onClose();
  }

  function handleSkip() {
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md glass-card p-6 sm:p-8 animate-fade-in">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-stone-500 hover:text-stone-300 transition-colors"
        >
          <X size={20} />
        </button>

        {/* Confirm Step */}
        {step === 'confirm' && (
          <>
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-full bg-teal-500/15 flex items-center justify-center mx-auto mb-4">
                <Link2 size={28} className="text-teal-400" />
              </div>
              <h2 className="font-display text-xl text-stone-100 mb-2">Link Existing Data?</h2>
              <p className="text-sm text-stone-400">
                We found ExpenseSight data associated with your Splitwise account.
                Would you like to link it to your email account?
              </p>
            </div>

            <div className="p-4 bg-stone-800/50 rounded-xl mb-6">
              <div className="flex items-center gap-3 mb-3">
                <Database size={16} className="text-teal-400" />
                <span className="text-sm font-medium text-stone-200">What this does:</span>
              </div>
              <ul className="space-y-2 text-xs text-stone-400">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Copies your existing expenses, budgets, and goals</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Links your Splitwise account for full dashboard access</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span>Original data remains untouched</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleLink}
                className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                Link Data
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}

        {/* Migrating Step */}
        {step === 'migrating' && (
          <div className="text-center py-8">
            <Loader2 size={48} className="animate-spin text-teal-400 mx-auto mb-4" />
            <h2 className="font-display text-xl text-stone-100 mb-2">Linking Data...</h2>
            <p className="text-sm text-stone-400">
              Please wait while we migrate your ExpenseSight data.
            </p>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-emerald-400" />
            </div>
            <h2 className="font-display text-xl text-stone-100 mb-2">Successfully Linked!</h2>
            <p className="text-sm text-stone-400 mb-6">
              {migratedCount > 0 
                ? `Migrated ${migratedCount} items to your account.`
                : 'Your accounts are now linked.'
              }
            </p>
            <button
              onClick={handleComplete}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              Continue
            </button>
          </div>
        )}

        {/* Error Step */}
        {step === 'error' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-red-400" />
            </div>
            <h2 className="font-display text-xl text-stone-100 mb-2">Linking Failed</h2>
            <p className="text-sm text-red-400 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setStep('confirm')}
                className="flex-1 py-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-xl transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleSkip}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
