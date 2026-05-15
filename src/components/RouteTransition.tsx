import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * Cinematic route transition: soft fade + blur lift on every pathname change.
 * Honors prefers-reduced-motion via the global media query in styles.css.
 */
export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div key={pathname} className="animate-route-in">
      {children}
    </div>
  );
}
