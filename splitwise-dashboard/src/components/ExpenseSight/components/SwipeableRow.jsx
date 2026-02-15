/**
 * SwipeableRow - A row component that supports horizontal swipe gestures
 * Swipe left to reveal delete, swipe right to reveal edit
 * Includes haptic-like visual feedback and spring-back animation
 */

import { useState, useRef, useCallback } from 'react';
import { Edit2, Trash2 } from 'lucide-react';

const SWIPE_THRESHOLD = 70;  // px to trigger action
const MAX_SWIPE = 90;        // max px the row can travel

export default function SwipeableRow({ children, onEdit, onDelete, disabled = false }) {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const currentX = useRef(0);
  const isHorizontal = useRef(null); // null = undecided, true/false once decided
  const rowRef = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (disabled) return;
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    currentX.current = 0;
    isHorizontal.current = null;
    setIsSwiping(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e) => {
    if (disabled || !isSwiping) return;

    const deltaX = e.touches[0].clientX - startX.current;
    const deltaY = e.touches[0].clientY - startY.current;

    // Decide scroll direction on first significant move
    if (isHorizontal.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontal.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
      return;
    }

    if (!isHorizontal.current) return; // vertical scroll, bail out

    // Prevent vertical scroll while swiping horizontally
    e.preventDefault();

    // Apply resistance at the edges
    const clamped = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, deltaX));
    const resistance = Math.abs(clamped) > SWIPE_THRESHOLD ? 0.4 : 1;
    const final = clamped * resistance;
    
    currentX.current = final;
    setOffsetX(final);
  }, [disabled, isSwiping]);

  const handleTouchEnd = useCallback(() => {
    if (!isSwiping) return;
    setIsSwiping(false);

    const distance = currentX.current;

    // Swipe left past threshold → delete
    if (distance < -SWIPE_THRESHOLD && onDelete) {
      // Animate off screen briefly then snap back
      setOffsetX(-MAX_SWIPE);
      setTimeout(() => {
        onDelete();
        setOffsetX(0);
      }, 200);
      return;
    }

    // Swipe right past threshold → edit
    if (distance > SWIPE_THRESHOLD && onEdit) {
      setOffsetX(MAX_SWIPE);
      setTimeout(() => {
        onEdit();
        setOffsetX(0);
      }, 200);
      return;
    }

    // Snap back
    setOffsetX(0);
  }, [isSwiping, onDelete, onEdit]);

  const isSwipingLeft = offsetX < -10;
  const isSwipingRight = offsetX > 10;
  const leftProgress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);
  const rightProgress = Math.min(Math.abs(offsetX) / SWIPE_THRESHOLD, 1);

  return (
    <div className="relative overflow-hidden rounded-xl" ref={rowRef}>
      {/* Background actions revealed by swipe */}
      {/* Left side (revealed on right swipe) = Edit */}
      <div
        className="absolute inset-y-0 left-0 w-24 flex items-center justify-center rounded-l-xl transition-colors"
        style={{
          backgroundColor: isSwipingRight
            ? `rgba(20, 184, 166, ${0.15 + rightProgress * 0.25})`
            : 'transparent',
        }}
      >
        {isSwipingRight && (
          <div className="flex flex-col items-center gap-1" style={{ opacity: rightProgress }}>
            <Edit2 size={18} className="text-teal-400" style={{ transform: `scale(${0.6 + rightProgress * 0.4})` }} />
            <span className="text-[9px] text-teal-400 font-medium">Edit</span>
          </div>
        )}
      </div>

      {/* Right side (revealed on left swipe) = Delete */}
      <div
        className="absolute inset-y-0 right-0 w-24 flex items-center justify-center rounded-r-xl transition-colors"
        style={{
          backgroundColor: isSwipingLeft
            ? `rgba(239, 68, 68, ${0.15 + leftProgress * 0.25})`
            : 'transparent',
        }}
      >
        {isSwipingLeft && (
          <div className="flex flex-col items-center gap-1" style={{ opacity: leftProgress }}>
            <Trash2 size={18} className="text-red-400" style={{ transform: `scale(${0.6 + leftProgress * 0.4})` }} />
            <span className="text-[9px] text-red-400 font-medium">Delete</span>
          </div>
        )}
      </div>

      {/* Actual row content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)',
        }}
        className="relative z-10"
      >
        {children}
      </div>
    </div>
  );
}
