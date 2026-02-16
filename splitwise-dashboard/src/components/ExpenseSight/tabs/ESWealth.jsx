/**
 * ESWealth - Main wealth tab with dashboard overview and sub-navigation
 * Groups: Income, Investments, Savings
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Wallet, TrendingUp, BarChart3, Target, PiggyBank, ArrowUpRight, ArrowDownRight,
  DollarSign, Briefcase, Percent, ChevronRight, Sparkles
} from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { 
  getIncome, getIncomeStats, getInvestments, getPortfolioSummary, getGoals
} from '../../../firebase/expenseSightService';

// Sub-tab components
import ESIncome from './wealth/ESIncome';
import ESInvestments from './wealth/ESInvestments';
import ESSavings from './wealth/ESSavings';

// Chart colors
const CHART_COLORS = {
  income: '#10b981',
  investments: '#06b6d4',
  savings: '#14b8a6',
};

// Sub-tab configuration
const SUB_TABS = [
  { id: 'overview', label: 'Overview', icon: Wallet },
  { id: 'income', label: 'Income', icon: DollarSign },
  { id: 'investments', label: 'Investments', icon: BarChart3 },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
];

// Net Worth Card
function NetWorthCard({ netWorth, monthlyChange, isPositive }) {
  return (
    <div className="glass-card p-5 bg-gradient-to-br from-teal-900/20 to-cyan-900/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-stone-500 uppercase tracking-wider">Net Worth</span>
        {monthlyChange !== 0 && (
          <span className={`text-xs flex items-center gap-1 ${
            isPositive ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {isPositive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {formatCurrency(Math.abs(monthlyChange), 'INR')} this month
          </span>
        )}
      </div>
      <p className="text-3xl font-display text-stone-100">
        {formatCurrency(netWorth, 'INR')}
      </p>
    </div>
  );
}

// Summary Stat Card
function StatCard({ title, value, subtitle, icon: Icon, color = 'teal', onClick }) {
  const colorClasses = {
    teal: 'bg-teal-500/20 text-teal-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  return (
    <button
      onClick={onClick}
      className="glass-card p-4 text-left w-full hover:bg-stone-800/50 transition-colors group"
    >
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-xl ${colorClasses[color]}`}>
          <Icon size={18} />
        </div>
        <ChevronRight size={16} className="text-stone-600 group-hover:text-stone-400 transition-colors" />
      </div>
      <p className="text-lg font-display text-stone-200 mt-3">{value}</p>
      <p className="text-xs text-stone-500 mt-0.5">{title}</p>
      {subtitle && <p className="text-[10px] text-stone-600 mt-0.5">{subtitle}</p>}
    </button>
  );
}

// Wealth Distribution Chart
function WealthDistribution({ income, investments, savings }) {
  const total = income + investments + savings;
  if (total === 0) return null;

  const data = [
    { name: 'Income (Month)', value: income, color: CHART_COLORS.income },
    { name: 'Investments', value: investments, color: CHART_COLORS.investments },
    { name: 'Savings', value: savings, color: CHART_COLORS.savings },
  ].filter(d => d.value > 0);

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3">Wealth Distribution</h3>
      
      <div className="flex items-center gap-4">
        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={40}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => formatCurrency(value, 'INR')}
                contentStyle={{ background: '#1c1917', border: '1px solid #44403c', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-stone-400">{item.name}</span>
              </div>
              <span className="text-xs text-stone-300">{formatCurrency(item.value, 'INR')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Quick Actions
function QuickActions({ onNavigate }) {
  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-medium text-stone-300 mb-3">Quick Actions</h3>
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => onNavigate('income')}
          className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl text-xs hover:bg-emerald-500/20 flex flex-col items-center gap-1"
        >
          <DollarSign size={18} />
          Add Income
        </button>
        <button
          onClick={() => onNavigate('investments')}
          className="p-3 bg-cyan-500/10 text-cyan-400 rounded-xl text-xs hover:bg-cyan-500/20 flex flex-col items-center gap-1"
        >
          <BarChart3 size={18} />
          Track Investment
        </button>
        <button
          onClick={() => onNavigate('savings')}
          className="p-3 bg-teal-500/10 text-teal-400 rounded-xl text-xs hover:bg-teal-500/20 flex flex-col items-center gap-1"
        >
          <PiggyBank size={18} />
          Add to Goal
        </button>
      </div>
    </div>
  );
}

// Overview Dashboard
function WealthDashboard({ userId, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    monthlyIncome: 0,
    portfolioValue: 0,
    portfolioGain: 0,
    totalSaved: 0,
    savingsTarget: 0,
    goalsCount: 0,
    autoSavingGoals: 0,
  });

  const loadData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    
    try {
      // Load all data in parallel
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      const [incomeList, portfolioSummary, goals] = await Promise.all([
        getIncome(userId, { startDate: format(monthStart, 'yyyy-MM-dd'), endDate: format(monthEnd, 'yyyy-MM-dd') }),
        getPortfolioSummary(userId),
        getGoals(userId),
      ]);
      
      const activeGoals = goals.filter(g => g.isActive);
      
      setData({
        monthlyIncome: incomeList.reduce((sum, i) => sum + (i.amount || 0), 0),
        portfolioValue: portfolioSummary.currentValue || 0,
        portfolioGain: portfolioSummary.totalGain || 0,
        totalSaved: activeGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0),
        savingsTarget: activeGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0),
        goalsCount: activeGoals.length,
        autoSavingGoals: activeGoals.filter(g => (g.autoAllocatePercent || 0) > 0).length,
      });
    } catch (error) {
      console.error('Error loading wealth data:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate net worth
  const netWorth = data.portfolioValue + data.totalSaved;
  const isGainPositive = data.portfolioGain >= 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="glass-card p-5 animate-pulse">
          <div className="h-6 bg-stone-800 rounded w-1/3 mb-2" />
          <div className="h-8 bg-stone-800 rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Net Worth */}
      <NetWorthCard 
        netWorth={netWorth} 
        monthlyChange={data.portfolioGain}
        isPositive={isGainPositive}
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="This Month"
          value={formatCurrency(data.monthlyIncome, 'INR')}
          subtitle="Income earned"
          icon={Briefcase}
          color="emerald"
          onClick={() => onNavigate('income')}
        />
        <StatCard
          title="Portfolio"
          value={formatCurrency(data.portfolioValue, 'INR')}
          subtitle={`${isGainPositive ? '+' : ''}${formatCurrency(data.portfolioGain, 'INR')} gain`}
          icon={TrendingUp}
          color="cyan"
          onClick={() => onNavigate('investments')}
        />
        <StatCard
          title="Saved"
          value={formatCurrency(data.totalSaved, 'INR')}
          subtitle={`${data.goalsCount} goals`}
          icon={PiggyBank}
          color="teal"
          onClick={() => onNavigate('savings')}
        />
        <StatCard
          title="Savings Rate"
          value={data.monthlyIncome > 0 
            ? `${Math.round((data.totalSaved / data.monthlyIncome) * 100)}%` 
            : '0%'}
          subtitle={`${data.autoSavingGoals} auto-saving`}
          icon={Percent}
          color="amber"
          onClick={() => onNavigate('savings')}
        />
      </div>

      {/* Wealth Distribution */}
      <WealthDistribution 
        income={data.monthlyIncome}
        investments={data.portfolioValue}
        savings={data.totalSaved}
      />

      {/* Quick Actions */}
      <QuickActions onNavigate={onNavigate} />
    </div>
  );
}

// Main Component
export default function ESWealth({ userId }) {
  const [activeSubTab, setActiveSubTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleNavigate = (tab) => {
    setActiveSubTab(tab);
  };

  // Render current sub-tab
  const renderSubTab = () => {
    switch (activeSubTab) {
      case 'income':
        return <ESIncome userId={userId} onRefresh={handleRefresh} />;
      case 'investments':
        return <ESInvestments userId={userId} onRefresh={handleRefresh} />;
      case 'savings':
        return <ESSavings userId={userId} onRefresh={handleRefresh} />;
      default:
        return <WealthDashboard userId={userId} onNavigate={handleNavigate} key={refreshKey} />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Sub-navigation */}
      <div className="flex gap-1 p-1 bg-stone-800/50 rounded-xl overflow-x-auto scrollbar-hide">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      {renderSubTab()}
    </div>
  );
}
