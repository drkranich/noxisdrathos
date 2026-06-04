import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CreditCard, Bell, BellOff, Trash2, LogOut, CheckCircle, XCircle, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — Observatório" }] }),
  component: SettingsPage,
});

const PLAN_LABELS: Record<string, string> = {
  free: "Livre",
  circle: "Círculo — R$97/mês",
  vault: "Cofre — R$297/mês",
  council: "Conselho — R$1.490/ano",
};

function SettingsPage() {
  const { user, signOut } = useAuth();

  // Perfil
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Assinatura
  const [membership, setMembership] = useState<{plan:string;status:string;current_period_end:string|null}|null>(null);
  const [cancelingPortal, setCancelingPortal] = useState(false);

  // Canais
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramConnected, setTelegramConnected] = useState(false);
  const [signalPhone, setSignalPhone] = useState("");
  const [contactChannel, setContactChannel] = useState("none");
  const [savingContact, setSavingContact] = useState(false);
  const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("display_name,bio,avatar_url,signal_phone,contact_channel,telegram_chat_id")
      .eq("id", user.id).maybeSingle()
      .then(({ data }) => {
        if (data?.display_name) setDisplayName(data.display_name);
        if (data?.bio) setBio(data.bio);
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
        if (data?.signal_phone) setSignalPhone(data.signal_phone);
        if (data?.contact_channel) setContactChannel(data.contact_channel);
        if (data?.telegram_chat_id) setTelegramConnected(true);
      });

    supabase.from("memberships")
      .select("plan,status,current_period_end")
      .eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setMembership(data as any); });
  }, [user?.id]);

  // ── Perfil ──────────────────────────────────────────────────────────────
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
    setUploadingAvatar(true); setMsg(null);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
      setAvatarUrl(publicUrl);
      toast.success("Foto atualizada.");
    } catch (e: any) {
      setMsg(e.message ?? "Erro no upload.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true); setMsg(null);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio }).eq("id", user.id);
    setSavingProfile(false);
    if (error) setMsg(error.message);
    else toast.success("Perfil salvo.");
  };

  // ── Assinatura ──────────────────────────────────────────────────────────
  const openBillingPortal = async () => {
    setCancelingPortal(true);
    try {
      const { createPortalSession } = await import("@/utils/payments.functions");
      const { getStripeEnvironment } = await import("@/lib/stripe");
      const url = await createPortalSession({
        data: { returnUrl: window.location.href, environment: getStripeEnvironment() },
      });
      if (url) window.location.href = url as string;
      else toast.error("Portal não retornou URL.");
    } catch {
      toast.error("Erro ao abrir portal de assinatura.");
    } finally {
      setCancelingPortal(false);
    }
  };

  // ── Canais ──────────────────────────────────────────────────────────────
  const generateTelegramToken = async () => {
    if (!user) return;
    const { data } = await supabase.from("telegram_link_tokens")
      .insert({ user_id: user.id }).select("token").single();
    if (data?.token) setTelegramToken(data.token);
  };

  const disconnectTelegram = async () => {
    if (!user) return;
    setDisconnectingTelegram(true);
    await supabase.from("profiles").update({ telegram_chat_id: null, telegram_username: null }).eq("id", user.id);
    setTelegramConnected(false); setTelegramToken(null);
    setDisconnectingTelegram(false);
    toast.success("Telegram desconectado.");
  };

  const saveContactPrefs = async () => {
    if (!user) return;
    setSavingContact(true);
    await supabase.from("profiles").update({
      signal_phone: signalPhone || null,
      contact_channel: contactChannel,
      contact_opt_in: contactChannel !== "none",
    }).eq("id", user.id);
    setSavingContact(false);
    toast.success("Preferências salvas.");
  };

  return (
    <div className="px-8 lg:px-14 py-12 max-w-2xl space-y-0">
      <div className="mb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">conta · configurações</p>
        <h1 className="font-display text-5xl mt-2">Configurações.</h1>
        <p className="mt-3 text-muted-foreground">Sua identidade silenciosa dentro do observatório.</p>
      </div>

      {/* ── Perfil ── */}
      <div className="border border-border p-6 space-y-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">perfil</h3>

        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-accent overflow-hidden shrink-0 flex items-center justify-center">
            {avatarUrl
              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              : <span className="font-mono text-lg">{displayName?.[0]?.toUpperCase() ?? "?"}</span>
            }
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
            <button onClick={() => fileRef.current?.click()} disabled={uploadingAvatar}
              className="flex items-center gap-2 border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] hover:bg-accent transition disabled:opacity-50">
              <Upload className="w-3.5 h-3.5" />
              {uploadingAvatar ? "enviando…" : "escolher foto"}
            </button>
            <p className="font-mono text-[9px] text-muted-foreground mt-1">JPG, PNG ou WebP · mín 100×100px · máx 5MB</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">nome de exibição</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 block w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm" />
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              className="mt-1 block w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none" />
          </div>
        </div>

        {msg && <p className="font-mono text-[10px] text-destructive">{msg}</p>}
        <button onClick={saveProfile} disabled={savingProfile}
          className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50 hover:opacity-80 transition">
          {savingProfile ? "salvando…" : "salvar →"}
        </button>
      </div>

      {/* ── Assinatura ── */}
      <div className="border border-border border-t-0 p-6 space-y-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">assinatura</h3>
        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12}}
          className="p-5 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">plano atual</p>
            <p className="text-base font-medium">{membership ? (PLAN_LABELS[membership.plan] ?? membership.plan) : "Livre"}</p>
            {membership?.status && (
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mt-1">
                {membership.status === "active" ? "ativo" : membership.status === "canceled" ? "cancelado" : membership.status}
                {membership.current_period_end
                  ? ` · renova em ${new Date(membership.current_period_end).toLocaleDateString("pt-BR")}`
                  : ""}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            <button onClick={openBillingPortal} disabled={cancelingPortal}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-border px-4 py-2 hover:bg-accent transition disabled:opacity-50">
              <CreditCard className="w-3.5 h-3.5" />
              {cancelingPortal ? "abrindo…" : "portal de faturamento"}
            </button>
            {membership?.status === "active" && (
              <button onClick={openBillingPortal}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline">
                cancelar assinatura
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Canais ── */}
      <div className="border border-border border-t-0 p-6 space-y-6">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">canais de contato</h3>
        <p className="text-sm text-muted-foreground -mt-3">Receba novidades do Observatório direto no celular.</p>

        <div className="grid grid-cols-4 gap-2">
          {[
            {value:"none",label:"Nenhum"},
            {value:"telegram",label:"Telegram"},
            {value:"signal",label:"Signal"},
            {value:"both",label:"Ambos"},
          ].map((opt) => (
            <button key={opt.value} onClick={() => setContactChannel(opt.value)}
              style={contactChannel === opt.value ? {
                background:"rgba(var(--neon-rgb,100,220,100),0.12)",
                border:"1px solid rgba(var(--neon-rgb,100,220,100),0.4)",
                color:"var(--neon,#64dc64)",
              } : {}}
              className="border border-border py-2 font-mono text-[10px] uppercase tracking-[0.2em] hover:bg-accent transition rounded">
              {opt.label}
            </button>
          ))}
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
                <p className="text-sm text-muted-foreground">Conta vinculada ao <strong className="text-foreground">@drathos_bot</strong>. Você recebe broadcasts direto no Telegram.</p>
                <button onClick={disconnectTelegram} disabled={disconnectingTelegram}
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline disabled:opacity-50">
                  <XCircle className="w-3.5 h-3.5" />
                  {disconnectingTelegram ? "desconectando…" : "desconectar telegram"}
                </button>
              </div>
            ) : telegramToken ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Abra o Telegram e envie este comando para <strong className="text-foreground">@drathos_bot</strong>:</p>
                <div style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:8}}
                  className="p-3 font-mono text-sm select-all cursor-copy">
                  /start {telegramToken}
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">⏱ Token expira em 15 minutos.</p>
                <button onClick={generateTelegramToken}
                  className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  gerar novo token
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Conecte sua conta para receber conteúdos direto no celular.</p>
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
            <p className="text-sm text-muted-foreground">Informe seu número com código do país. O curador entrará em contato via Signal.</p>
            <input value={signalPhone} onChange={(e) => setSignalPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm" />
            {signalPhone && (
              <button onClick={() => setSignalPhone("")}
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-destructive hover:underline">
                <XCircle className="w-3.5 h-3.5" /> remover número
              </button>
            )}
          </div>
        )}

        {contactChannel !== "none" && (
          <button onClick={() => setContactChannel("none")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground transition">
            <BellOff className="w-3.5 h-3.5" /> parar de receber notificações
          </button>
        )}

        <button onClick={saveContactPrefs} disabled={savingContact}
          className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50 hover:opacity-80 transition">
          {savingContact ? "salvando…" : "salvar preferências →"}
        </button>
      </div>

      {/* ── Zona de atenção ── */}
      <div className="border border-destructive/30 border-t-0 p-6 space-y-4">
        <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-destructive/60">zona de atenção</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={() => signOut()}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-border px-4 py-2.5 hover:bg-accent transition">
            <LogOut className="w-3.5 h-3.5" /> sair da conta
          </button>
          <button onClick={() => {
            if (confirm("Esta ação é irreversível. Deseja realmente excluir sua conta?"))
              toast.error("Para excluir sua conta, entre em contato com o suporte.");
          }}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.25em] border border-destructive/40 text-destructive/70 px-4 py-2.5 hover:bg-destructive/10 transition">
            <Trash2 className="w-3.5 h-3.5" /> excluir conta
          </button>
        </div>
      </div>
    </div>
  );
}
