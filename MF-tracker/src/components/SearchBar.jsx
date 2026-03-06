import { useState, useEffect, useRef } from 'react';
import { searchFunds } from '../utils/api';

export default function SearchBar({ onAddFund, trackedCodes }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        try {
          const data = await searchFunds(query);
          setResults(data);
          setShowDropdown(true);
        } catch (err) {
          console.error('Search failed:', err);
          setResults([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleSelect = (fund) => {
    onAddFund({
      schemeCode: fund.schemeCode,
      schemeName: fund.schemeName,
    });
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  const isTracked = (code) => trackedCodes.includes(code);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowDropdown(true)}
          placeholder="Search mutual funds..."
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {results.map((fund) => (
            <button
              key={fund.schemeCode}
              onClick={() => !isTracked(fund.schemeCode) && handleSelect(fund)}
              disabled={isTracked(fund.schemeCode)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                isTracked(fund.schemeCode)
                  ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  : 'hover:bg-blue-50 cursor-pointer'
              }`}
            >
              <div className="font-medium text-sm">{fund.schemeName}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Code: {fund.schemeCode}
                {isTracked(fund.schemeCode) && (
                  <span className="ml-2 text-green-600">(Already tracked)</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
