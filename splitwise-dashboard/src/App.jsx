import { useState, useEffect, useCallback } from 'react';
import { getCurrentUser, getGroups, getFriends, getExpenses, getAllExpensesForGroup } from './api/splitwise';
import { getUserId, computeOverallBalances, computeFriendBalances } from './utils/analytics';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import OverviewCards from './components/OverviewCards';
import GroupSelector from './components/GroupSelector';
import GroupDashboard from './components/GroupDashboard';
import FriendBalances from './components/FriendBalances';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

export default function App() {
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
  const [activeTab, setActiveTab] = useState('overview');

  const userId = getUserId();

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [userData, groupsData, friendsData] = await Promise.all([
        getCurrentUser(),
        getGroups(),
        getFriends(),
      ]);
      setUser(userData);
      setGroups(groupsData);
      setFriends(friendsData);

      // Load recent expenses across all groups
      const recentExpenses = await getExpenses({ limit: 100 });
      setAllExpenses(recentExpenses.filter(e => !e.deleted_at && !e.payment));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (!selectedGroupId) {
      setGroupExpenses([]);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoadingExpenses(true);
      try {
        const expenses = await getAllExpensesForGroup(selectedGroupId);
        if (!cancelled) setGroupExpenses(expenses);
      } catch (err) {
        console.error('Failed to load group expenses:', err);
      } finally {
        if (!cancelled) setLoadingExpenses(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [selectedGroupId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadInitialData} onSettings={() => setShowSettings(true)} />;

  const balances = computeOverallBalances(groups, userId);
  const friendBalances = computeFriendBalances(friends, userId);
  const activeGroups = groups.filter(g => g.id !== 0 && g.members?.length > 1);
  const selectedGroup = groups.find(g => g.id === selectedGroupId);

  return (
    <div className="min-h-screen">
      <Header user={user} onSettings={() => setShowSettings(true)} />

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Navigation Tabs */}
        <nav className="flex gap-8 mb-8 border-b border-stone-800/50 pt-2">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'groups', label: 'Group Analysis' },
            { id: 'friends', label: 'Balances' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 text-sm font-medium tracking-wide transition-all ${
                activeTab === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <div className="animate-fade-in space-y-8">
            <OverviewCards balances={balances} expenses={allExpenses} userId={userId} />
          </div>
        )}

        {activeTab === 'groups' && (
          <div className="animate-fade-in space-y-8">
            <GroupSelector
              groups={activeGroups}
              selectedGroupId={selectedGroupId}
              onSelect={setSelectedGroupId}
            />
            {selectedGroupId && (
              <GroupDashboard
                group={selectedGroup}
                expenses={groupExpenses}
                loading={loadingExpenses}
                userId={userId}
              />
            )}
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="animate-fade-in">
            <FriendBalances friends={friendBalances} />
          </div>
        )}
      </main>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSave={() => {
            setShowSettings(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
