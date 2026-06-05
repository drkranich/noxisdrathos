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

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Solicitar acesso — Observatório" },
      { name: "description", content: "Solicite entrada no círculo." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [channel, setChannel] = useState<"none" | "telegram" | "signal" | "both">("none");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const handleToken = useCallback((t: string) => setCaptchaToken(t), []);
  const handleExpire = useCallback(() => setCaptchaToken(null), []);
  const turnstileRef = useTurnstile(handleToken, handleExpire);

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app" });
  }, [loading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!captchaToken) { setError("Complete a verificação de segurança."); return; }
    setError(null);
    setSubmitting(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        captchaToken,
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: name || email.split("@")[0] },
      },
    });

    setSubmitting(false);

    if (error) { setError(error.message); return; }

    if (channel !== "none" && data?.user?.id) {
      await supabase.from("profiles").update({
        contact_channel: channel,
        contact_opt_in: true,
      }).eq("id", data.user.id);
    }

    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout eyebrow="acesso · confirmação" title="Verifique seu email."
        subtitle="O acesso ao observatório está quase garantido.">
        <div className="space-y-6">
          <div className="border border-border bg-card/40 p-6 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--neon)]">email enviado</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enviamos um link de confirmação para <strong className="text-foreground">{email}</strong>.
              Clique no link para ativar seu acesso.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Verifique também sua caixa de spam.
            </p>
          </div>
          <p className="text-center font-mono text-[11px] text-muted-foreground">
            já confirmou?{" "}
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">entrar</Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout eyebrow="acesso · solicitação" title="Entrar no círculo."
      subtitle="O observatório é privado e silencioso. Cada novo membro recebe acesso integral à biblioteca, vídeos e leituras restritas.">
      <h2 className="font-display text-2xl mb-6">criar acesso</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">nome</label>
          <Input required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 bg-card border-border" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">email</label>
          <Input type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} className="mt-2 bg-card border-border" />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">senha</label>
          <Input type="password" required minLength={8} autoComplete="new-password" value={password}
            onChange={(e) => setPassword(e.target.value)} className="mt-2 bg-card border-border" />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">mínimo 8 caracteres.</p>
        </div>
        <div className="space-y-2 mt-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            canal de contato <span className="opacity-50">(opcional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["none", "telegram", "signal", "both"] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setChannel(opt)}
                className={`border py-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] rounded transition text-left ${
                  channel === opt ? "border-foreground text-foreground bg-accent" : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                {opt === "none" ? "Nenhum" : opt === "both" ? "Ambos" : opt.charAt(0).toUpperCase() + opt.slice(1)}
 