import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getChartData } from '../utils/api';

export default function FundDetailModal({ fund, navHistory, onClose }) {
  const [period, setPeriod] = useState('1M');
  const [customDays, setCustomDays] = useState('');
  const [chartData, setChartData] = useState([]);

  const getDays = () => {
    if (period === '1W') return 7;
    if (period === '1M') return 30;
    if (period === '3M') return 90;
    if (period === 'custom') return parseInt(customDays) || 30;
    return 30;
  };

  useEffect(() => {
    if (navHistory) {
      const days = getDays();
      const data = getChartData(navHistory, days);
      setChartData(data);
    }
  }, [navHistory, period, customDays]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const { navData } = fund;

  const minNav = chartData.length > 0 ? Math.min(...chartData.map((d) => d.nav)) : 0;
  const maxNav = chartData.length > 0 ? Math.max(...chartData.map((d) => d.nav)) : 0;
  const padding = (maxNav - minNav) * 0.1 || 1;

  const periodChange = chartData.length >= 2
    ? ((chartData[chartData.length - 1].nav - chartData[0].nav) / chartData[0].nav) * 100
    : 0;

  const getPeriodLabel = () => {
    if (period === '1W') return '7 days';
    if (period === '1M') return '30 days';
    if (period === '3M') return '90 days';
    if (period === 'custom' && customDays) return `${customDays} days`;
    return '';
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-100">
          <div className="flex justify-between items-start gap-4">
            <div>
              <h2 className="font-bold text-lg text-gray-900 leading-tight">
                {fund.schemeName}
              </h2>
              <p className="text-sm text-gray-500 mt-1">Code: {fund.schemeCode}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-5">
          {navData && (
            <div className="mb-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-bold text-gray-900">
                  ₹{navData.latestNAV.toFixed(2)}
                </span>
                <span className="text-sm text-gray-500">{navData.latestDate}</span>
              </div>
              <div className="flex gap-4 mt-3">
                <div className={`text-sm ${navData.weeklyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-medium">1W:</span>{' '}
                  {navData.weeklyChange >= 0 ? '+' : ''}{navData.weeklyChange.toFixed(2)}%
                </div>
                <div className={`text-sm ${navData.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <span className="font-medium">1M:</span>{' '}
                  {navData.monthlyChange >= 0 ? '+' : ''}{navData.monthlyChange.toFixed(2)}%
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <button
              onClick={() => setPeriod('1W')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === '1W'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1W
            </button>
            <button
              onClick={() => setPeriod('1M')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === '1M'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => setPeriod('3M')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                period === '3M'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              3M
            </button>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min="1"
                max="365"
                placeholder="Days"
                value={customDays}
                onChange={(e) => {
                  setCustomDays(e.target.value);
                  if (e.target.value) setPeriod('custom');
                }}
                onFocus={() => setPeriod('custom')}
                className={`w-20 px-3 py-2 text-sm rounded-lg border transition-colors outline-none ${
                  period === 'custom'
                    ? 'border-blue-600 ring-1 ring-blue-600'
                    : 'border-gray-200 focus:border-blue-600'
                }`}
              />
              <span className="text-sm text-gray-500">days</span>
            </div>
          </div>

          {chartData.length >= 2 && (
            <div className={`mb-4 px-3 py-2 rounded-lg inline-flex items-center gap-2 ${
              periodChange >= 0 ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <span className={`text-lg font-bold ${periodChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {periodChange >= 0 ? '↑' : '↓'} {periodChange >= 0 ? '+' : ''}{periodChange.toFixed(2)}%
              </span>
              <span className="text-sm text-gray-600">
                in last {getPeriodLabel()}
              </span>
            </div>
          )}

          <div className="h-64 w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                  />
                  <YAxis
                    domain={[minNav - padding, maxNav + padding]}
                    tick={{ fontSize: 11, fill: '#6b7280' }}
                    tickLine={false}
                    axisLine={{ stroke: '#e5e7eb' }}
                    tickFormatter={(val) => `₹${val.toFixed(0)}`}
                    width={55}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value) => [`₹${value.toFixed(2)}`, 'NAV']}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.fullDate || label
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="nav"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, fill: '#2563eb' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                No data available for this period
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
