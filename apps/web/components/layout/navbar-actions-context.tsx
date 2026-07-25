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
  /** Hide the fixed top navbar (e.g. mobile composer focus). */
  hideTopChrome: boolean;
  setHideTopChrome: (hidden: boolean) => void;
}

const NavbarActionsContext = createContext<NavbarActionsContextValue | null>(
  null,
);

export function NavbarActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActionsState] = useState<ReactNode>(null);
  const [hideTopChrome, setHideTopChromeState] = useState(false);

  const setActions = useCallback((next: ReactNode) => {
    setActionsState(next);
  }, []);

  const setHideTopChrome = useCallback((hidden: boolean) => {
    setHideTopChromeState(hidden);
  }, []);

  const value = useMemo(
    () => ({ actions, setActions, hideTopChrome, setHideTopChrome }),
    [actions, hideTopChrome, setActions, setHideTopChrome],
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

/** Hide the top navbar while `hidden` is true; restores on unmount. */
export function useHideTopChrome(hidden: boolean) {
  const { setHideTopChrome } = useNavbarActions();

  useEffect(() => {
    setHideTopChrome(hidden);

    return () => setHideTopChrome(false);
  }, [hidden, setHideTopChrome]);
}
