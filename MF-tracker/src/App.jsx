import { useState, useEffect, useCallback } from 'react';
import SearchBar from './components/SearchBar';
import FundList from './components/FundList';
import { getFundNAV, calculateChanges } from './utils/api';
import { loadFunds, saveFund, removeFund } from './utils/storage';

function App() {
  const [funds, setFunds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchNavForFund = async (fund) => {
    try {
      const data = await getFundNAV(fund.schemeCode);
      const navData = calculateChanges(data.data);
      return { ...fund, navData, isLoading: false, error: null };
    } catch {
      return { ...fund, navData: null, isLoading: false, error: 'Failed to load NAV' };
    }
  };

  const loadAllFunds = useCallback(async () => {
    const savedFunds = loadFunds();
    if (savedFunds.length === 0) {
      setFunds([]);
      return;
    }

    const fundsWithLoading = savedFunds.map((f) => ({
      ...f,
      isLoading: true,
      navData: null,
      error: null,
    }));
    setFunds(fundsWithLoading);

    const updatedFunds = await Promise.all(fundsWithLoading.map(fetchNavForFund));
    setFunds(updatedFunds);
  }, []);

  useEffect(() => {
    loadAllFunds();
  }, [loadAllFunds]);

  const handleAddFund = async (fund) => {
    saveFund(fund);
    
    const newFund = { ...fund, isLoading: true, navData: null, error: null };
    setFunds((prev) => [...prev, newFund]);

    const updatedFund = await fetchNavForFund(fund);
    setFunds((prev) =>
      prev.map((f) => (f.schemeCode === fund.schemeCode ? updatedFund : f))
    );
  };

  const handleRemoveFund = (schemeCode) => {
    removeFund(schemeCode);
    setFunds((prev) => prev.filter((f) => f.schemeCode !== schemeCode));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    setFunds((prev) =>
      prev.map((f) => ({ ...f, isLoading: true, error: null }))
    );

    const updatedFunds = await Promise.all(funds.map(fetchNavForFund));
    setFunds(updatedFunds);
    setIsRefreshing(false);
  };

  const trackedCodes = funds.map((f) => f.schemeCode);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">MF Tracker</h1>
          <p className="text-gray-600 mt-1">Track NAV changes for your mutual funds</p>
        </header>

        <div className="mb-8">
          <SearchBar onAddFund={handleAddFund} trackedCodes={trackedCodes} />
        </div>

        <FundList
          funds={funds}
          onRemove={handleRemoveFund}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </div>
  );
}

export default App;
