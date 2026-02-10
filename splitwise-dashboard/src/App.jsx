import { useState, useEffect, useCallback } from 'react';
import { isLoggedIn } from './utils/config';
import { getCurrentUser, getGroups, getFriends, getExpenses, getAllExpensesForGroup } from './api/splitwise';
import { getUserId, computeOverallBalances, computeFriendBalances, computeSmartInsights, computeSettleUpSuggestions } from './utils/analytics';
import SetupPage from './components/SetupPage';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import CreateExpenseModal from './components/CreateExpenseModal';
import OverviewCards from './components/OverviewCards';
import SmartInsights from './components/SmartInsights';
import RecurringExpenses from './components/RecurringExpenses';
import SettleUpPanel from './components/SettleUpPanel';
import GroupSelector from './components/GroupSelector';
import GroupDashboard from './components/GroupDashboard';
import FriendBalances from './components/FriendBalances';
import FriendDetail from './components/FriendDetail';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [groupExpenses, setGroupExpenses] = useState([]);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFriend, setSelectedFriend] = useState(null);

  const userId = getUserId();

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [userData, groupsData, friendsData] = await Promise.all([
        getCurrentUser(), getGroups(), getFriends(),
      ]);
      setUser(userData);
      setGroups(groupsData);
      setFriends(friendsData);
      const recentExpenses = await getExpenses({ limit: 100 });
      setAllExpenses(recentExpenses.filter(e => !e.deleted_at && !e.payment));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);

  useEffect(() => {
    if (!selectedGroupId) { setGroupExpenses([]); return; }
    let cancelled = false;
    (async () => {
      setLoadingExpenses(true);
      try {
        const expenses = await getAllExpensesForGroup(selectedGroupId);
        if (!cancelled) setGroupExpenses(expenses);
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoadingExpenses(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedGroupId]);

  function handleExpenseCreated() {
    loadInitialData();
    if (selectedGroupId) getAllExpensesForGroup(selectedGroupId).then(setGroupExpenses);
  }

  function handleSearchSelectGroup(groupId) { setSelectedGroupId(groupId); setActiveTab('groups'); }

  function handleSearchSelectFriend(friendId) {
    const fb = computeFriendBalances(friends, userId);
    const found = fb.find(f => f.id === friendId);
    if (found) { setSelectedFriend(found); setActiveTab('friends'); return; }
    const raw = friends.find(f => f.id === friendId);
    if (raw) {
      setSelectedFriend({ id: raw.id, name: `${raw.first_name} ${raw.last_name || ''}`.trim(), picture: raw.picture?.medium, balance: 0, currency: 'INR' });
      setActiveTab('friends');
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadInitialData} onSettings={() => setShowSettings(true)} />;

  const balances = computeOverallBalances(groups, userId);
  const friendBalances = computeFriendBalances(friends, userId);
  const activeGroups = groups.filter(g => g.id !== 0 && g.members?.length > 1);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const insights = computeSmartInsights(allExpenses, friends, groups, userId);
  const settleUpSuggestions = computeSettleUpSuggestions(groups, userId);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'groups', label: 'Groups' },
    { id: 'friends', label: 'Balances' },
    { id: 'settle', label: 'Settle Up' },
  ];

  return (
    <div className="min-h-screen">
      <Header
        user={user}
        onSettings={() => setShowSettings(true)}
        onAddExpense={() => setShowCreateExpense(true)}
        groups={groups} friends={friends} expenses={allExpenses}
        onSelectGroup={handleSearchSelectGroup}
        onSelectFriend={handleSearchSelectFriend}
        onNavigate={setActiveTab}
      />

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pb-20 sm:pb-16">
        {/* Tabs */}
        <nav className="flex gap-1 sm:gap-6 mb-6 sm:mb-8 border-b border-stone-800/50 pt-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'friends') setSelectedFriend(null); }}
              className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-medium tracking-wide transition-all whitespace-nowrap px-2 sm:px-0 ${
                activeTab === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab.label}
              {tab.id === 'settle' && settleUpSuggestions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] bg-amber-500/15 text-amber-400 rounded-full font-mono">{settleUpSuggestions.length}</span>
              )}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <div className="animate-fade-in space-y-4 sm:space-y-6">
            <OverviewCards balances={balances} expenses={allExpenses} userId={userId} />
            <SmartInsights insights={insights} />
            <RecurringExpenses expenses={allExpenses} userId={userId} />
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="animate-fade-in space-y-6 sm:space-y-8">
            <GroupSelector groups={activeGroups} selectedGroupId={selectedGroupId} onSelect={setSelectedGroupId} />
            {selectedGroupId && <GroupDashboard group={selectedGroup} expenses={groupExpenses} loading={loadingExpenses} userId={userId} />}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="animate-fade-in">
            {selectedFriend ? (
              <FriendDetail friend={selectedFriend} onBack={() => setSelectedFriend(null)} />
            ) : (
              <FriendBalances friends={friendBalances} onSelectFriend={f => setSelectedFriend(f)} />
            )}
          </div>
        )}

        {activeTab === 'settle' && (
          <div className="animate-fade-in space-y-6">
            <SettleUpPanel suggestions={settleUpSuggestions} />
            {settleUpSuggestions.length === 0 && (
              <div className="glass-card p-8 sm:p-12 text-center">
                <p className="text-lg font-display text-stone-300">All settled! 🎉</p>
                <p className="text-sm text-stone-500 mt-2">No outstanding debts to clear.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/50 z-40 safe-bottom">
        <div className="flex justify-around py-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'friends') setSelectedFriend(null); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${isActive ? 'text-emerald-400' : 'text-stone-500'}`}>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {isActive && <div className="w-4 h-0.5 rounded-full bg-emerald-400" />}
              </button>
            );
          })}
        </div>
      </nav>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={() => { setShowSettings(false); window.location.reload(); }}
          onLogout={() => window.location.reload()}
        />
      )}

      {showCreateExpense && (
        <CreateExpenseModal groups={groups} friends={friends}
          onClose={() => setShowCreateExpense(false)} onCreated={handleExpenseCreated} />
      )}
    </div>
  );
}

export default function App() {
  const [authenticated, setAuthenticated] = useState(isLoggedIn());

  if (!authenticated) {
    return <SetupPage onComplete={() => setAuthenticated(true)} />;
  }

  return <Dashboard />;
}
