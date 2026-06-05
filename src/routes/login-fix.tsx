import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const TURNSTILE_SITE_KEY = "0x4AAAAAADfQ8limbo8tbjlq";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

function useTurnstile(onToken: (t: string) => void, onExpire: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const init = useCallback(() => {
    if (!ref.current || !window.turnstile || widgetId.current) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "dark",
      callback: onToken,
      "expired-callback": () => { widgetId.current = null; onExpire(); },
    });
  }, [onToken, onExpire]);

  useEffect(() => {
    const id = "cf-ts";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    } else {
      window.turnstile ? init() : document.getElementById(id)?.addEventListener("load", init);
    }
    return () => {
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [init]);

  return ref;
}

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Entrar — Observatório" },
      { name: "description", content: "Acesse o observatório privado." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { session, loading, rolesLoading, refreshRoles } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleToken = useCallback((t: string) => setCaptchaToken(t), []);
  const handleExpire = useCallback(() => setCaptchaToken(null), []);
  const turnstileRef = useTurnstile(handleToken, handleExpire);

  useEffect(() => {
    if (!loading && !rolesLoading && session) navigate({ to: "/app" });
  }, [loading, rolesLoading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!captchaToken) { setError("Complete a verificação de segurança."); return; }
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken },
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else refreshRoles();
  }

  return (
    <AuthLayout
      eyebrow="acesso · login"
      title="Continuar leitura."
      subtitle="O acesso é silencioso. Sem ruído, sem distrações. Apenas sinais."
    >
      <h2 className="font-display text-2xl mb-6">entrar</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">e-mail</label>
          <Input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="mt-2 bg-card border-border" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">senha</label>
            <Lin