/**
 * ESHeader - ExpenseSight app header with hamburger menu
 */

import { useState } from 'react';
import { Menu, Plus, X, ArrowLeft, Settings, HelpCircle, Info } from 'lucide-react';

// Slide-out menu
function SlideMenu({ isOpen, onClose, onBackToSplitSight }) {
  if (!isOpen) return null;
  
  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Menu panel */}
      <div className="fixed top-0 left-0 h-full w-72 bg-stone-900 border-r border-stone-800/50 z-50 animate-slide-in-left safe-top">
        <div className="p-4 pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-display text-stone-200">ExpenseSight</h2>
                <p className="text-xs text-stone-500">Personal Tracker</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800/50"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Menu items */}
          <div className="space-y-1">
            <button
              onClick={() => { onBackToSplitSight(); onClose(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-300 hover:bg-stone-800/50 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back to SplitSight</span>
            </button>
            
            <div className="h-px bg-stone-800 my-3" />
            
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-400 hover:bg-stone-800/50 transition-colors">
              <Settings size={20} />
              <span className="text-sm">Settings</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-400 hover:bg-stone-800/50 transition-colors">
              <HelpCircle size={20} />
              <span className="text-sm">Help & Support</span>
            </button>
            
            <button className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-stone-400 hover:bg-stone-800/50 transition-colors">
              <Info size={20} />
              <span className="text-sm">About</span>
            </button>
          </div>
        </div>
        
        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-stone-800/50 safe-bottom">
          <p className="text-xs text-stone-600 text-center">ExpenseSight v1.0</p>
        </div>
      </div>
    </>
  );
}

export default function ESHeader({ onClose, onAddExpense, title = 'ExpenseSight' }) {
  const [menuOpen, setMenuOpen] = useState(false);
  
  return (
    <>
      <header className="flex-shrink-0 bg-stone-950/95 backdrop-blur-xl border-b border-stone-800/50">
        {/* Safe area padding at top */}
        <div className="safe-top" />
        
        <div className="flex items-center justify-between px-4 py-3">
          {/* Hamburger menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-2.5 -ml-1 rounded-xl text-stone-400 hover:text-stone-200 hover:bg-stone-800/50 transition-all"
          >
            <Menu size={22} />
          </button>

          {/* Centered Title */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
            <h1 className="text-lg font-display text-stone-200">{title}</h1>
          </div>

          {/* Add expense button */}
          <button
            onClick={onAddExpense}
            className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors"
          >
            <Plus size={20} />
          </button>
        </div>
      </header>
      
      {/* Slide-out menu */}
      <SlideMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)}
        onBackToSplitSight={onClose}
      />
    </>
  );
}
