import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

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
  const [channel, setChannel] = useState<"none"|"telegram"|"signal"|"both">("none");

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app" });
  }, [loading, session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { display_name: name || email.split("@")[0] },
      },
    });
    setSubmitting(false);
    if (error) {
      setError(error.message);
    } else {
      // Salva preferência de canal no profile (criado pelo trigger)
      if (channel !== "none" && data?.user?.id) {
        await supabase.from("profiles").update({
          contact_channel: channel,
          contact_opt_in: true,
        }).eq("id", data.user.id);
      }
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthLayout
        eyebrow="acesso · confirmação"
        title="Verifique seu email."
        subtitle="O acesso ao observatório está quase garantido."
      >
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
            <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
              entrar
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="acesso · solicitação"
      title="Entrar no círculo."
      subtitle="O observatório é privado e silencioso. Cada novo membro recebe acesso integral à biblioteca, vídeos e leituras restritas."
    >
      <h2 className="font-display text-2xl mb-6">criar acesso</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            nome
          </label>
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 bg-card border-border"
          />
        </div>
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            email
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
          <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            senha
          </label>
          <Input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 bg-card border-border"
          />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">mínimo 8 caracteres.</p>
        </div>
        {error ? (
          <p className="font-mono text-[11px] text-destructive">{error}</p>
        ) : null}
        {/* Canal preferido */}
        <div className="space-y-2 mt-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            canal de contato <span className="opacity-50">(opcional)</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(["none","telegram","signal","both"] as const).map((opt) => (
              <button key={opt} type="button" onClick={() => setChannel(opt)}
                className={`border py-2 px-3 font-mono text-[10px] uppercase tracking-[0.2em] rounded transition text-left ${
                  channel === opt ? "border-foreground text-foreground bg-accent" : "border-border text-muted-foreground hover:text-foreground"
                }`}>
                {opt === "none" ? "Nenhum" : opt === "both" ? "Ambos" : opt.charAt(0).toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <Button type="submit" disabled={submitting} className="w-full mt-4">
          {submitting ? "abrindo entrada…" : "solicitar acesso →"}
        </Button>
      </form>

      <p className="mt-8 text-center font-mono text-[11px] text-muted-foreground">
        já possui acesso?{" "}
        <Link to="/login" className="text-foreground underline-offset-4 hover:underline">
          entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
