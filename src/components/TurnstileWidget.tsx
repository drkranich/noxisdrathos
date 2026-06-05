import { useEffect, useRef, useCallback } from "react";

// Chave pública do Cloudflare Turnstile — seguro expor no frontend
const TURNSTILE_SITE_KEY = "0x4AAAAAADfQ8limbo8tbjlq";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id: string) => void;
      remove: (id: string) => void;
    };
  }
}

interface Props {
  onToken: (token: string) => void;
  onExpire?: () => void;
}

/**
 * Renderiza o widget Cloudflare Turnstile e devolve o token via `onToken`.
 * O token expira em ~5 min — `onExpire` limpa o estado para forçar novo challenge.
 */
export function TurnstileWidget({ onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  const renderWidget = useCallback(() => {
    if (!containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: onToken,
      "expired-callback": () => {
        widgetIdRef.current = null;
        onExpire?.();
      },
    });
  }, [onToken, onExpire]);

  useEffect(() => {
    const SCRIPT_ID = "cf-turnstile-script";

    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = renderWidget;
      document.head.appendChild(s);
    } else if (window.turnstile) {
      renderWidget();
    } else {
      document.getElementById(SCRIPT_ID)?.addEventListener("load", renderWidget);
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [renderWidget]);

  return <div ref={containerRef} className="mt-4" />;
}
