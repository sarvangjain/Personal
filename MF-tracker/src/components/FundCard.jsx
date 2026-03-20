export default function FundCard({ fund, onRemove, onViewDetails }) {
  const { schemeName, navData, isLoading, error } = fund;

  const formatChange = (value) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getChangeColor = (value) => {
    if (value > 0) return 'text-green-600 bg-green-50';
    if (value < 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getChangeIcon = (value) => {
    if (value > 0) return '↑';
    if (value < 0) return '↓';
    return '–';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-3">
        <h3 className="font-semibold text-gray-800 text-sm leading-tight flex-1">
          {schemeName}
        </h3>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors p-1 -m-1"
          title="Remove from watchlist"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {isLoading ? (
        <div className="mt-4 flex items-center gap-2 text-gray-500">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading NAV data...</span>
        </div>
      ) : error ? (
        <div className="mt-4 text-red-500 text-sm">{error}</div>
      ) : navData ? (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">
              ₹{navData.latestNAV.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500">{navData.latestDate}</span>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-3">
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getChangeColor(navData.weeklyChange)}`}>
                <span>{getChangeIcon(navData.weeklyChange)}</span>
                <span>{formatChange(navData.weeklyChange)}</span>
                <span className="text-gray-500 ml-1">1W</span>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${getChangeColor(navData.monthlyChange)}`}>
                <span>{getChangeIcon(navData.monthlyChange)}</span>
                <span>{formatChange(navData.monthlyChange)}</span>
                <span className="text-gray-500 ml-1">1M</span>
              </div>
            </div>
            <button
              onClick={onViewDetails}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium transition-colors"
            >
              View Chart
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
