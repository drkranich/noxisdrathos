import { useState } from "react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40"
          />
          <div className="absolute right-0 bottom-full mb-2 w-[360px] max-w-[92vw] max-h-[min(70vh,560px)] flex flex-col bg-card border border-border shadow-2xl z-50 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                inbox · {unread} não lidas
              </p>
              <button
                onClick={markAllRead}
                disabled={unread === 0}
                className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                marcar tudo
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {items.length === 0 ? (
                <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                  <p className="font-mono text-[10px] uppercase tracking-[0.3em] mb-3">silêncio</p>
                  Nenhuma notificação ainda.
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {items.map((n) => {
                    const content = (
                      <div className={cn("px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer", !n.read_at && "bg-foreground/[0.025]")}>
                        <div className="flex items-start gap-3">
                          {!n.read_at ? (
                            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[var(--neon)] shrink-0" />
                          ) : (
                            <span className="mt-1.5 w-1.5 h-1.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{n.title}</p>
                            {n.body ? (
                              <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                            ) : null}
                            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.3em] text-muted-foreground">
                              {n.kind} · {timeAgo(n.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                    return (
                      <li key={n.id} onClick={() => markRead(n.id)}>
                        {n.link ? (
                          <Link to={n.link} onClick={() => setOpen(false)}>
                            {content}
                          </Link>
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
