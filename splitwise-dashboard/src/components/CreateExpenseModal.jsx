import { useState, useRef, useEffect } from 'react';
import { X, Plus, Users, User, Loader2, Check, AlertCircle, Search, ChevronDown } from 'lucide-react';
import { createExpenseEqualSplit, createExpenseCustomSplit } from '../api/splitwise';
import { getUserId, formatCurrency } from '../utils/analytics';

// Searchable Dropdown Component
function SearchableDropdown({ 
  options, 
  value, 
  onChange, 
  placeholder, 
  renderOption, 
  renderSelected,
  searchKeys = ['name'],
  icon: Icon,
  emptyText = "No options available"
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter options based on search
  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchKeys.some(key => {
      const value = key.split('.').reduce((o, k) => o?.[k], opt);
      return value?.toString().toLowerCase().includes(searchLower);
    });
  });

  const selectedOption = options.find(o => o.id?.toString() === value?.toString());

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected value display / trigger */}
      <button
        type="button"
        onClick={() => { setOpen(!open); if (!open) setTimeout(() => inputRef.current?.focus(), 50); }}
        className={`w-full flex items-center gap-2 px-3 py-3 sm:py-2.5 bg-stone-800/60 border rounded-xl sm:rounded-lg text-left transition-all ${
          open ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-stone-700/40'
        }`}
      >
        {Icon && <Icon size={14} className="text-stone-500 flex-shrink-0" />}
        <span className={`flex-1 text-[15px] sm:text-sm truncate ${selectedOption ? 'text-stone-200' : 'text-stone-600'}`}>
          {selectedOption ? renderSelected(selectedOption) : placeholder}
        </span>
        <ChevronDown size={14} className={`text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900 border border-stone-700/50 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ boxShadow: '0 8px 32px -4px rgba(0,0,0,0.8)' }}>
          {/* Search input */}
          <div className="p-2 border-b border-stone-800/50">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-stone-800/60 rounded-lg">
              <Search size={13} className="text-stone-500 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-stone-500 hover:text-stone-300">
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <p className="text-xs text-stone-500">{search ? `No results for "${search}"` : emptyText}</p>
              </div>
            ) : (
              filteredOptions.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.id.toString());
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full px-3 py-2.5 text-left hover:bg-stone-800/60 transition-colors flex items-center gap-2 ${
                    opt.id?.toString() === value?.toString() ? 'bg-emerald-500/10' : ''
                  }`}
                >
                  {renderOption(opt, opt.id?.toString() === value?.toString())}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

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

    // Validate custom split totals add up
    if (mode === 'friend' && splitType === 'custom') {
      const total = parseFloat(yourShare || 0) + parseFloat(friendShare || 0);
      if (Math.abs(total - parseFloat(cost)) > 0.01) {
        setError(`Shares must add up to the total (${cost}). Currently: ${total.toFixed(2)}`);
        return;
      }
    }

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
              <label className="text-[11px] sm:text-xs font-medium text-stone-400 mb-1 sm:mb-1.5 block">Group*</label>
              <SearchableDropdown
                options={activeGroups}
                value={selectedGroupId}
                onChange={setSelectedGroupId}
                placeholder="Search or select a group..."
                searchKeys={['name']}
                icon={Users}
                emptyText="No groups available"
                renderOption={(g, isSelected) => (
                  <>
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                      <Users size={12} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-300 truncate">{g.name}</p>
                      <p className="text-[10px] text-stone-600">{g.members?.length} members</p>
                    </div>
                    {isSelected && <Check size={14} className="text-emerald-400 flex-shrink-0" />}
                  </>
                )}
                renderSelected={(g) => `${g.name} (${g.members?.length} members)`}
              />
              <p className="text-[10px] text-stone-600 mt-1">Split equally among all group members. You are the payer.</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-[11px] sm:text-xs font-medium text-stone-400 mb-1 sm:mb-1.5 block">Friend*</label>
                <SearchableDropdown
                  options={friends}
                  value={selectedFriendId}
                  onChange={setSelectedFriendId}
                  placeholder="Search or select a friend..."
                  searchKeys={['first_name', 'last_name', 'email']}
                  icon={User}
                  emptyText="No friends available"
                  renderOption={(f, isSelected) => (
                    <>
                      {f.picture?.medium ? (
                        <img src={f.picture.medium} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                          <User size={12} className="text-teal-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-300 truncate">{f.first_name} {f.last_name || ''}</p>
                        {f.email && <p className="text-[10px] text-stone-600 truncate">{f.email}</p>}
                      </div>
                      {isSelected && <Check size={14} className="text-emerald-400 flex-shrink-0" />}
                    </>
                  )}
                  renderSelected={(f) => `${f.first_name} ${f.last_name || ''}`}
                />
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
