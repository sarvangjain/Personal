import { useState, useRef, useEffect } from 'react';
import { Search, X, Users, User, Receipt, ArrowRight } from 'lucide-react';
import { searchEverything, formatCurrency, getUserId } from '../utils/analytics';
import { format, parseISO } from 'date-fns';

export default function SearchBar({ groups, friends, expenses, onSelectGroup, onSelectFriend, onNavigate }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const userId = getUserId();

  const results = query.length >= 2 ? searchEverything(query, { groups, friends, expenses, userId }) : { groups: [], friends: [], expenses: [] };
  const hasResults = results.groups.length > 0 || results.friends.length > 0 || results.expenses.length > 0;

  useEffect(() => {
    function handleClick(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    function handleKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xl">
      <div className={`flex items-center gap-2 px-2.5 sm:px-3 py-2 bg-stone-800/50 border rounded-xl transition-all ${open ? 'border-emerald-500/40 ring-1 ring-emerald-500/10' : 'border-stone-700/40'}`}>
        <Search size={14} className="text-stone-500 flex-shrink-0 sm:w-[15px] sm:h-[15px]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search..."
          className="flex-1 bg-transparent text-[15px] sm:text-sm text-stone-200 placeholder:text-stone-600 focus:outline-none min-w-0"
        />
        {query && (
          <button onClick={() => { setQuery(''); setOpen(false); }} className="text-stone-500 hover:text-stone-300 p-1 -mr-1 touch-manipulation">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-stone-900/95 backdrop-blur-xl border border-stone-800/50 rounded-2xl max-h-[420px] overflow-y-auto z-50 shadow-2xl" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.03) inset, 0 8px 32px -4px rgba(0,0,0,0.6)' }}>
          {!hasResults ? (
            <div className="p-6 text-center">
              <p className="text-sm text-stone-500">No results for "{query}"</p>
            </div>
          ) : (
            <div className="p-2">
              {/* Groups */}
              {results.groups.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-medium text-stone-500 uppercase tracking-wider">Groups</p>
                  {results.groups.map(g => (
                    <button
                      key={g.id}
                      onClick={() => {
                        onSelectGroup?.(g.id);
                        onNavigate?.('groups');
                        setOpen(false);
                        setQuery('');
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors text-left"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <Users size={12} className="text-indigo-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-300 truncate">{g.name}</p>
                        <p className="text-[10px] text-stone-600">{g.members?.length} members · {g.group_type || 'group'}</p>
                      </div>
                      <ArrowRight size={12} className="text-stone-600" />
                    </button>
                  ))}
                </div>
              )}

              {/* Friends */}
              {results.friends.length > 0 && (
                <div className="mb-2">
                  <p className="px-3 py-1.5 text-[10px] font-medium text-stone-500 uppercase tracking-wider">Friends</p>
                  {results.friends.map(f => {
                    const bal = f.balance?.reduce((s, b) => s + parseFloat(b.amount), 0) || 0;
                    return (
                      <button
                        key={f.id}
                        onClick={() => {
                          onSelectFriend?.(f.id);
                          onNavigate?.('friends');
                          setOpen(false);
                          setQuery('');
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors text-left"
                      >
                        {f.picture?.medium ? (
                          <img src={f.picture.medium} className="w-7 h-7 rounded-full flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                            <User size={12} className="text-teal-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-300 truncate">{f.first_name} {f.last_name || ''}</p>
                          {bal !== 0 && (
                            <p className={`text-[10px] ${bal > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {bal > 0 ? 'owes you' : 'you owe'} {formatCurrency(Math.abs(bal))}
                            </p>
                          )}
                        </div>
                        <ArrowRight size={12} className="text-stone-600" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Expenses */}
              {results.expenses.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-medium text-stone-500 uppercase tracking-wider">Expenses</p>
                  {results.expenses.map(e => {
                    const userEntry = e.users?.find(u => u.user_id === userId);
                    const share = userEntry ? parseFloat(userEntry.owed_share) : 0;
                    return (
                      <div
                        key={e.id}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800/50 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                          <Receipt size={12} className="text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-stone-300 truncate">{e.description}</p>
                          <p className="text-[10px] text-stone-600">
                            {format(parseISO(e.date), 'MMM d, yyyy')} · {e.category?.name || 'General'}
                          </p>
                        </div>
                        <span className="text-xs font-mono text-stone-400">{formatCurrency(share)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
