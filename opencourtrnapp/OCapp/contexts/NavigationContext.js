// contexts/NavigationContext.js
import React, { createContext, useContext, useState } from 'react';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentCourtId, setCurrentCourtId] = useState(null);

  const value = {
    currentConversationId,
    setCurrentConversationId,
    currentCourtId,
    setCurrentCourtId,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigationContext() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigationContext must be used within NavigationProvider');
  }
  return context;
}
