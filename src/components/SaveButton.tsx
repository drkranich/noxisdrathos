import { Bookmark, Heart, Clock, Loader2 } from "lucide-react";
import { useBookmark, type BookmarkKind } from "@/hooks/useBookmark";
import { cn } from "@/lib/utils";

const ICON: Record<BookmarkKind, typeof Heart> = {
  favorite: Heart,
  watchlist: Bookmark,
  later: Clock,
};

const ARIA: Record<BookmarkKind, { on: string; off: string }> = {
  favorite: { on: "Remover dos favoritos", off: "Adicionar aos favoritos" },
  watchlist: { on: "Remover da watchlist", off: "Salvar na watchlist" },
  later: { on: "Remover", off: "Salvar para depois" },
};

export function SaveButton({
  contentId,
  kind = "favorite",
  size = "md",
  variant = "ghost",
  className,
  stopPropagation = true,
}: {
  contentId: string;
  kind?: BookmarkKind;
  size?: "sm" | "md";
  variant?: "ghost" | "solid";
  className?: string;
  stopPropagation?: boolean;
}) {
  const { saved, toggle, loading } = useBookmark(contentId, kind);
  const Icon = ICON[kind];
  const dim = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const ico = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? ARIA[kind].on : ARIA[kind].off}
      disabled={loading}
      onClick={(e) => {
        if (stopPropagation) {
          e.preventDefault();
          e.stopPropagation();
        }
        toggle();
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-all duration-300 backdrop-blur",
        dim,
        variant === "ghost"
          ? "bg-background/60 hover:bg-background/80 border border-border"
          : "bg-foreground text-background hover:bg-foreground/90",
        saved && "text-[var(--neon)] border-[var(--neon)]/40",
        className,
      )}
    >
      {loading ? (
        <Loader2 className={cn(ico, "animate-spin opacity-60")} />
      ) : (
        <Icon
          className={cn(ico, "transition-transform", saved && "fill-current scale-110")}
        />
      )}
    </button>
  );
}
