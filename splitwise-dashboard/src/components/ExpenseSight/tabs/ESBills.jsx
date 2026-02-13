/**
 * ESBills - Bills & Reminders tab
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Plus, CreditCard, Calendar, List, Loader2, 
  RefreshCw, AlertCircle, Clock
} from 'lucide-react';
import { differenceInDays, parseISO, isPast, isToday } from 'date-fns';
import { formatCurrency } from '../../../utils/analytics';
import { 
  getBills, 
  createBill, 
  updateBill, 
  deleteBill, 
  markBillPaid 
} from '../../../firebase/expenseSightService';
import BillCard from '../components/BillCard';
import BillForm from '../components/BillForm';
import BillsCalendar from '../components/BillsCalendar';

export default function ESBills({ userId }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [error, setError] = useState(null);

  // Load bills
  const loadBills = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await getBills(userId);
      setBills(data.filter(b => b.isActive));
    } catch (err) {
      console.error('Error loading bills:', err);
      setError('Failed to load bills');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  // Create or update bill
  const handleSaveBill = useCallback(async (billData) => {
    if (!userId) return;
    
    if (editingBill) {
      const result = await updateBill(userId, editingBill.id, billData);
      if (!result.success) throw new Error(result.error);
    } else {
      const result = await createBill(userId, billData);
      if (!result.success) throw new Error(result.error);
    }
    
    await loadBills();
    setEditingBill(null);
  }, [userId, editingBill, loadBills]);

  // Delete bill
  const handleDeleteBill = useCallback(async (billId) => {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to delete this bill?')) return;
    
    const result = await deleteBill(userId, billId);
    if (result.success) {
      setBills(prev => prev.filter(b => b.id !== billId));
    }
  }, [userId]);

  // Mark bill as paid
  const handleMarkPaid = useCallback(async (billId) => {
    if (!userId) return;
    
    const result = await markBillPaid(userId, billId);
    if (result.success) {
      await loadBills();
    }
  }, [userId, loadBills]);

  // Open edit form
  const handleEditBill = useCallback((bill) => {
    setEditingBill(bill);
    setShowForm(true);
  }, []);

  // Categorize bills
  const categorizedBills = bills.reduce((acc, bill) => {
    const dueDate = parseISO(bill.nextDueDate);
    const daysUntilDue = differenceInDays(dueDate, new Date());
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);
    
    if (isOverdue) {
      acc.overdue.push(bill);
    } else if (isDueToday) {
      acc.dueToday.push(bill);
    } else if (daysUntilDue <= 7) {
      acc.upcoming.push(bill);
    } else {
      acc.later.push(bill);
    }
    
    return acc;
  }, { overdue: [], dueToday: [], upcoming: [], later: [] });

  // Stats
  const totalMonthly = bills
    .filter(b => b.frequency === 'monthly')
    .reduce((sum, b) => sum + b.amount, 0);
  const overdueAmount = categorizedBills.overdue.reduce((sum, b) => sum + b.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="text-teal-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display text-stone-200">Bills & Reminders</h2>
          <p className="text-xs text-stone-500">{bills.length} active bills</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadBills}
            className="p-2 rounded-xl bg-stone-800/50 text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition-colors"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => { setEditingBill(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Bill
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex bg-stone-800/30 rounded-xl p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'list' 
              ? 'bg-teal-500/20 text-teal-400' 
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <List size={16} />
          List
        </button>
        <button
          onClick={() => setViewMode('calendar')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === 'calendar' 
              ? 'bg-teal-500/20 text-teal-400' 
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Calendar size={16} />
          Calendar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-stone-800/30 rounded-xl">
          <p className="text-xs text-stone-500">Monthly Bills</p>
          <p className="text-xl font-display text-stone-200 mt-1">
            {formatCurrency(totalMonthly, 'INR')}
          </p>
        </div>
        {overdueAmount > 0 ? (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle size={12} />
              Overdue
            </p>
            <p className="text-xl font-display text-red-400 mt-1">
              {formatCurrency(overdueAmount, 'INR')}
            </p>
          </div>
        ) : (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-xs text-emerald-400">All caught up!</p>
            <p className="text-lg font-display text-emerald-400 mt-1">No overdue bills</p>
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Content */}
      {bills.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-stone-800/50 flex items-center justify-center">
            <CreditCard size={28} className="text-stone-500" />
          </div>
          <div>
            <p className="text-stone-400">No bills set up yet</p>
            <p className="text-xs text-stone-600 mt-1">Add your recurring bills to get reminders</p>
          </div>
          <button
            onClick={() => { setEditingBill(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus size={16} />
            Add Your First Bill
          </button>
        </div>
      ) : viewMode === 'calendar' ? (
        <BillsCalendar
          bills={bills}
          onMarkPaid={handleMarkPaid}
          onEditBill={handleEditBill}
        />
      ) : (
        <div className="space-y-6">
          {/* Overdue Bills */}
          {categorizedBills.overdue.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-red-400 flex items-center gap-2 mb-3">
                <AlertCircle size={16} />
                Overdue ({categorizedBills.overdue.length})
              </h3>
              <div className="space-y-3">
                {categorizedBills.overdue.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onMarkPaid={handleMarkPaid}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Due Today */}
          {categorizedBills.dueToday.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-3">
                <Clock size={16} />
                Due Today ({categorizedBills.dueToday.length})
              </h3>
              <div className="space-y-3">
                {categorizedBills.dueToday.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onMarkPaid={handleMarkPaid}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {categorizedBills.upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-400 mb-3">
                Upcoming ({categorizedBills.upcoming.length})
              </h3>
              <div className="space-y-3">
                {categorizedBills.upcoming.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onMarkPaid={handleMarkPaid}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Later */}
          {categorizedBills.later.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-stone-500 mb-3">
                Later ({categorizedBills.later.length})
              </h3>
              <div className="space-y-3">
                {categorizedBills.later.map(bill => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onMarkPaid={handleMarkPaid}
                    onEdit={handleEditBill}
                    onDelete={handleDeleteBill}
                    compact
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bill Form Modal */}
      <BillForm
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingBill(null); }}
        onSave={handleSaveBill}
        editingBill={editingBill}
      />
    </div>
  );
}
