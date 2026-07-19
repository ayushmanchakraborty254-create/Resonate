import React, { createContext, useContext, useState, useEffect } from 'react';

export type ActiveView = 'home' | 'explore' | 'library' | 'universal_library' | 'profile';

export interface NavigationContextType {
  currentView: ActiveView;
  history: ActiveView[];
  activePlaylistId: string | null;
  pushView: (view: ActiveView) => void;
  popView: () => void;
  setSelectedPlaylistId: (id: string | null) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentViewState] = useState<ActiveView>('home');
  const [history, setHistory] = useState<ActiveView[]>(['home']);
  const [activePlaylistId, setActivePlaylistIdState] = useState<string | null>(null);

  // Helper helper to start View Transitions
  const transitionTo = (callback: () => void) => {
    // @ts-ignore
    if (document.startViewTransition) {
      // @ts-ignore
      document.startViewTransition(callback);
    } else {
      callback();
    }
  };

  const pushView = (view: ActiveView) => {
    if (view === currentView) return;
    transitionTo(() => {
      setCurrentViewState(view);
      setHistory(prev => [...prev, view]);
    });
  };

  const popView = () => {
    if (history.length <= 1) return;
    transitionTo(() => {
      const newHistory = [...history];
      newHistory.pop(); // Remove current view
      const prevView = newHistory[newHistory.length - 1];
      setCurrentViewState(prevView);
      setHistory(newHistory);
    });
  };

  const setSelectedPlaylistId = (id: string | null) => {
    transitionTo(() => {
      setActivePlaylistIdState(id);
    });
  };

  // Support hardware back buttons / popstate where appropriate
  useEffect(() => {
    const handlePopState = () => {
      if (history.length > 1) {
        popView();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [history]);

  return (
    <NavigationContext.Provider value={{
      currentView,
      history,
      activePlaylistId,
      pushView,
      popView,
      setSelectedPlaylistId
    }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
