import { useState } from 'react';
import type { TouchEvent } from 'react';

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  minDelta?: number;
  disabled?: boolean;
}

export const useSwipeGesture = (callbacks: SwipeCallbacks) => {
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);

  const minSwipeDistance = callbacks.minDelta ?? 50;

  const onTouchStart = (e: TouchEvent) => {
    if (callbacks.disabled) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    // Ignore touches starting on interactive elements (sliders, inputs, buttons)
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.closest('input') ||
        target.closest('button') ||
        target.closest('.slider') ||
        target.closest('[data-no-swipe="true"]'))
    ) {
      setTouchStart(null);
      setTouchEnd(null);
      return;
    }

    setTouchEnd(null);
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchMove = (e: TouchEvent) => {
    if (callbacks.disabled || !touchStart) return;
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY,
    });
  };

  const onTouchEnd = () => {
    if (callbacks.disabled || !touchStart || !touchEnd) return;

    const distanceX = touchStart.x - touchEnd.x;
    const distanceY = touchStart.y - touchEnd.y;

    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY);

    if (isHorizontalSwipe) {
      if (Math.abs(distanceX) > minSwipeDistance) {
        if (distanceX > 0 && callbacks.onSwipeLeft) {
          callbacks.onSwipeLeft();
        } else if (distanceX < 0 && callbacks.onSwipeRight) {
          callbacks.onSwipeRight();
        }
      }
    } else {
      if (Math.abs(distanceY) > minSwipeDistance) {
        if (distanceY > 0 && callbacks.onSwipeUp) {
          callbacks.onSwipeUp();
        } else if (distanceY < 0 && callbacks.onSwipeDown) {
          callbacks.onSwipeDown();
        }
      }
    }
  };

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
};
