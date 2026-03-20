import { useState, useEffect, useCallback, useRef } from 'react';
import SearchBar from './components/SearchBar';
import FundList from './components/FundList';
import FundDetailModal from './components/FundDetailModal';
import { getFundNAV, calculateChanges } from './utils/api';
import { loadFunds, saveFund, removeFund, exportWatchlist, importWatchlist } from './utils/storage';

function App() {
  const [funds, setFunds] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [selectedNavHistory, setSelectedNavHistory] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleViewDetails = async (fund) => {
    setSelectedFund(fund);
    setSelectedNavHistory(null);
    
    try {
      const data = await getFundNAV(fund.schemeCode);
      setSelectedNavHistory(data.data);
    } catch {
      console.error('Failed to fetch NAV history for chart');
    }
  };

  const handleCloseModal = () => {
    setSelectedFund(null);
    setSelectedNavHistory(null);
  };

  const handleExport = () => {
    exportWatchlist();
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importWatchlist(file);
      setImportStatus(`Imported ${result.added} new fund(s)`);
      loadAllFunds();
      setTimeout(() => setImportStatus(null), 3000);
    } catch (err) {
      setImportStatus(`Error: ${err.message}`);
      setTimeout(() => setImportStatus(null), 3000);
    }
    
    e.target.value = '';
  };

  const trackedCodes = funds.map((f) => f.schemeCode);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">MF Tracker</h1>
              <p className="text-gray-600 mt-1">Track NAV changes for your mutual funds</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImportClick}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Import watchlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                title="Export watchlist"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".json"
            className="hidden"
          />
          {importStatus && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm ${
              importStatus.startsWith('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
            }`}>
              {importStatus}
            </div>
          )}
        </header>

        <div className="mb-8">
          <SearchBar onAddFund={handleAddFund} trackedCodes={trackedCodes} />
        </div>

        <FundList
          funds={funds}
          onRemove={handleRemoveFund}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onViewDetails={handleViewDetails}
        />
      </div>

      {selectedFund && (
        <FundDetailModal
          fund={selectedFund}
          navHistory={selectedNavHistory}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

export default App;
