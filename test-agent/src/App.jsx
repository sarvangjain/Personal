import React, { useState } from 'react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Plus, Trash2, TrendingDown, Wallet, Target } from 'lucide-react'
import './App.css'

const CATEGORIES = ['Food', 'Transport', 'Entertainment', 'Utilities', 'Shopping', 'Health']
const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

export default function App() {
  const [expenses, setExpenses] = useState([
    { id: 1, category: 'Food', amount: 45.99, date: '2026-03-01', description: 'Lunch' },
    { id: 2, category: 'Transport', amount: 15, date: '2026-03-02', description: 'Gas' },
    { id: 3, category: 'Entertainment', amount: 29.99, date: '2026-03-03', description: 'Movie tickets' },
  ])
  const [budget, setBudget] = useState(500)
  const [formData, setFormData] = useState({
    category: 'Food',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const remaining = budget - totalExpenses
  const categoryData = CATEGORIES.map(cat => ({
    name: cat,
    value: expenses
      .filter(exp => exp.category === cat)
      .reduce((sum, exp) => sum + exp.amount, 0)
  })).filter(item => item.value > 0)

  const addExpense = () => {
    if (formData.amount && formData.category) {
      setExpenses([
        ...expenses,
        {
          id: Date.now(),
          category: formData.category,
          amount: parseFloat(formData.amount),
          date: formData.date,
          description: formData.description || 'No description'
        }
      ])
      setFormData({
        category: 'Food',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: ''
      })
    }
  }

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(exp => exp.id !== id))
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <Wallet size={32} />
            <h1>FinanceHub</h1>
          </div>
          <p>Manage your finances with ease</p>
        </div>
      </header>

      <main className="container">
        <div className="grid">
          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card budget">
              <div className="stat-icon">
                <Target size={24} />
              </div>
              <div className="stat-content">
                <h3>Budget</h3>
                <p className="stat-amount">${budget.toFixed(2)}</p>
              </div>
            </div>

            <div className="stat-card spent">
              <div className="stat-icon">
                <TrendingDown size={24} />
              </div>
              <div className="stat-content">
                <h3>Spent</h3>
                <p className="stat-amount">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>

            <div className={`stat-card remaining ${remaining >= 0 ? 'positive' : 'negative'}`}>
              <div className="stat-icon">
                <Wallet size={24} />
              </div>
              <div className="stat-content">
                <h3>Remaining</h3>
                <p className="stat-amount">${remaining.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <h3>Budget Usage</h3>
            <div className="progress-container">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min((totalExpenses / budget) * 100, 100)}%`,
                    backgroundColor: remaining >= 0 ? '#10b981' : '#ef4444'
                  }}
                />
              </div>
              <p className="progress-text">
                {((totalExpenses / budget) * 100).toFixed(1)}% used
              </p>
            </div>
          </div>

          {/* Add Expense Form */}
          <div className="form-section">
            <h2>Add New Expense</h2>
            <div className="form-grid">
              <input
                type="number"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                min="0"
                step="0.01"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
              <input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
              <button onClick={addExpense} className="btn-primary">
                <Plus size={20} /> Add Expense
              </button>
              <input
                type="number"
                placeholder="Set Budget"
                value={budget}
                onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                min="0"
                step="10"
                className="budget-input"
              />
            </div>
          </div>

          {/* Charts */}
          <div className="charts-grid">
            {categoryData.length > 0 && (
              <div className="chart-card">
                <h3>Expenses by Category</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({name, value}) => `${name}: $${value.toFixed(2)}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[CATEGORIES.indexOf(entry.name)]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {categoryData.length > 0 && (
              <div className="chart-card">
                <h3>Spending Breakdown</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `$${value.toFixed(2)}`} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Expenses List */}
          <div className="expenses-section">
            <h2>Recent Expenses ({expenses.length})</h2>
            <div className="expenses-list">
              {expenses.length === 0 ? (
                <p className="empty-state">No expenses yet. Start tracking your spending!</p>
              ) : (
                expenses.map(expense => (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-info">
                      <span className="expense-category" style={{
                        backgroundColor: COLORS[CATEGORIES.indexOf(expense.category)]
                      }}>
                        {expense.category}
                      </span>
                      <div>
                        <p className="expense-description">{expense.description}</p>
                        <p className="expense-date">{new Date(expense.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="expense-actions">
                      <span className="expense-amount">${expense.amount.toFixed(2)}</span>
                      <button
                        onClick={() => deleteExpense(expense.id)}
                        className="btn-delete"
                        title="Delete expense"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
