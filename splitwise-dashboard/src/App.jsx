import { useState, useEffect, useCallback } from 'react';
import { isLoggedIn } from './utils/config';
import { getCurrentUser, getGroups, getFriends, getExpenses } from './api/splitwise';
import { getUserId, computeOverallBalances, computeFriendBalances, computeSmartInsights, computeSettleUpSuggestions } from './utils/analytics';
import { usePWA, usePullToRefresh, useHaptic } from './hooks/usePWA';
import SetupPage from './components/SetupPage';
import Header from './components/Header';
import SettingsModal from './components/SettingsModal';
import CreateExpenseModal from './components/CreateExpenseModal';
import OverviewCards from './components/OverviewCards';
import SmartInsights from './components/SmartInsights';
import RecurringExpenses from './components/RecurringExpenses';
import SettleUpPanel from './components/SettleUpPanel';
import DebtGraph from './components/DebtGraph';
import GroupSelector from './components/GroupSelector';
import GroupDetail from './components/GroupDetail';
import FriendBalances from './components/FriendBalances';
import FriendDetail from './components/FriendDetail';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';
import YearInReview from './components/YearInReview';
import { WifiOff, RefreshCw, Download, X, Sparkles, FlaskConical, Share2 } from 'lucide-react';

// Offline Banner Component
function OfflineBanner() {
  return (
    <div className="offline-banner">
      <WifiOff size={12} className="inline mr-1.5" />
      You're offline — some features may be limited
    </div>
  );
}

// Update Available Banner
function UpdateBanner({ onUpdate, onDismiss }) {
  return (
    <div className="update-banner">
      <div className="flex-1">
        <p className="text-sm font-medium text-stone-200">Update available</p>
        <p className="text-[10px] text-stone-500">Refresh to get the latest version</p>
      </div>
      <button onClick={onUpdate} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
        Update
      </button>
      <button onClick={onDismiss} className="p-1.5 text-stone-500 hover:text-stone-300">
        <X size={14} />
      </button>
    </div>
  );
}

// Install Prompt Component
function InstallPrompt({ onInstall, onDismiss }) {
  return (
    <div className="install-prompt">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
          <Download size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-stone-200">Install SplitSight</p>
          <p className="text-[11px] text-stone-500 mt-0.5">Add to your home screen for quick access and offline support</p>
        </div>
        <button onClick={onDismiss} className="p-1 text-stone-500 hover:text-stone-300">
          <X size={14} />
        </button>
      </div>
      <div className="flex gap-2 mt-3">
        <button onClick={onInstall} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors">
          Install
        </button>
        <button onClick={onDismiss} className="px-4 py-2 text-stone-400 hover:text-stone-200 text-sm transition-colors">
          Not now
        </button>
      </div>
    </div>
  );
}

// Pull to Refresh Indicator
function PullIndicator({ distance, isRefreshing }) {
  const progress = Math.min(distance / 80, 1);
  const rotation = isRefreshing ? 'animate-spin' : '';
  
  if (distance <= 0 && !isRefreshing) return null;
  
  return (
    <div 
      className="fixed top-0 left-0 right-0 flex items-center justify-center z-50 pointer-events-none pt-safe-top"
      style={{ 
        transform: `translateY(${Math.min(distance, 100)}px)`,
        opacity: progress 
      }}
    >
      <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center shadow-lg">
        <RefreshCw size={14} className={`text-emerald-400 ${rotation}`} style={{ transform: `rotate(${progress * 360}deg)` }} />
      </div>
    </div>
  );
}

function Dashboard() {
  const [user, setUser] = useState(null);
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [allExpenses, setAllExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateExpense, setShowCreateExpense] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdateBanner, setShowUpdateBanner] = useState(true);
  const [showYearInReview, setShowYearInReview] = useState(false);
  const [yearInReviewYear, setYearInReviewYear] = useState(new Date().getFullYear());
  const [startWithShare, setStartWithShare] = useState(false);

  const userId = getUserId();
  
  // PWA hooks
  const { isOnline, canInstall, install, updateAvailable, applyUpdate, isInstalled } = usePWA();
  const haptic = useHaptic();

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
      
      // Fetch expenses from the last 12 months for comprehensive analytics
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const datedAfter = oneYearAgo.toISOString();
      
      let allExpensesList = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      
      while (hasMore) {
        const batch = await getExpenses({ limit, offset, datedAfter });
        allExpensesList = [...allExpensesList, ...batch];
        hasMore = batch.length >= limit;
        offset += limit;
        // Safety limit to prevent infinite loops
        if (offset > 2000) break;
      }
      
      setAllExpenses(allExpensesList.filter(e => !e.deleted_at && !e.payment));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitialData(); }, [loadInitialData]);
  
  // Pull to refresh
  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(async () => {
    haptic.light();
    await loadInitialData();
    haptic.success();
  });
  
  // Show install prompt after delay (only on first visit, not installed)
  useEffect(() => {
    if (canInstall && !isInstalled) {
      const timer = setTimeout(() => {
        const dismissed = localStorage.getItem('install_prompt_dismissed');
        if (!dismissed) {
          setShowInstallPrompt(true);
        }
      }, 30000); // Show after 30 seconds
      return () => clearTimeout(timer);
    }
  }, [canInstall, isInstalled]);
  
  const handleInstall = async () => {
    haptic.medium();
    const installed = await install();
    if (installed) {
      setShowInstallPrompt(false);
      haptic.success();
    }
  };
  
  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  function handleExpenseCreated() {
    loadInitialData();
    // Reset group selection to force reload when returning to group detail
    if (selectedGroupId) {
      const gid = selectedGroupId;
      setSelectedGroupId(null);
      setTimeout(() => setSelectedGroupId(gid), 100);
    }
  }

  function handleSearchSelectGroup(groupId) { setSelectedGroupId(groupId); setActiveTab('groups'); }

  function handleSearchSelectFriend(friendId) {
    const fb = computeFriendBalances(friends, userId);
    const found = fb.find(f => f.id === friendId);
    if (found) { setSelectedFriend(found); setActiveTab('friends'); return; }
    const raw = friends.find(f => f.id === friendId);
    if (raw) {
      const allBalances = (raw.balance || []).map(b => ({
        amount: parseFloat(b.amount), currency: b.currency_code || 'INR'
      })).filter(b => Math.abs(b.amount) > 0.01);
      const primary = allBalances[0] || { amount: 0, currency: 'INR' };
      setSelectedFriend({
        id: raw.id, name: `${raw.first_name} ${raw.last_name || ''}`.trim(),
        picture: raw.picture?.medium, balance: primary.amount, currency: primary.currency, allBalances,
      });
      setActiveTab('friends');
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={loadInitialData} onSettings={() => setShowSettings(true)} isOnline={isOnline} />;

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
    { id: 'beta', label: 'Beta', icon: FlaskConical },
  ];

  return (
    <div className="min-h-screen min-h-[100dvh]">
      {/* PWA UI Elements */}
      {!isOnline && <OfflineBanner />}
      <PullIndicator distance={pullDistance} isRefreshing={isRefreshing} />
      {updateAvailable && showUpdateBanner && (
        <UpdateBanner onUpdate={applyUpdate} onDismiss={() => setShowUpdateBanner(false)} />
      )}
      {showInstallPrompt && canInstall && (
        <InstallPrompt onInstall={handleInstall} onDismiss={dismissInstallPrompt} />
      )}
      
      <Header
        user={user}
        onSettings={() => { haptic.light(); setShowSettings(true); }}
        onAddExpense={() => { haptic.light(); setShowCreateExpense(true); }}
        groups={groups} friends={friends} expenses={allExpenses}
        onSelectGroup={handleSearchSelectGroup}
        onSelectFriend={handleSearchSelectFriend}
        onNavigate={setActiveTab}
        isOnline={isOnline}
      />

      <main className="max-w-[1440px] mx-auto px-3 sm:px-6 lg:px-8 pb-20 sm:pb-16">
        {/* Tabs */}
        <nav className="flex gap-1 sm:gap-6 mb-6 sm:mb-8 border-b border-stone-800/50 pt-2 overflow-x-auto scrollbar-hide -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'friends') setSelectedFriend(null); if (tab.id === 'groups') setSelectedGroupId(null); }}
              className={`pb-2.5 sm:pb-3 text-xs sm:text-sm font-medium tracking-wide transition-all whitespace-nowrap px-2 sm:px-0 flex items-center gap-1.5 ${
                activeTab === tab.id ? 'tab-active' : 'tab-inactive'
              }`}
            >
              {tab.icon && <tab.icon size={14} className={tab.id === 'beta' ? 'text-purple-400' : ''} />}
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
          <div className="animate-fade-in">
            {selectedGroup ? (
              <GroupDetail group={selectedGroup} onBack={() => setSelectedGroupId(null)} />
            ) : (
              <GroupSelector groups={activeGroups} onSelect={setSelectedGroupId} />
            )}
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
            <DebtGraph groups={groups} userId={userId} />
            <SettleUpPanel suggestions={settleUpSuggestions} />
            {settleUpSuggestions.length === 0 && (
              <div className="glass-card p-8 sm:p-12 text-center">
                <p className="text-lg font-display text-stone-300">All settled! 🎉</p>
                <p className="text-sm text-stone-500 mt-2">No outstanding debts to clear.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'beta' && (
          <div className="animate-fade-in space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                <FlaskConical size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-display text-stone-200">Beta Features</h2>
                <p className="text-xs text-stone-500">Try out experimental features</p>
              </div>
            </div>

            {/* Year in Review Cards */}
            <div className="space-y-3">
              {/* Current Year */}
              <div className="glass-card p-5 sm:p-6 hover:border-emerald-500/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles size={22} className="text-white sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base sm:text-lg text-white">{new Date().getFullYear()} Wrapped</h3>
                      <span className="px-2 py-0.5 text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 rounded-full uppercase tracking-wider">New</span>
                    </div>
                    <p className="text-sm text-stone-400 mb-3">
                      Discover your {new Date().getFullYear()} spending story with insights, patterns, and your Splitwise personality.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 text-[10px] bg-stone-800/80 text-stone-400 rounded-md">📊 Insights</span>
                      <span className="px-2 py-1 text-[10px] bg-stone-800/80 text-stone-400 rounded-md">👥 Social</span>
                      <span className="px-2 py-1 text-[10px] bg-stone-800/80 text-stone-400 rounded-md">🎭 Personality</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { haptic.medium(); setYearInReviewYear(new Date().getFullYear()); setStartWithShare(false); setShowYearInReview(true); }}
                        className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        View Wrapped
                      </button>
                      <button
                        onClick={() => { haptic.medium(); setYearInReviewYear(new Date().getFullYear()); setStartWithShare(true); setShowYearInReview(true); }}
                        className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Previous Year */}
              <div className="glass-card p-5 sm:p-6 hover:border-amber-500/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                    <Sparkles size={22} className="text-white sm:w-6 sm:h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base sm:text-lg text-white">{new Date().getFullYear() - 1} Wrapped</h3>
                    </div>
                    <p className="text-sm text-stone-400 mb-3">
                      Look back at your {new Date().getFullYear() - 1} spending journey and see how your habits have evolved.
                    </p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 text-[10px] bg-stone-800/80 text-stone-400 rounded-md">📆 Throwback</span>
                      <span className="px-2 py-1 text-[10px] bg-stone-800/80 text-stone-400 rounded-md">📈 Compare</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { haptic.medium(); setYearInReviewYear(new Date().getFullYear() - 1); setStartWithShare(false); setShowYearInReview(true); }}
                        className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles size={14} />
                        View Wrapped
                      </button>
                      <button
                        onClick={() => { haptic.medium(); setYearInReviewYear(new Date().getFullYear() - 1); setStartWithShare(true); setShowYearInReview(true); }}
                        className="py-2.5 px-4 bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Share2 size={14} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coming Soon Cards */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass-card p-5 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center">
                    <span className="text-lg">📅</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-display text-stone-300">Spending Heatmap</h4>
                    <span className="text-[10px] text-stone-600">Coming Soon</span>
                  </div>
                </div>
                <p className="text-xs text-stone-500">GitHub-style calendar showing your daily spending patterns</p>
              </div>

              <div className="glass-card p-5 opacity-60">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl bg-stone-800 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-display text-stone-300">Budget Goals</h4>
                    <span className="text-[10px] text-stone-600">Coming Soon</span>
                  </div>
                </div>
                <p className="text-xs text-stone-500">Set and track spending limits for categories</p>
              </div>
            </div>

            <div className="text-center pt-4">
              <p className="text-xs text-stone-600">Have feature ideas? We'd love to hear from you!</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 sm:mt-16 pb-4 text-center">
          <p className="text-sm sm:text-xs text-stone-600">
            Vibe Coded with <span className="text-red-400">{' '}❤️{' '}</span> by{' '}
            <a 
              href="https://www.linkedin.com/in/sarvangjain/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-stone-400 hover:text-emerald-400 transition-colors"
            >
              Sarvang Jain
            </a>
          </p>
        </footer>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-stone-950/95 backdrop-blur-xl border-t border-stone-800/50 z-40 safe-bottom">
        <div className="flex justify-around py-2">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id === 'friends') setSelectedFriend(null); if (tab.id === 'groups') setSelectedGroupId(null); }}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${isActive ? (tab.id === 'beta' ? 'text-purple-400' : 'text-emerald-400') : 'text-stone-500'}`}>
                <span className="text-[11px] font-medium">{tab.label}</span>
                {isActive && <div className={`w-4 h-0.5 rounded-full ${tab.id === 'beta' ? 'bg-purple-400' : 'bg-emerald-400'}`} />}
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

      {showYearInReview && (
        <YearInReview
          groups={groups}
          friends={friends}
          expenses={allExpenses}
          onClose={() => { setShowYearInReview(false); setStartWithShare(false); }}
          userName={user?.first_name || 'User'}
          year={yearInReviewYear}
          startWithShare={startWithShare}
        />
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
