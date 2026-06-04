import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadToBucket } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { CreditCard, Bell, BellOff, Trash2, LogOut, CheckCircle, XCircle } from "lucide-react";
import { CinematicHero } from "@/components/CinematicHero";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [signalPhone, setSignalPhone] = useState("");
  const [contactChannel, setContactChannel] = useState("none");
  const [savingContact, setSavingContact] = useState(false);
  const [membership, setMembership] = useState<{plan:string;status:string;current_period_end:string|null}|null>(null);
  const [cancelingPortal, setCancelingPortal] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name,bio,avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        }
      });
  }, [user?.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { setMsg("Formato inválido. Use JPG, PNG ou WebP."); return; }
    if (file.size > 5 * 1024 * 1024) { setMsg("Imagem muito grande. Máximo 5MB."); return; }
    const dims = await new Promise<{w:number;h:number}>((res) => {
      const img = new Image(); const url = URL.createObjectURL(file);
      img.onload = () => { res({w:img.width,h:img.height}); URL.revokeObjectURL(url); };
      img.onerror = () => { res({w:999,h:999}); URL.revokeObjectURL(url); };
      img.src = url;
    });
    if (dims.w < 100 || dims.h < 100) { setMsg("Imagem muito pequena. Mínimo 100×100px."); return; }
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const result = await uploadToBucket({
        bucket: "avatars",
        file,
        pathPrefix: user.id,
      });
      // Gera URL pública para o avatar (bucket avatars é público)
      const { data } = supabase.storage.from("avatars").getPublicUrl(result.path);
      setAvatarUrl(data.publicUrl);
      setMsg("Avatar enviado.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploadingAvatar(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null, bio: bio || null, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSaving(false);
    setMsg(error ? "Falha ao salvar." : "Atualizado.");
    setTimeout(() => setMsg(null), 2500);
  };

  const sendReset = async () => {
    if (!user?.email) return;
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg("Email enviado.");
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="conta · configurações"
        title="Configurações."
        lead="Sua identidade silenciosa dentro do observatório."
        height="sm"
      />

      <div className="px-8 lg:px-14 pt-10 max-w-2xl space-y-10">
        <form onSubmit={save} className="border border-border p-6 space-y-5">
          <h2 className="font-display text-xl">Perfil</h2>
          <Field label="nome de exibição">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
              maxLength={80}
            />
          </Field>
          <Field label="bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none"
              maxLength={500}
            />
          </Field>
          <Field label="avatar">
            <div className="flex items-center gap-4 mt-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-full object-cover border border-border shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted border border-border shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] uppercase tracking-[0.25em] border border-border px-3 py-2 hover:bg-accent transition w-fit">
                  {uploadingAvatar ? "enviando…" : "escolher foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-destructive"
                  >
                    remover
                  </button>
                )}
              </div>
            </div>
          </Field>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50"
            >
              {saving ? "salvando…" : "salvar →"}
            </button>
            {msg ? <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{msg}</span> : null}
          </div>
        </form>

        <section className="border border-border p-6 space-y-4">
          <h2 className="font-display text-xl">Conta</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">email</span>
            <span className="font-mono text-xs">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">id</span>
            <span className="font-mono text-[10px]">{user?.id}</span>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={sendReset}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-4 py-2 hover:bg-accent"
            >
              redefinir senha
            </button>
            <button
              onClick={() => signOut()}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-4 py-2 hover:bg-accent"
            >
              sair
            </button>
          </div>
        </section>
      </div>

      {/* Assinatura */}
      <div className="border border-border p-6 space-y-5 mt-8">
        <div>
          <h3 className="font-display text-xl">Assinatura</h3>
          <p className="text-sm text-muted-foreground mt-1">Gerencie seu plano e faturamento.</p>
        </div>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12}} className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">plano atual</p>
            <p className="text-base font-medium">{membership ? PLAN_LABELS[membership.plan] ?? membership.plan : "Livre"}</p>
            {membership?.status && (
              <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
                {membership.status === "active" ? "ativo" : membership.status === "canceled" ? "cancelado" : membership.status}
                {membership.current_period_end ? ` · renova em ${new Date(membership.current_period_end).toLocaleDateString("pt-BR")}` : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <button onClick={openBillingPortal} disabled={cancelingPortal}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-border px-4 py-2 hover:bg-accent transition disabled:opacity-50">
              <CreditCard className="w-3.5 h-3.5" />
              {cancelingPortal ? "abrindo…" : "portal de faturamento"}
            </button>
            {membership && membership.status === "active" && (
              <button onClick={openBillingPortal}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline">
                cancelar assinatura
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Canais de contato */}
      <div className="border border-border p-6 space-y-6 mt-8">
        <div>
          <h3 className="font-display text-xl">Canais de contato</h3>
          <p className="text-sm text-muted-foreground mt-1">Receba novidades do Observatório direto no celular.</p>
        </div>

        {/* Seletor de canal */}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">canal preferido</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "none", label: "Nenhum" },
              { value: "telegram", label: "Telegram" },
              { value: "signal", label: "Signal" },
              { value: "both", label: "Ambos" },
            ].map((opt) => (
              <button key={opt.value} onClick={() => setContactChannel(opt.value)}
                style={contactChannel === opt.value ? {background:"rgba(var(--neon-rgb,100,220,100),0.12)",border:"1px solid rgba(var(--neon-rgb,100,220,100),0.4)",color:"var(--neon,#64dc64)"} : {}}
                className="border border-border py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-accent transition rounded">
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Telegram */}
        {(contactChannel === "telegram" || contactChannel === "both") && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10}} className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">telegram</p>
              {telegramConnected && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  <span className="font-mono text-[10px] text-green-500">conectado</span>
                </div>
              )}
            </div>
            {telegramConnected ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Sua conta está vinculada ao <strong className="text-foreground">@drathos_bot</strong>. Você receberá broadcasts diretamente no Telegram.</p>
                <button onClick={disconnectTelegram} disabled={disconnectingTelegram}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" />
                  {disconnectingTelegram ? "desconectando…" : "desconectar telegram"}
                </button>
              </div>
            ) : telegramToken ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Abra o Telegram e envie este comando para <strong className="text-foreground">@drathos_bot</strong>:</p>
                <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}} className="p-3 font-mono text-sm select-all cursor-copy">
                  /start {telegramToken}
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">⏱ Token expira em 15 minutos.</p>
                <button onClick={generateTelegramToken} className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  gerar novo token
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Conecte sua conta para receber conteúdos diretamente no celular via Telegram.</p>
                <button onClick={generateTelegramToken}
                  style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:8}}
                  className="flex items-center gap-2 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.25em] hover:brightness-125 transition">
                  conectar @drathos_bot →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Signal */}
        {(contactChannel === "signal" || contactChannel === "both") && (
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10}} className="p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">signal</p>
            <p className="text-sm text-muted-foreground">Informe seu número com código do país para receber mensagens via Signal.</p>
            <input value={signalPhone} onChange={(e) => setSignalPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm" />
            {signalPhone && (
              <button onClick={() => { setSignalPhone(""); saveContactPrefs(); }}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5" /> remover número
              </button>
            )}
          </div>
        )}

        {/* Opt-out total */}
        {contactChannel !== "none" && (
          <button onClick={() => { setContactChannel("none"); }}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition">
            <BellOff className="w-3.5 h-3.5" /> parar de receber notificações
          </button>
        )}

        <button onClick={saveContactPrefs} disabled={savingContact}
          className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50">
          {savingContact ? "salvando…" : "salvar preferências →"}
        </button>
      </div>

      {/* Conta — zona de perigo */}
      <div className="border border-destructive/30 p-6 space-y-4 mt-8">
        <div>
          <h3 className="font-display text-xl text-destructive/80">Zona de atenção</h3>
          <p className="text-sm text-muted-foreground mt-1">Ações irreversíveis relacionadas à sua conta.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => signOut()}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-border px-4 py-2.5 hover:bg-accent transition">
            <LogOut className="w-3.5 h-3.5" /> sair da conta
          </button>
          <button
            onClick={() => {
              if (confirm("Tem certeza? Esta ação é irreversível e apagará todos os seus dados.")) {
                toast.error("Para excluir sua conta, entre em contato com o suporte.");
              }
            }}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-destructive/40 text-destructive/70 px-4 py-2.5 hover:bg-destructive/10 transition">
            <Trash2 className="w-3.5 h-3.5" /> excluir conta
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
