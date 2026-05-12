import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Recuperar acesso — Observatório" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  async function requestReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setSubmitting(false);
    if (error) setError(error.message);
    else setMessage("Se o endereço existir, enviamos um link de recuperação.");
  }

  async function updatePassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) setError(error.message);
    else setMessage("Senha redefinida. Você já pode acessar.");
  }

  return (
    <AuthLayout
      eyebrow="acesso · recuperar"
      title={mode === "request" ? "Recompor entrada." : "Definir nova senha."}
      subtitle="Recuperação silenciosa. Sem ruído, sem rastro público."
    >
      <h2 className="font-display text-2xl mb-6">
        {mode === "request" ? "recuperar senha" : "nova senha"}
      </h2>

      {mode === "request" ? (
        <form onSubmit={requestReset} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 bg-card border-border"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full mt-2">
            {submitting ? "enviando…" : "enviar link →"}
          </Button>
        </form>
      ) : (
        <form onSubmit={updatePassword} className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              nova senha
            </label>
            <Input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 bg-card border-border"
            />
          </div>
          <Button type="submit" disabled={submitting} className="w-full mt-2">
            {submitting ? "atualizando…" : "salvar →"}
          </Button>
        </form>
      )}

      {error ? (
        <p className="mt-4 font-mono text-[11px] text-destructive">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-4 font-mono text-[11px] text-muted-foreground">{message}</p>
      ) : null}

      <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          voltar para login
        </Link>
      </p>
    </AuthLayout>
  );
}
