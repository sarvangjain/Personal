import { useState } from 'react';
import { Wallet, Mail, Key, ArrowRight, Sparkles, PieChart, Target, Receipt } from 'lucide-react';
import { AuthPage } from './auth';
import SetupPage from './SetupPage';

export default function LandingPage({ onAuthSuccess }) {
  const [view, setView] = useState('landing'); // 'landing' | 'email' | 'splitwise'

  if (view === 'email') {
    return (
      <AuthPage 
        onBack={() => setView('landing')} 
        onSuccess={onAuthSuccess}
      />
    );
  }

  if (view === 'splitwise') {
    return <SetupPage onComplete={onAuthSuccess} onBack={() => setView('landing')} />;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-5 shadow-2xl shadow-emerald-500/25">
            <Wallet size={36} className="text-white" />
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-stone-100">SplitSight</h1>
          <p className="text-stone-400 text-sm mt-3 max-w-xs mx-auto">
            Smart expense tracking and Splitwise analytics in one place
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="glass-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <PieChart size={20} className="text-emerald-400" />
            </div>
            <p className="text-xs text-stone-400">Smart Analytics</p>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
              <Target size={20} className="text-purple-400" />
            </div>
            <p className="text-xs text-stone-400">Budget Goals</p>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <Receipt size={20} className="text-amber-400" />
            </div>
            <p className="text-xs text-stone-400">Bill Tracking</p>
          </div>
          <div className="glass-card p-4 text-center">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles size={20} className="text-teal-400" />
            </div>
            <p className="text-xs text-stone-400">AI Insights</p>
          </div>
        </div>

        {/* Auth Options */}
        <div className="space-y-3">
          {/* Email Sign In - For ExpenseSight */}
          <button
            onClick={() => setView('email')}
            className="w-full glass-card p-5 flex items-center gap-4 hover:border-emerald-500/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Mail size={22} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-stone-200 flex items-center gap-2">
                Continue with Email
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/15 text-emerald-400 rounded-full uppercase tracking-wider">
                  Quick
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Track personal expenses with ExpenseSight
              </p>
            </div>
            <ArrowRight size={18} className="text-stone-600 group-hover:text-emerald-400 transition-colors" />
          </button>

          {/* Splitwise Connection - Full Dashboard */}
          <button
            onClick={() => setView('splitwise')}
            className="w-full glass-card p-5 flex items-center gap-4 hover:border-teal-500/30 transition-all group"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Key size={22} className="text-white" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium text-stone-200 flex items-center gap-2">
                Connect Splitwise
                <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-teal-500/15 text-teal-400 rounded-full uppercase tracking-wider">
                  Full Access
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Analytics dashboard + ExpenseSight + all features
              </p>
            </div>
            <ArrowRight size={18} className="text-stone-600 group-hover:text-teal-400 transition-colors" />
          </button>
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-stone-800/30 rounded-xl border border-stone-800/40">
          <p className="text-[11px] text-stone-500 leading-relaxed text-center">
            <span className="text-stone-400">Email sign-in</span> gives you access to ExpenseSight for personal expense tracking.{' '}
            <span className="text-stone-400">Splitwise connection</span> unlocks the full analytics dashboard with group expenses, settle-up suggestions, and more.
          </p>
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
    </div>
  );
}
