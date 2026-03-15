'use client';

import React, { createContext, useContext } from 'react';

/** Override for unread message count. Always null - real count comes from store/API. */
const DevUnreadContext = createContext<{
  override: number | null;
  setOverride: (n: number | null) => void;
}>({ override: null, setOverride: () => {} });

export function DevUnreadProvider({ children }: { children: React.ReactNode }) {
  return (
    <DevUnreadContext.Provider value={{ override: null, setOverride: () => {} }}>
      {children}
    </DevUnreadContext.Provider>
  );
}

export function useDevUnread() {
  return useContext(DevUnreadContext);
}
