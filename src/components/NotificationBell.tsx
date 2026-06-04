import { useState } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function NotificationBell({ compact = false }: { compact?: boolean }) {
  const { items, unread, markRead, markAllRead } = useNotifications(30);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificações"
        className={cn(
          "relative inline-flex items-center justify-center w-9 h-9 rounded-full border border-border bg-background/40 hover:bg-accent transition-colors",
          compact && "w-8 h-8",
        )}
      >
        <Bell className="w-4 h-4" />
        {unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--neon)] text-background font-mono text-[9px] flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />

          {/* Painel — posicionado relativo ao botão, para cima */}
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              right: 0,
              width: 300,
              maxHeight: 360,
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              background: "rgba(14,14,18,0.97)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div
              style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                {unread > 0 ? `${unread} não lidas` : "notificações"}
              </p>
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground disabled:opacity-30 transition"
              >
                marcar tudo
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground mb-2">
                    silêncio
                  </p>
                  <p className="text-xs text-muted-foreground">Nenhuma notificação ainda.</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {items.map((n) => {
                    const content = (
                      <div
                        className={cn(
                          "px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer",
                          !n.read_at && "bg-white/[0.03]",
                        )}
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ background: !n.read_at ? "var(--neon,#64dc64)" : "transparent" }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium leading-snug">{n.title}</p>
                            {n.body ? (
                              <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2">{n.body}</p>
                            ) : null}
                            <p className="mt-1 font-mono text-[9px] text-muted-foreground">
                              {timeAgo(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id} onClick={() => markRead(n.id)}>
                        {n.link ? (
                          <button
                            onClick={() => {
                              markRead(n.id);
                              setOpen(false);
                              void navigate({ to: n.link as string });
                            }}
                            className="block w-full text-left"
                          >
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
