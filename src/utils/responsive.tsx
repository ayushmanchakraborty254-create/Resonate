import React, { createContext, useContext, useState, useEffect } from 'react';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';
export type Orientation = 'portrait' | 'landscape';

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface ResponsiveContextType {
  breakpoint: Breakpoint;
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: Orientation;
  isTouch: boolean;
  reducedMotion: boolean;
  darkMode: boolean;
  safeAreaInsets: SafeAreaInsets;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export const ResponsiveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const [darkMode, setDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  const [reducedMotion, setReducedMotion] = useState(
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    const handleThemeChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    window.addEventListener('resize', handleResize);
    
    const themeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    themeMediaQuery.addEventListener('change', handleThemeChange);
    motionMediaQuery.addEventListener('change', handleMotionChange);

    return () => {
      window.removeEventListener('resize', handleResize);
      themeMediaQuery.removeEventListener('change', handleThemeChange);
      motionMediaQuery.removeEventListener('change', handleMotionChange);
    };
  }, []);

  const width = dimensions.width;
  const height = dimensions.height;

  // Determine active breakpoint
  let breakpoint: Breakpoint = 'desktop';
  if (width < 768) {
    breakpoint = 'mobile';
  } else if (width < 1024) {
    breakpoint = 'tablet';
  }

  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const isDesktop = breakpoint === 'desktop';

  // Determine orientation
  const orientation: Orientation = width > height ? 'landscape' : 'portrait';

  // Touch device check
  const isTouch = typeof window !== 'undefined' && 
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Dynamic safe-area estimation (browser safe areas are bound to CSS variables)
  // We provide typical notches fallback metrics in JS context, while CSS handles env() natively.
  const safeAreaInsets: SafeAreaInsets = {
    top: isMobile && orientation === 'portrait' ? 44 : 0,
    right: 0,
    bottom: isMobile ? 34 : 0,
    left: 0
  };

  const value: ResponsiveContextType = {
    breakpoint,
    width,
    height,
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    isTouch,
    reducedMotion,
    darkMode,
    safeAreaInsets
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
};

export const useBreakpoint = () => {
  const context = useContext(ResponsiveContext);
  if (context === undefined) {
    throw new Error('useBreakpoint must be used within a ResponsiveProvider');
  }
  return context;
};
