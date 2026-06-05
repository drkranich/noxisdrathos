import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/turnstile-login")({
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

  useEffect(() => {
    if (!loading && !rolesLoading && session) navigate({ to: "/app" });
  }, [loading, rolesLoading, session, navigate]);

  const handleToken = useCallback((token: string) => setCaptchaToken(token), []);
  const handleExpire = useCallback(() => setCaptchaToken(null), []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!captchaToken) {
      setError("Complete a verificação de segurança antes de continuar.");
      return;
    }
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
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            e-mail
          </label>
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 bg-card border-border"
          />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              senha
            </label>
            <Link
              to="/reset-password"
              className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground"
            >
              esquecida?
            </Link>
          </div>
          <Input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 bg-card border-border"
          />
        </div>

        <TurnstileWidget onToken={handleToken} onExpire={handleExpire} />

        {error ? (
          <p className="font-mono text-[11px] text-destructive">{error}</p>
        ) : null}

        <Button type="submit" disabled={submitting || !captchaToken} className="w-full mt-2">
          {submitting ? "verificando…" : "entrar →"}
        </Button>
      </form>

      <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">
        ainda sem acesso?{" "}
        <Link to="/signup" className="text-foreground underline-offset-4 hover:underline">
          solicitar entrada
        </Link>
      </p>
    </AuthLayout>
  );
}
