import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface NavigationGuardContextType {
  isBlocked: boolean;
  setGuard: (blocked: boolean, onNavigate: (proceed: boolean) => void) => void;
  clearGuard: () => void;
  requestNavigation: (navigateFn: () => void) => boolean;
}

const NavigationGuardContext = createContext<NavigationGuardContextType>({
  isBlocked: false,
  setGuard: () => {},
  clearGuard: () => {},
  requestNavigation: () => true,
});

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [onNavigateRef, setOnNavigateRef] = useState<((proceed: boolean) => void) | null>(null);

  const setGuard = useCallback((blocked: boolean, onNavigate: (proceed: boolean) => void) => {
    setIsBlocked(blocked);
    setOnNavigateRef(() => onNavigate);
  }, []);

  const clearGuard = useCallback(() => {
    setIsBlocked(false);
    setOnNavigateRef(null);
  }, []);

  const requestNavigation = useCallback((navigateFn: () => void) => {
    if (isBlocked && onNavigateRef) {
      // Store the pending navigate and call the guard's callback
      onNavigateRef(false); // false = don't proceed yet, show dialog
      // We need to pass the navigateFn to the guard component
      // Use a custom event for this
      window.dispatchEvent(new CustomEvent("nav-guard-blocked", { detail: navigateFn }));
      return false;
    }
    navigateFn();
    return true;
  }, [isBlocked, onNavigateRef]);

  return (
    <NavigationGuardContext.Provider value={{ isBlocked, setGuard, clearGuard, requestNavigation }}>
      {children}
    </NavigationGuardContext.Provider>
  );
}

export function useNavigationGuard() {
  return useContext(NavigationGuardContext);
}
