/**
 * ExpenseSightLauncher - Handles the morph animation and full-screen takeover
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ExpenseSightApp from './ExpenseSightApp';

export default function ExpenseSightLauncher({ 
  isOpen, 
  onClose, 
  userId,
  originRect 
}) {
  const [animationState, setAnimationState] = useState('closed'); // closed, entering, open, exiting

  // Handle opening animation
  useEffect(() => {
    if (isOpen && animationState === 'closed') {
      setAnimationState('entering');
      
      // After animation completes, set to open
      const timer = setTimeout(() => {
        setAnimationState('open');
      }, 400);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationState]);

  // Handle closing animation
  const handleClose = () => {
    setAnimationState('exiting');
    
    // After exit animation, actually close
    setTimeout(() => {
      setAnimationState('closed');
      onClose();
    }, 300);
  };

  // Reset when closed externally
  useEffect(() => {
    if (!isOpen && animationState !== 'closed') {
      setAnimationState('closed');
    }
  }, [isOpen, animationState]);

  if (animationState === 'closed') return null;

  const content = (
    <div className="fixed inset-0 z-[100] overflow-hidden">
      {/* Animated background */}
      <div 
        className={`absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 ${
          animationState === 'entering' ? 'animate-morph-expand' : 
          animationState === 'exiting' ? 'animate-morph-collapse' : ''
        }`}
        style={originRect && animationState === 'entering' ? {
          transformOrigin: `${originRect.left + originRect.width / 2}px ${originRect.top + originRect.height / 2}px`
        } : undefined}
      />
      
      {/* Content container - uses fixed to escape stacking context issues */}
      <div 
        className={`fixed inset-0 ${
          animationState === 'entering' ? 'animate-content-fade-in' :
          animationState === 'exiting' ? 'animate-content-fade-out' :
          'opacity-100'
        }`}
      >
        <ExpenseSightApp 
          userId={userId} 
          onClose={handleClose}
        />
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
