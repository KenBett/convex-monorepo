"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface NavbarActionsContextValue {
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const NavbarActionsContext = createContext<NavbarActionsContextValue | null>(
  null,
);

export function NavbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null);
  const setActions = useCallback((next: ReactNode) => {
    setActionsState(next);
  }, []);

  const value = useMemo(
    () => ({ actions, setActions }),
    [actions, setActions],
  );

  return (
    <NavbarActionsContext.Provider value={value}>
      {children}
    </NavbarActionsContext.Provider>
  );
}

export function useNavbarActions() {
  const context = useContext(NavbarActionsContext);

  if (!context) {
    throw new Error(
      "useNavbarActions must be used within a NavbarActionsProvider",
    );
  }

  return context;
}

/** Register trailing navbar actions for the current page; clears on unmount. */
export function useNavbarPageActions(
  actions: ReactNode | null,
  enabled = true,
) {
  const { setActions } = useNavbarActions();

  useEffect(() => {
    if (!enabled || actions == null) {
      setActions(null);
      return;
    }

    setActions(actions);

    return () => setActions(null);
  }, [actions, enabled, setActions]);
}
