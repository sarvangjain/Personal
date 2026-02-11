import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  ArrowLeft, Plus, Users, User, Loader2, Check, AlertCircle, 
  Search, ChevronDown, Tag, Sparkles, X
} from 'lucide-react';
import { createExpenseEqualSplit, createExpenseCustomSplit, getCategories } from '../api/splitwise';
import { getUserId, formatCurrency } from '../utils/analytics';

// Category keywords for auto-suggestion
const CATEGORY_KEYWORDS = {
  'Food and Drink': ['food', 'dinner', 'lunch', 'breakfast', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'meal', 'snack', 'drink', 'bar', 'pub', 'biryani', 'chai', 'tea'],
  'Groceries': ['grocery', 'groceries', 'supermarket', 'vegetables', 'fruits', 'milk', 'bread', 'eggs', 'kitchen', 'cooking'],
  'Transportation': ['uber', 'ola', 'cab', 'taxi', 'auto', 'metro', 'bus', 'train', 'flight', 'fuel', 'petrol', 'diesel', 'parking', 'toll', 'travel'],
  'Entertainment': ['movie', 'cinema', 'concert', 'show', 'game', 'netflix', 'spotify', 'subscription', 'fun', 'party', 'club'],
  'Utilities': ['electricity', 'electric', 'water', 'gas', 'internet', 'wifi', 'phone', 'mobile', 'recharge', 'bill', 'maintenance'],
  'Rent': ['rent', 'lease', 'housing', 'apartment', 'flat', 'room'],
  'Shopping': ['shopping', 'clothes', 'shoes', 'amazon', 'flipkart', 'myntra', 'electronics', 'gadget'],
  'Health': ['medicine', 'medical', 'doctor', 'hospital', 'pharmacy', 'health', 'gym', 'fitness'],
  'Education': ['book', 'course', 'class', 'tuition', 'education', 'school', 'college', 'study'],
  'Travel': ['hotel', 'airbnb', 'trip', 'vacation', 'holiday', 'travel', 'tourism', 'booking'],
};

// Searchable Dropdown Component
function SearchableDropdown({ 
  options, value, onChange, placeholder, renderOption, renderSelected,
  searchKeys = ['name'], icon: Icon, emptyText = "No options available"
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const filteredOptions = options.filter(opt => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return searchKeys.some(key => {
      const val = key.split('.').reduce((o, k) => o?.[k], opt);
      return val?.toString().toLowerCase().includes(searchLower);
    });
  });

  const selectedOption = options.find(o => o.id?.toString() === value?.toString());

  return (
    <div ref={wrapperRef} className="relative" style={{ zIndex: open ? 100 : 1 }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-2 px-3 py-3 bg-stone-800/60 border rounded-xl text-left transition-all ${
          open ? 'border-emerald-500/50 ring-1 ring-emerald-500/10' : 'border-stone-700/40'
        }`}
      >
        {Icon && <Icon size={14} className="text-stone-500 flex-shrink-0" />}
        <span className={`flex-1 text-sm truncate ${selectedOption ? 'text-stone-200' : 'text-stone-600'}`}>
          {selectedOption ? renderSelected(selectedOption) : placeholder}
        </span>
        <ChevronDown size={14} className={`text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-stone-900/95 backdrop-blur-xl border border-stone-700/50 rounded-xl shadow-2xl overflow-hidden" style={{ zIndex: 101 }}>
          <div className="p-2 border-b border-stone-800/50">
            <div className="flex items-center gap-2 px-2.5 py-2 bg-stone-800/60 rounded-lg">
              <Search size={13} className="text-stone-500 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="flex-1 bg-transparent text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

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
                  onClick={() => { onChange(opt.id.toString()); setOpen(false); setSearch(''); }}
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

export default function CreateExpensePage({ groups, friends, onBack, onCreated }) {
  const userId = getUserId();
  const [mode, setMode] = useState('group');
  const [splitType, setSplitType] = useState('equal');
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
  const [yourShare, setYourShare] = useState('');
  const [friendShare, setFriendShare] = useState('');
  
  // Category state
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [suggestedCategory, setSuggestedCategory] = useState(null);

  const activeGroups = groups.filter(g => g.id !== 0 && g.members?.length > 1);

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const cats = await getCategories();
        // Flatten subcategories for easier selection
        const flatCats = [];
        cats.forEach(cat => {
          flatCats.push({ id: cat.id, name: cat.name, icon: cat.icon });
          if (cat.subcategories) {
            cat.subcategories.forEach(sub => {
              flatCats.push({ 
                id: sub.id, 
                name: `${cat.name} → ${sub.name}`,
                parentName: cat.name,
                icon: sub.icon 
              });
            });
          }
        });
        setCategories(flatCats);
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setCategoriesLoading(false);
      }
    }
    fetchCategories();
  }, []);

  // Auto-suggest category based on description
  useEffect(() => {
    if (!description || categories.length === 0) {
      setSuggestedCategory(null);
      return;
    }
    
    const descLower = description.toLowerCase();
    
    // Find matching category
    for (const [catName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => descLower.includes(kw))) {
        // Find the category in our list
        const matchedCat = categories.find(c => 
          c.name.toLowerCase().includes(catName.toLowerCase()) ||
          c.parentName?.toLowerCase().includes(catName.toLowerCase())
        );
        if (matchedCat && matchedCat.id.toString() !== selectedCategoryId) {
          setSuggestedCategory(matchedCat);
          return;
        }
      }
    }
    setSuggestedCategory(null);
  }, [description, categories, selectedCategoryId]);

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

  function applySuggestedCategory() {
    if (suggestedCategory) {
      setSelectedCategoryId(suggestedCategory.id.toString());
      setSuggestedCategory(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!description.trim()) { setError('Description is required'); return; }
    if (!cost || parseFloat(cost) <= 0) { setError('Enter a valid amount'); return; }

    if (mode === 'friend' && splitType === 'custom') {
      const total = parseFloat(yourShare || 0) + parseFloat(friendShare || 0);
      if (Math.abs(total - parseFloat(cost)) > 0.01) {
        setError(`Shares must add up to the total (${cost}). Currently: ${total.toFixed(2)}`);
        return;
      }
    }

    setLoading(true);
    try {
      const categoryId = selectedCategoryId ? parseInt(selectedCategoryId) : undefined;
      
      if (mode === 'group') {
        if (!selectedGroupId) { setError('Select a group'); setLoading(false); return; }
        await createExpenseEqualSplit({
          groupId: parseInt(selectedGroupId),
          cost: parseFloat(cost).toFixed(2),
          description: description.trim(),
          currencyCode: currency,
          date: date ? `${date}T12:00:00Z` : undefined,
          details: notes || undefined,
          categoryId,
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
          categoryId,
          users: [
            { userId, paidShare: costVal, owedShare: myOwed },
            { userId: fId, paidShare: '0.00', owedShare: friendOwed },
          ],
        });
      }
      setSuccess(true);
      setTimeout(() => {
        onCreated?.();
        onBack();
      }, 1500);
    } catch (err) {
      setError(err.message || 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-emerald-400" />
          </div>
          <h3 className="font-display text-xl text-stone-100">Expense Created!</h3>
          <p className="text-sm text-stone-400 mt-2">{description} — {formatCurrency(parseFloat(cost), currency)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pt-4 safe-top">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50 text-stone-400 hover:text-stone-200 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-display text-stone-100">Add Expense</h1>
          <p className="text-sm text-stone-500">Create a new expense to split</p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="glass-card p-4">
        <label className="text-xs font-medium text-stone-400 mb-2 block">Split Type</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'group'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'
            }`}
          >
            <Users size={16} /> Group Split
          </button>
          <button
            type="button"
            onClick={() => setMode('friend')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
              mode === 'friend'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'
            }`}
          >
            <User size={16} /> With Friend
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Description */}
        <div className="glass-card p-4">
          <label className="text-xs font-medium text-stone-400 mb-2 block">Description*</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Dinner at Pizza Place"
            className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all"
            autoFocus
          />
        </div>

        {/* Amount + Currency */}
        <div className="glass-card p-4">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-stone-400 mb-2 block">Amount*</label>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={cost}
                onChange={e => handleCostChange(e.target.value)}
                placeholder="0.00"
                className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all font-mono text-lg"
              />
            </div>
            <div className="w-28">
              <label className="text-xs font-medium text-stone-400 mb-2 block">Currency</label>
              <select
                value={currency}
                onChange={e => setCurrency(e.target.value)}
                className="w-full px-3 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all"
              >
                <option value="INR">INR ₹</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
                <option value="GBP">GBP £</option>
              </select>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="glass-card p-4">
          <label className="text-xs font-medium text-stone-400 mb-2 block">
            Category
            {suggestedCategory && (
              <button
                type="button"
                onClick={applySuggestedCategory}
                className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-purple-500/15 text-purple-400 text-[10px] rounded-full hover:bg-purple-500/25 transition-colors"
              >
                <Sparkles size={10} />
                Suggested: {suggestedCategory.name.split(' → ').pop()}
              </button>
            )}
          </label>
          {categoriesLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl">
              <Loader2 size={14} className="animate-spin text-stone-500" />
              <span className="text-sm text-stone-500">Loading categories...</span>
            </div>
          ) : (
            <SearchableDropdown
              options={categories}
              value={selectedCategoryId}
              onChange={setSelectedCategoryId}
              placeholder="Select a category (optional)"
              searchKeys={['name']}
              icon={Tag}
              emptyText="No categories found"
              renderOption={(cat, isSelected) => (
                <>
                  <span className="text-sm text-stone-300">{cat.name}</span>
                  {isSelected && <Check size={14} className="text-emerald-400 ml-auto" />}
                </>
              )}
              renderSelected={(cat) => cat.name}
            />
          )}
          {selectedCategoryId && (
            <button
              type="button"
              onClick={() => setSelectedCategoryId('')}
              className="mt-2 text-xs text-stone-500 hover:text-stone-300 flex items-center gap-1"
            >
              <X size={12} /> Clear category
            </button>
          )}
        </div>

        {/* Group or Friend Selector */}
        <div className="glass-card p-4">
          {mode === 'group' ? (
            <>
              <label className="text-xs font-medium text-stone-400 mb-2 block">Group*</label>
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
              <p className="text-[11px] text-stone-600 mt-2">Split equally among all group members. You are the payer.</p>
            </>
          ) : (
            <>
              <label className="text-xs font-medium text-stone-400 mb-2 block">Friend*</label>
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
              
              {/* Split Type for Friend */}
              <div className="mt-4">
                <label className="text-xs font-medium text-stone-400 mb-2 block">How to split</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleSplitTypeChange('equal')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${splitType === 'equal' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'}`}>
                    50/50 Split
                  </button>
                  <button type="button" onClick={() => handleSplitTypeChange('custom')}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${splitType === 'custom' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30' : 'bg-stone-800/40 text-stone-500 border border-stone-700/30'}`}>
                    Custom Split
                  </button>
                </div>
              </div>

              {splitType === 'custom' && cost && (
                <div className="flex gap-3 mt-4">
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Your share</label>
                    <input type="number" step="0.01" value={yourShare}
                      onChange={e => { setYourShare(e.target.value); setFriendShare((parseFloat(cost) - parseFloat(e.target.value || 0)).toFixed(2)); }}
                      className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 font-mono focus:outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-stone-500 mb-1 block">Their share</label>
                    <input type="number" step="0.01" value={friendShare}
                      onChange={e => { setFriendShare(e.target.value); setYourShare((parseFloat(cost) - parseFloat(e.target.value || 0)).toFixed(2)); }}
                      className="w-full px-3 py-2.5 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 font-mono focus:outline-none focus:border-emerald-500/50" />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Date */}
        <div className="glass-card p-4">
          <label className="text-xs font-medium text-stone-400 mb-2 block">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 focus:outline-none focus:border-emerald-500/50 transition-all" />
        </div>

        {/* Notes */}
        <div className="glass-card p-4">
          <label className="text-xs font-medium text-stone-400 mb-2 block">Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Additional details..."
            className="w-full px-4 py-3 bg-stone-800/60 border border-stone-700/40 rounded-xl text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none" />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-stone-700 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
          {loading ? 'Creating Expense...' : 'Add Expense'}
        </button>
      </form>
    </div>
  );
}
