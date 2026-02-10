import { useState } from 'react';
import { X, Plus, Users, User, Loader2, Check, AlertCircle } from 'lucide-react';
import { createExpenseEqualSplit, createExpenseCustomSplit } from '../api/splitwise';
import { getUserId, formatCurrency } from '../utils/analytics';

export default function CreateExpenseModal({ groups, friends, onClose, onCreated }) {
  const userId = getUserId();
  const [mode, setMode] = useState('group'); // 'group' | 'friend'
  const [splitType, setSplitType] = useState('equal'); // 'equal' | 'custom'
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // For custom splits in friend mode
  const [yourShare, setYourShare] = useState('');
  const [friendShare, setFriendShare] = useState('');

  const activeGroups = groups.filter(g => g.id !== 0 && g.members?.length > 1);

  function handleCostChange(val) {
    setCost(val);
    if (mode === 'friend' && splitType === 'equal' && val) {
      const half = (parseFloat(val) / 2).toFixed(2);
      setYourShare(half);
      setFriendShare(half);
    }
  }

  function handleSplitTypeChange(type) {
    setSplitType(type);
    if (type === 'equal' && cost) {
      const half = (parseFloat(cost) / 2).toFixed(2);
      setYourShare(half);
      setFriendShare(half);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) { setError('Description is required'); return; }
    if (!cost || parseFloat(cost) <= 0) { setError('Enter a valid amount'); return; }

    setLoading(true);
    try {
      if (mode === 'group') {
        if (!selectedGroupId) { setError('Select a group'); setLoading(false); return; }
        await createExpenseEqualSplit({
          groupId: parseInt(selectedGroupId),
          cost: parseFloat(cost).toFixed(2),
          description: description.trim(),
          currencyCode: currency,
          date: date ? `${date}T12:00:00Z` : undefined,
          details: notes || undefined,
        });
      } else {
        if (!selectedFriendId) { setError('Select a friend'); setLoading(false); return; }
        const fId = parseInt(selectedFriendId);
        const costVal = parseFloat(cost).toFixed(2);
        const myOwed = splitType === 'equal' ? (parseFloat(cost) / 2).toFixed(2) : parseFloat(yourShare).toFixed(2);
        const friendOwed = splitType === 'equal' ? (parseFloat(cost) / 2).toFixed(2) : parseFloat(friendShare).toFixed(2);

        await createExpenseCustomSplit({
          cost: costVal,
          description: description.trim(),
          currencyCode: currency,
          date: date ? `${date}T12:00:00Z` : undefined,
          details: notes || undefined,
          users: [
            { userId, paidShare: costVal, owedShare: myOwed },
            { userId: fId, paidShare: '0.00', owedShare: friendOwed },
          ],
        });
      }
      setSuccess(true);
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="glass-card w-full max-w-md mx-4 p-8 text-center animate-slide-up" onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <Check size={24} className="text-emerald-400" />
          </div>
          <h3 className="font-display text-lg text-stone-100">Expense Created!</h3>
          <p className="text-sm text-stone-400 mt-1">{description} — {formatCurrency(parseFloat(cost), currency)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="glass-card w-full sm:max-w-lg sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-slide-up rounded-t-3xl sm:rounded-2xl safe-bottom"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle for mobile */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-stone-700" />
        </div>
        
        <div className="sticky top-0 bg-stone-900/95 backdrop-blur-xl px-4 sm:px-6 pt-3 sm:pt-5 pb-3 sm:pb-4 border-b border-stone-800/40 z-10">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg sm:text-xl text-stone-100">Add Expense</h2>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 transition-colors p-1 -mr-1 min-touch">
              <X size={18} />
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 mt-3 sm:mt-4">
            <button
              onClick={() => setMode('group')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm font-medium transition-all touch-manipulation ${
                mode === 'group'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-stone-800/40 text-stone-500 border border-stone-700/30 active:bg-stone-700/40'
              }`}
            >
              <Users size={14} /> Group Split
            </button>
            <button
              onClick={() => setMode('friend')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 sm:py-2 rounded-lg text-[13px] sm:text-sm font-medium transition-all touch-manipulation ${
                mode === 'friend'
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-stone-800/40 text-stone-500 border border-stone-700/30 active:bg-stone-700/40'
              }`}
            >
              <User size={14} /> With Friend
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Description */}
          <div>
            <label className="text-[11px] sm:text-xs font-medium text-stone-400 mb-1 sm:mb-1.5 block">Description*</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Dinner at Pizza Place"
              className="w-full px-3 py-3 sm:py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl sm:rounded-lg text-[15px] sm:text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              autoFocus
            />
          </div>

          {/* Amount + Currency */}
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-1">
              <label className="text-[11px] sm:text-xs font-medium text-stone-400 mb-1 sm:mb-1.5 block">Amount*</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={cost}
                onChange={e => handleCostChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-3 sm:py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl sm:rounded-lg text-[15px] sm:text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono"
              />
            </div>
            <div className="w-24 sm:w-28">
              <label className="text-[11px] sm:text-xs font-medium text-stone-400 mb-1 sm:mb-1.5 block">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-2 sm:px-3 py-3 sm:py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl sm:rounded-lg text-[15px] sm:text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>

          {/* Group or Friend Selector */}
          {mode === 'group' ? (
            <div>
              <label className="text-xs font-medium text-stone-400 mb-1.5 block">Group*</label>
              <select
                value={selectedGroupId}
                onChange={e => setSelectedGroupId(e.target.value)}
                className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="">Select a group...</option>
                {activeGroups.map(g => (
                  <option key={g.id} value={g.id}>{g.name} ({g.members?.length} members)</option>
                ))}
              </select>
              <p className="text-[10px] text-stone-600 mt-1">Split equally among all group members. You are the payer.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-medium text-stone-400 mb-1.5 block">Friend*</label>
                <select
                  value={selectedFriendId}
                  onChange={e => setSelectedFriendId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all"
                >
                  <option value="">Select a friend...</option>
                  {friends.map(f => (
                    <option key={f.id} value={f.id}>{f.first_name} {f.last_name || ''}</option>
                  ))}
                </select>
              </div>

              {/* Split Type for Friend */}
              <div>
                <label className="text-xs font-medium text-stone-400 mb-1.5 block">Split Type</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSplitTypeChange('equal')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${splitType === 'equal' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'}`}>
                    50/50
                  </button>
                  <button type="button" onClick={() => handleSplitTypeChange('custom')}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${splitType === 'custom' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'}`}>
                    Custom
                  </button>
                </div>
              </div>

              {splitType === 'custom' && cost && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Your share</label>
                    <input type="number" step="0.01" value={yourShare}
                      onChange={e => { setYourShare(e.target.value); setFriendShare((parseFloat(cost) - parseFloat(e.target.value || 0)).toFixed(2)); }}
                      className="w-full px-3 py-2 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 font-mono focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Their share</label>
                    <input type="number" step="0.01" value={friendShare}
                      onChange={e => { setFriendShare(e.target.value); setYourShare((parseFloat(cost) - parseFloat(e.target.value || 0)).toFixed(2)); }}
                      className="w-full px-3 py-2 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 font-mono focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              )}
            </>
          )}

          {/* Date */}
          <div>
            <label className="text-xs font-medium text-stone-400 mb-1.5 block">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all" />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-stone-400 mb-1.5 block">Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Additional details..."
              className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-lg text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {loading ? 'Creating...' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}
