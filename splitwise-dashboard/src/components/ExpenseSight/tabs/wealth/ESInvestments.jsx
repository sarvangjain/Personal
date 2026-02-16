/**
 * ESInvestments - Investment portfolio tracking with holdings, transactions, and analytics
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Plus, TrendingUp, PieChart, Lock, Shield, Building, Bitcoin, Gem, 
  Home, Briefcase, FileText, Circle, RefreshCw, Trash2, Edit2, 
  ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight, DollarSign,
  BarChart3, Eye, EyeOff, History
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '../../../../utils/analytics';
import { 
  getInvestments, addInvestment, updateInvestment, deleteInvestment,
  addInvestmentTransaction, getInvestmentTransactions, getPortfolioSummary,
  INVESTMENT_TYPES 
} from '../../../../firebase/expenseSightService';

// Icon mapping
const ICON_MAP = {
  'trending-up': TrendingUp,
  'pie-chart': PieChart,
  lock: Lock,
  shield: Shield,
  building: Building,
  bitcoin: Bitcoin,
  gem: Gem,
  home: Home,
  briefcase: Briefcase,
  'file-text': FileText,
  circle: Circle,
};

// Color mapping for charts
const CHART_COLORS = ['#14b8a6', '#22d3ee', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#6366f1'];

const COLOR_MAP = {
  emerald: 'bg-emerald-500/20 text-emerald-400',
  cyan: 'bg-cyan-500/20 text-cyan-400',
  amber: 'bg-amber-500/20 text-amber-400',
  purple: 'bg-purple-500/20 text-purple-400',
  blue: 'bg-blue-500/20 text-blue-400',
  orange: 'bg-orange-500/20 text-orange-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  stone: 'bg-stone-500/20 text-stone-400',
  teal: 'bg-teal-500/20 text-teal-400',
  indigo: 'bg-indigo-500/20 text-indigo-400',
  gray: 'bg-gray-500/20 text-gray-400',
};

// Portfolio Summary Component
function PortfolioSummary({ summary }) {
  const isPositive = summary.totalGain >= 0;
  
  return (
    <div className="glass-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-stone-300">Portfolio Value</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
        }`}>
          {isPositive ? '+' : ''}{summary.gainPercent?.toFixed(2)}%
        </span>
      </div>
      
      <div>
        <p className="text-2xl font-display text-stone-200">
          {formatCurrency(summary.currentValue, 'INR')}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {isPositive ? (
            <ArrowUpRight size={14} className="text-emerald-400" />
          ) : (
            <ArrowDownRight size={14} className="text-red-400" />
          )}
          <span className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(Math.abs(summary.totalGain), 'INR')}
          </span>
          <span className="text-xs text-stone-500">total {isPositive ? 'gain' : 'loss'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-800">
        <div>
          <p className="text-xs text-stone-500">Invested</p>
          <p className="text-sm text-stone-300">{formatCurrency(summary.totalInvested, 'INR')}</p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Holdings</p>
          <p className="text-sm text-stone-300">{summary.holdingsCount} assets</p>
        </div>
      </div>
    </div>
  );
}

// Asset Allocation Chart
function AssetAllocation({ summary }) {
  const chartData = useMemo(() => {
    return Object.entries(summary.byType || {}).map(([type, data], index) => {
      const typeInfo = INVESTMENT_TYPES.find(t => t.id === type) || { label: type };
      return {
        name: typeInfo.label,
        value: data.current,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    }).filter(d => d.value > 0);
  }, [summary]);

  if (chartData.length === 0) return null;

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3 flex items-center gap-2">
        <PieChart size={16} className="text-cyan-400" />
        Asset Allocation
      </h3>
      
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value) => formatCurrency(value, 'INR')}
              contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: '8px' }}
            />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        {chartData.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-xs text-stone-400 truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Holding Card
function HoldingCard({ investment, onEdit, onDelete, onUpdatePrice, onShowTransactions }) {
  const [showDetails, setShowDetails] = useState(false);
  const typeInfo = INVESTMENT_TYPES.find(t => t.id === investment.type) || INVESTMENT_TYPES[10];
  const Icon = ICON_MAP[typeInfo.icon] || Circle;
  const isPositive = (investment.unrealizedGain || 0) >= 0;

  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${COLOR_MAP[typeInfo.color]}`}>
            <Icon size={18} />
          </div>
          <div>
            <p className="text-sm font-medium text-stone-200">{investment.name}</p>
            <p className="text-xs text-stone-500">{typeInfo.label}</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="p-1 text-stone-500 hover:text-stone-300"
        >
          {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>
      
      <div className="mt-3 flex justify-between items-end">
        <div>
          <p className="text-lg font-display text-stone-200">
            {formatCurrency(investment.currentValue || 0, 'INR')}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            {isPositive ? (
              <ArrowUpRight size={12} className="text-emerald-400" />
            ) : (
              <ArrowDownRight size={12} className="text-red-400" />
            )}
            <span className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(Math.abs(investment.unrealizedGain || 0), 'INR')} ({investment.gainPercent?.toFixed(2)}%)
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-stone-500">{investment.units} units</p>
          <p className="text-xs text-stone-600">@ {formatCurrency(investment.currentPrice || 0, 'INR')}</p>
        </div>
      </div>
      
      {showDetails && (
        <div className="mt-4 pt-3 border-t border-stone-800 space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-stone-500">Avg. Buy Price</p>
              <p className="text-stone-300">{formatCurrency(investment.avgBuyPrice || 0, 'INR')}</p>
            </div>
            <div>
              <p className="text-stone-500">Invested</p>
              <p className="text-stone-300">{formatCurrency(investment.totalInvested || 0, 'INR')}</p>
            </div>
            <div>
              <p className="text-stone-500">Last Updated</p>
              <p className="text-stone-300">{investment.lastUpdated || 'Never'}</p>
            </div>
            {investment.symbol && (
              <div>
                <p className="text-stone-500">Symbol</p>
                <p className="text-stone-300">{investment.symbol}</p>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onUpdatePrice(investment)}
              className="flex-1 py-2 bg-stone-800 text-stone-400 rounded-lg text-xs hover:bg-stone-700 flex items-center justify-center gap-1"
            >
              <DollarSign size={12} /> Update Price
            </button>
            <button
              onClick={() => onShowTransactions(investment)}
              className="flex-1 py-2 bg-stone-800 text-stone-400 rounded-lg text-xs hover:bg-stone-700 flex items-center justify-center gap-1"
            >
              <History size={12} /> History
            </button>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(investment)}
              className="flex-1 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-xs hover:bg-cyan-500/30 flex items-center justify-center gap-1"
            >
              <Edit2 size={12} /> Edit
            </button>
            <button
              onClick={() => onDelete(investment.id)}
              className="flex-1 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30 flex items-center justify-center gap-1"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Investment Form Modal
function InvestmentForm({ isOpen, onClose, onSave, editingInvestment = null }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'mutual_fund',
    symbol: '',
    units: '',
    avgBuyPrice: '',
    currentPrice: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingInvestment) {
      setFormData({
        name: editingInvestment.name || '',
        type: editingInvestment.type || 'mutual_fund',
        symbol: editingInvestment.symbol || '',
        units: editingInvestment.units?.toString() || '',
        avgBuyPrice: editingInvestment.avgBuyPrice?.toString() || '',
        currentPrice: editingInvestment.currentPrice?.toString() || '',
        notes: editingInvestment.notes || '',
      });
    } else {
      setFormData({
        name: '',
        type: 'mutual_fund',
        symbol: '',
        units: '',
        avgBuyPrice: '',
        currentPrice: '',
        notes: '',
      });
    }
  }, [editingInvestment, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.units || !formData.avgBuyPrice) return;
    
    setSaving(true);
    await onSave({
      ...formData,
      units: parseFloat(formData.units),
      avgBuyPrice: parseFloat(formData.avgBuyPrice),
      currentPrice: parseFloat(formData.currentPrice) || parseFloat(formData.avgBuyPrice),
    });
    setSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-4">
          {editingInvestment ? 'Edit Investment' : 'Add Investment'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., HDFC Bank, Axis Bluechip Fund"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          
          {/* Type */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 focus:outline-none focus:border-cyan-500"
            >
              {INVESTMENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>
          </div>
          
          {/* Symbol (optional) */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Symbol (optional)</label>
            <input
              type="text"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              placeholder="e.g., HDFCBANK, AXISBLUECHIP"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          {/* Units & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Units</label>
              <input
                type="number"
                step="0.001"
                value={formData.units}
                onChange={(e) => setFormData({ ...formData, units: e.target.value })}
                placeholder="Quantity"
                className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-stone-500 uppercase tracking-wider">Avg. Buy Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.avgBuyPrice}
                onChange={(e) => setFormData({ ...formData, avgBuyPrice: e.target.value })}
                placeholder="Per unit"
                className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          </div>
          
          {/* Current Price */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Current Price</label>
            <input
              type="number"
              step="0.01"
              value={formData.currentPrice}
              onChange={(e) => setFormData({ ...formData, currentPrice: e.target.value })}
              placeholder="Leave blank to use buy price"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          {/* Notes */}
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Notes (optional)</label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add a note..."
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 placeholder:text-stone-600 focus:outline-none focus:border-cyan-500"
            />
          </div>
          
          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name || !formData.units || !formData.avgBuyPrice}
              className="flex-1 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? 'Saving...' : (editingInvestment ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Update Price Modal
function UpdatePriceModal({ isOpen, onClose, investment, onUpdate }) {
  const [price, setPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (investment) {
      setPrice(investment.currentPrice?.toString() || '');
    }
  }, [investment]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!price) return;
    
    setSaving(true);
    await onUpdate(investment.id, { currentPrice: parseFloat(price) });
    setSaving(false);
    onClose();
  };

  if (!isOpen || !investment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm mx-4 bg-stone-900 border border-stone-700/50 rounded-2xl p-6 animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-4">Update Price</h3>
        <p className="text-sm text-stone-400 mb-4">{investment.name}</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-stone-500 uppercase tracking-wider">Current Price</label>
            <input
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter current price"
              className="w-full mt-1 px-4 py-3 bg-stone-800 border border-stone-700 rounded-xl text-stone-200 focus:outline-none focus:border-cyan-500"
              required
              autoFocus
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !price}
              className="flex-1 py-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Transaction History Modal
function TransactionHistoryModal({ isOpen, onClose, investment, userId }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && investment) {
      setLoading(true);
      getInvestmentTransactions(userId, investment.id)
        .then(setTransactions)
        .finally(() => setLoading(false));
    }
  }, [isOpen, investment, userId]);

  if (!isOpen || !investment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md mx-auto bg-stone-900 border border-stone-700/50 rounded-t-3xl sm:rounded-3xl p-6 max-h-[80vh] overflow-hidden animate-slide-up">
        <h3 className="text-lg font-display text-stone-200 mb-2">Transaction History</h3>
        <p className="text-sm text-stone-400 mb-4">{investment.name}</p>
        
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-stone-500 py-4">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-stone-500 py-4">No transactions yet</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg">
                <div>
                  <p className={`text-sm font-medium ${
                    tx.type === 'buy' ? 'text-emerald-400' : 
                    tx.type === 'sell' ? 'text-red-400' : 'text-amber-400'
                  }`}>
                    {tx.type.toUpperCase()}
                  </p>
                  <p className="text-xs text-stone-500">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-stone-300">{tx.units} units</p>
                  <p className="text-xs text-stone-500">@ {formatCurrency(tx.pricePerUnit, 'INR')}</p>
                </div>
              </div>
            ))
          )}
        </div>
        
        <button
          onClick={onClose}
          className="w-full mt-4 py-3 bg-stone-800 text-stone-400 rounded-xl hover:bg-stone-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

// Main Component
export default function ESInvestments({ userId, onRefresh }) {
  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState({ totalInvested: 0, currentValue: 0, totalGain: 0, gainPercent: 0, byType: {}, holdingsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingInvestment, setEditingInvestment] = useState(null);
  const [updatePriceInvestment, setUpdatePriceInvestment] = useState(null);
  const [transactionInvestment, setTransactionInvestment] = useState(null);
  const [hideValues, setHideValues] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [invData, summaryData] = await Promise.all([
        getInvestments(userId, { useCache: false }),
        getPortfolioSummary(userId),
      ]);
      setInvestments(invData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading investments:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers
  const handleSave = async (data) => {
    if (editingInvestment) {
      await updateInvestment(userId, editingInvestment.id, data);
    } else {
      await addInvestment(userId, data);
    }
    setEditingInvestment(null);
    loadData();
    if (onRefresh) onRefresh();
  };

  const handleEdit = (investment) => {
    setEditingInvestment(investment);
    setShowForm(true);
  };

  const handleDelete = async (investmentId) => {
    if (window.confirm('Delete this investment?')) {
      await deleteInvestment(userId, investmentId);
      loadData();
      if (onRefresh) onRefresh();
    }
  };

  const handleUpdatePrice = async (investmentId, data) => {
    await updateInvestment(userId, investmentId, data);
    loadData();
    if (onRefresh) onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200 flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-400" />
            Investments
          </h2>
          <p className="text-xs text-stone-500">Track your portfolio</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setHideValues(!hideValues)}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200"
          >
            {hideValues ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button
            onClick={loadData}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setEditingInvestment(null); setShowForm(true); }}
            className="px-4 py-2 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500 flex items-center gap-2 text-sm"
          >
            <Plus size={16} /> Add
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-stone-500">Loading...</div>
      ) : (
        <>
          {/* Portfolio Summary */}
          <PortfolioSummary summary={hideValues ? { ...summary, currentValue: 0, totalGain: 0, totalInvested: 0 } : summary} />
          
          {/* Asset Allocation */}
          {Object.keys(summary.byType || {}).length > 0 && (
            <AssetAllocation summary={summary} />
          )}
          
          {/* Holdings */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-stone-400">Holdings</h3>
            {investments.length === 0 ? (
              <div className="text-center py-8">
                <BarChart3 size={32} className="mx-auto text-stone-600 mb-2" />
                <p className="text-stone-500 text-sm">No investments yet</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-3 px-4 py-2 bg-cyan-600/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-600/30"
                >
                  Add your first investment
                </button>
              </div>
            ) : (
              investments.map((investment) => (
                <HoldingCard
                  key={investment.id}
                  investment={hideValues ? { ...investment, currentValue: 0, unrealizedGain: 0, totalInvested: 0 } : investment}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onUpdatePrice={(inv) => setUpdatePriceInvestment(inv)}
                  onShowTransactions={(inv) => setTransactionInvestment(inv)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Modals */}
      <InvestmentForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingInvestment(null); }}
        onSave={handleSave}
        editingInvestment={editingInvestment}
      />
      
      <UpdatePriceModal
        isOpen={!!updatePriceInvestment}
        onClose={() => setUpdatePriceInvestment(null)}
        investment={updatePriceInvestment}
        onUpdate={handleUpdatePrice}
      />
      
      <TransactionHistoryModal
        isOpen={!!transactionInvestment}
        onClose={() => setTransactionInvestment(null)}
        investment={transactionInvestment}
        userId={userId}
      />
    </div>
  );
}
