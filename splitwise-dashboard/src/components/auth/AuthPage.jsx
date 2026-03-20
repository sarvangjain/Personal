import { useState } from 'react';
import { Wallet, ArrowLeft } from 'lucide-react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function AuthPage({ onBack, onSuccess }) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'signup'
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Back button */}
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm text-stone-400 hover:text-stone-200 transition-colors"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-2xl shadow-emerald-500/20">
            <Wallet size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-stone-100">ExpenseSight</h1>
          <p className="text-stone-500 text-sm mt-2">Personal Expense Tracker</p>
        </div>

        {/* Main Card */}
        <div className="glass-card p-6 sm:p-8 animate-fade-in">
          {/* Tabs */}
          <div className="flex mb-6 bg-stone-800/50 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('login')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'login'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setActiveTab('signup')}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'signup'
                  ? 'bg-stone-700 text-stone-100 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Forms */}
          {activeTab === 'login' ? (
            <LoginForm 
              onForgotPassword={() => setShowForgotPassword(true)}
              onSuccess={onSuccess}
            />
          ) : (
            <SignupForm onSuccess={onSuccess} />
          )}
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center">
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
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPasswordModal
          onClose={() => setShowForgotPassword(false)}
          onBack={() => setShowForgotPassword(false)}
        />
      )}
    </div>
  );
}
