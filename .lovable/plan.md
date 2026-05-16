## Phase 3 — Discovery, Realtime Intelligence & Content Operations

Scope is large. I'll ship in **4 waves**, each a self-contained, production-ready slice. After each wave I'll pause for a quick "continue?" so we keep PRs reviewable.

---

### Wave 1 — Foundations: Save System Fix + Notifications Schema + Realtime Hooks

**Why first**: "all save buttons fail" is a production bug; notifications + realtime are infra everything else depends on.

**Database migration**:
- `notifications` table (`user_id`, `kind`, `title`, `body`, `payload jsonb`, `link`, `read_at`, `created_at`) with RLS (users read/update own).
- `user_preferences` table (`user_id` PK, `digest_frequency`, `digest_enabled`, `notify_new_content`, `notify_replies`, `notify_trending`, `notify_announcements`, `notify_reminders`).
- `watchlist` (separate from `bookmarks.kind='favorite'`) — kept as `bookmarks.kind='watchlist' | 'favorite' | 'later'` (already supported).
- Enable realtime + `REPLICA IDENTITY FULL` on `notifications`, `content`, `announcements`.
- Index `bookmarks(user_id, content_id, kind)` unique.

**Save system** (`src/hooks/useSaveActions.ts`):
- Unified `useBookmark(contentId, kind)` returning `{ saved, toggle, loading }` with optimistic update + rollback + toast.
- Replace every direct `supabase.from('bookmarks')` mutation across `app.favorites`, `app.watchlist`, content cards, `RailCard`, content detail.
- `SaveButton` component (bookmark, watchlist, favorite variants) with saved/unsaved animation.

**Notifications scaffolding**:
- `src/lib/notifications.functions.ts` — `listNotifications`, `markRead`, `markAllRead`, `unreadCount`.
- Realtime subscription hook `useNotifications()` (auto-merges INSERTs).
- Header bell component `NotificationBell` with dot + dropdown panel.

---

### Wave 2 — Cmd+K Global Palette + Hover Trailers

**Cmd+K palette** (`src/components/CommandPalette.tsx`):
- Built on existing `cmdk` (shadcn `command.tsx`).
- Global `Cmd/Ctrl+K` keybind installed in `__root.tsx`.
- Sections: Content (debounced ilike on title/subtitle/tags), Categories, Quick Actions (Discover, Library, Favorites, Settings, Admin if has_role), Recent Searches (localStorage).
- Server fn `globalSearch(q)` with sensible limits per group.
- Cinematic backdrop blur, keyboard-nav, ⏎ to open, ⌘+letter shortcuts.

**Hover trailers** (`RailCard` polish + new `HoverPreviewCard`):
- 300 ms hover-intent delay → scale + metadata reveal + thumbnail blur-up.
- If `content.external_url` looks like mp4/webm or YouTube/Vimeo: muted, looping, GPU-accelerated `<video>` overlay; otherwise fallback to image Ken Burns drift.
- Respect `prefers-reduced-motion`.

---

### Wave 3 — Admin Content Operations + File Uploads

**Storage buckets** (migration): ensure `videos`, `pdfs`, `thumbnails`, `audios` exist; RLS — admins write, members read via signed URL.

**Upload component** (`src/components/admin/FileUploader.tsx`):
- Drag-drop + click, progress bar via XHR-style chunked upload (Supabase resumable for >6 MB), mime/size validation per bucket, retry, preview, removed-file recovery.
- Helper `uploadWithProgress` extending `src/lib/storage.ts`.

**CMS upgrades to `app.admin.content.$id.tsx`**:
- File slots wired: video (mp4), pdf, audio (mp3), thumbnail, banner.
- Markdown editor for `body_md` with split preview.
- Schedule picker (`publish_at`), visibility, featured toggle, category/tag editor.
- Draft / Publish / Schedule actions emit `admin_logs` rows.
- Live realtime broadcast: on publish, dispatch a notification to all eligible members ("notify_new_content" preference).

---

### Wave 4 — Weekly Digest + Realtime Polish

**Digest backend**:
- Migration: add `digest_log` (`user_id`, `period_start`, `period_end`, `payload jsonb`, `sent_at`).
- Server route `src/routes/api/public/hooks/weekly-digest.ts` (POST, anon-key gated): for each user with `digest_enabled`, build payload (new content last 7d, trending top 5, user's unfinished items, recent announcements) → insert in-app notification (kind `digest`) + `digest_log` row.
- pg_cron schedule: Mondays 09:00 UTC, via `supabase--insert`.
- Email delivery: scaffolded but disabled — payload is ready; flip switch later when email infra lands.

**Digest preview UI** (`/app/digest`):
- Editorial card layout previewing the upcoming digest using the same builder fn.
- Toggle in `/app/settings` for frequency + per-channel preferences (writes `user_preferences`).

**Realtime content ops**:
- Subscribe in `app.index` to `content` INSERTs where `status='published'` → toast + invalidate rails.
- Admin "publishing feedback" — `app.admin.intelligence` activity feed already covers this; add content-publish events.

---

### Technical Details

- **Stack constraints**: all server-side work goes through `createServerFn` (no edge functions); admin elevated work uses `client.server` inside thin `.functions.ts` files; pg_cron uses `pg_net` + `apikey` header to TanStack server route under `/api/public/`.
- **No new env vars needed** — Stripe keys + Supabase keys already configured.
- **RLS**: every new table gets RLS on creation; `notifications` policies are own-row only; `user_preferences` own-row; `digest_log` admins-read + own-row read.
- **Type safety**: types regenerated automatically after each migration; UI uses the regenerated `Database` types.
- **Performance**: rails / palette use server fns with explicit `LIMIT`s; realtime channels are scoped (`postgres_changes` filter on `user_id`).

---

I'll start with **Wave 1** as soon as you approve, since it both unblocks the failing save buttons (real user-visible bug) and lays the schema all later waves depend on.
