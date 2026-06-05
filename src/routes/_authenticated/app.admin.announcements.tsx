import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Send, Radio, MessageCircle, Clock, CheckCircle, AlertCircle, ExternalLink, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/app/admin/announcements")({
  head: () => ({ meta: [{ title: "Comunicação — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AnnouncementsPage,
});

type Broadcast = {
  id: string;
  channel: string;
  message: string;
  status: string;
  recipients_count: number;
  telegram_ok: number;
  telegram_fail: number;
  created_at: string;
};

type Channel = "telegram" | "signal" | "both";

const SIGNAL_BASE = "https://signal.me/#p/";

function AnnouncementsPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [channel, setChannel] = useState<Channel>("both");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Broadcast[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [telegramCount, setTelegramCount] = useState(0);
  const charLimit = 4096;

  async function loadData() {
    const [{ data: broadcasts }, { count: members }, { count: telegram }] = await Promise.all([
      (supabase as any).from("broadcasts").select("*").order("created_at", { ascending: false }).limit(30),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      (supabase as any).from("profiles").select("*", { count: "exact", head: true }).not("telegram_chat_id", "is", null),
    ]);
    setHistory((broadcasts ?? []) as Broadcast[]);
    setMemberCount(members ?? 0);
    setTelegramCount(telegram ?? 0);
  }

  useEffect(() => { loadData(); }, []);

  async function sendBroadcast() {
    if (!message.trim()) return toast.error("Mensagem não pode estar vazia.");
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://bobqkaqgxridueuueizh.supabase.co/functions/v1/send-broadcast",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ channel, message }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Erro ao enviar.");

      if (channel === "signal" || channel === "both") {
        // Signal não tem API — copia mensagem e abre app
        await navigator.clipboard.writeText(message).catch(() => {});
        toast.info("Signal: mensagem copiada! Cole no seu grupo do Signal.", { duration: 5000 });
        // Abre Signal se disponível (mobile)
        window.open("https://signal.me", "_blank");
      }

      if (result.telegram?.sent > 0) {
        toast.success(`Telegram: ${result.telegram.sent} mensagem(ns) enviada(s).`);
      }
      if (result.telegram?.failed > 0) {
        toast.error(`Telegram: ${result.telegram.failed} falharam.`);
      }
      if (channel === "telegram" && result.recipients === 0) {
        toast.warning("Nenhum membro tem Telegram configurado ainda.");
      }

      setMessage("");
      loadData();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erro ao enviar broadcast.");
    } finally {
      setSending(false);
    }
  }

  function statusIcon(status: string) {
    if (status === "sent") return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (status === "failed") return <AlertCircle className="w-4 h-4 text-destructive" />;
    return <AlertCircle className="w-4 h-4 text-amber-500" />;
  }

  function channelLabel(ch: string) {
    if (ch === "telegram") return "Telegram";
    if (ch === "signal") return "Signal";
    return "Telegram + Signal";
  }

  return (
    <div className="px-8 lg:px-14 py-12 max-w-5xl space-y-10">
      {/* Header */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">comunicação · broadcast</p>
        <h2 className="font-display text-3xl mt-2">Mensagens</h2>
        <p className="mt-2 text-sm text-muted-foreground">Envie mensagens diretas para todos os membros via Telegram ou Signal.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "membros totais", value: memberCount, icon: Users },
          { label: "com telegram", value: telegramCount, icon: MessageCircle },
          { label: "broadcasts enviados", value: history.length, icon: Radio },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label}
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
            }}
            className="rounded-xl p-5"
          >
            <Icon className="w-4 h-4 text-muted-foreground mb-3" />
            <p className="font-display text-3xl">{value}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        {/* Composer */}
        <div
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
          className="rounded-xl p-6 space-y-5"
        >
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">nova mensagem</h3>

          {/* Canal */}
          <div className="space-y-2">
            <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">canal</label>
            <div className="grid grid-cols-3 gap-2">
              {(["telegram", "signal", "both"] as Channel[]).map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChannel(ch)}
                  style={channel === ch ? {
                    background: "rgba(var(--neon-rgb,100,220,100),0.12)",
                    border: "1px solid rgba(var(--neon-rgb,100,220,100),0.4)",
                    color: "var(--neon,#64dc64)",
                  } : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  className="py-2 rounded-lg font-mono text-[10px] uppercase tracking-[0.2em] transition"
                >
                  {ch === "both" ? "ambos" : ch}
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">mensagem</label>
              <span className="font-mono text-[10px] text-muted-foreground">{message.length}/{charLimit}</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, charLimit))}
              placeholder="Escreva sua mensagem para os membros…&#10;&#10;Suporta *negrito* e _itálico_ para Telegram."
              rows={8}
              className="w-full bg-transparent border border-border/50 focus:border-foreground/30 outline-none p-4 text-sm resize-none rounded-lg placeholder:text-muted-foreground/40 leading-relaxed"
            />
          </div>

          {/* Aviso Signal */}
          {(channel === "signal" || channel === "both") && (
            <div
              style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 8 }}
              className="p-3 flex gap-3"
            >
              <ExternalLink className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-400 mb-1">signal — link manual</p>
                <p className="text-xs text-muted-foreground">O Signal não tem API de broadcast. Ao enviar, abriremos o link do grupo para você colar a mensagem.</p>
              </div>
            </div>
          )}

          {/* Botão enviar */}
          <button
            onClick={sendBroadcast}
            disabled={sending || !message.trim()}
            style={{
              background: message.trim()
                ? "linear-gradient(135deg, rgba(var(--neon-rgb,100,220,100),0.15) 0%, rgba(var(--neon-rgb,100,220,100),0.08) 100%)"
                : "rgba(255,255,255,0.04)",
              border: message.trim()
                ? "1px solid rgba(var(--neon-rgb,100,220,100),0.4)"
                : "1px solid rgba(255,255,255,0.08)",
              color: message.trim() ? "var(--neon,#64dc64)" : "var(--muted-foreground)",
            }}
            className="w-full flex items-center justify-center gap-2 rounded-xl py-3.5 font-mono text-[11px] uppercase tracking-[0.3em] transition disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
            {sending ? "enviando…" : `enviar via ${channelLabel(channel)}`}
          </button>
        </div>

        {/* Histórico */}
        <div className="space-y-3">
          <h3 className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">histórico</h3>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mensagem enviada ainda.</p>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {history.map((b) => (
                <div
                  key={b.id}
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10,
                  }}
                  className="p-4"
                >
                  <div className="flex items-start gap-2 mb-2">
                    {statusIcon(b.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {channelLabel(b.channel)}
                        </span>
                        {b.telegram_ok > 0 && (
                          <span className="font-mono text-[9px] text-green-500">✓ {b.telegram_ok}</span>
                        )}
                        {b.telegram_fail > 0 && (
                          <span className="font-mono text-[9px] text-destructive">✗ {b.telegram_fail}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(b.created_at).toLocaleString("pt-BR")}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-3">{b.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
