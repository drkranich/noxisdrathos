## Phase 2 — Personalization, Discovery & Admin Intelligence

This is a large phase. I'll ship it in 3 focused waves so each lands as a polished, production-grade slice rather than a thin sprawl across 11 areas.

---

### Wave A — Personalization Engine + Discovery Rails

**New server functions** (`src/lib/recommendations.functions.ts`):
- `getContinueWatching` — joins `watch_history` (incomplete, last 30 days) with `content`, ordered by `last_seen_at`.
- `getBecauseYouWatched` — picks 2 most-recent completed items, returns same-category/overlapping-tag content excluding already-seen.
- `getRecommendedForYou` — weighted blend: favorite categories (from bookmarks + history) + trending in last 14 days.
- `getTrendingInCircle` — content with most `watch_history` rows in last 7 days (platform-wide proxy until social graph exists).
- `getHiddenDiscoveries` — published content with low view counts but high completion ratio (editorial gem signal).
- `getRecentlyExplored` — last 10 distinct content rows from `watch_history` + `bookmarks`.

**New UI**:
- `src/components/rails/ContentRail.tsx` — horizontal scroll rail with title, editorial subtitle, snap scrolling, fade-edge masks.
- `src/components/rails/RailCard.tsx` — card with hover preview (scale + metadata reveal + thumbnail blur-up), progress bar overlay when in `watch_history`.
- Refactor `app.index.tsx` to compose these rails below the cinematic hero.

**Discovery page** (`/app/discover` — new route):
- Predictive search (debounced, queries title/subtitle/tags via ilike, returns grouped results: Content / Categories / Tags).
- Smart category exploration grid.
- Related-content sidebar on content detail (already-existing or to-stub).

---

### Wave B — Admin Intelligence Center + Realtime

**New server functions** (`src/lib/admin-intelligence.functions.ts`, admin-only via `has_role`):
- `getRealtimeMetrics` — active sessions (last 5 min), MRR, new signups today, watch-hours today.
- `getEngagementAnalytics` — DAU/WAU/MAU, avg session length, completion rate by content type, top 10 content by engagement.
- `getRetentionCohorts` — weekly cohort retention from `profiles.created_at` + `watch_history`.
- `getUserHealthList` — per-user engagement score (recency × frequency × depth), churn risk flag, dormant flag.
- `getModerationQueue` — flagged comments + recent support tickets.

**New admin route** `/app/admin/intelligence`:
- Realtime activity feed (Supabase Realtime on `watch_history`, `bookmarks`, `comments`).
- MRR sparkline + plan-mix donut.
- Retention heatmap.
- User health table with sort by risk.
- Moderation + support inboxes side-by-side.

Enable realtime publication on `watch_history`, `comments`, `bookmarks`.

---

### Wave C — Hover Immersion, Smart Notifications, Global Search

- `HoverPreviewCard` polish — autoplay muted trailer (when `external_url` is a video), 300ms delay, GPU-accelerated transforms.
- Notifications system: new `notifications` table (user_id, kind, payload, read_at), server fn to generate "unfinished content" + "new release" notifications, realtime subscription, header bell with unread badge.
- Global search palette (Cmd+K) — cinematic overlay searching content + categories + tags, keyboard-navigable, prepared with a `search_vector` tsvector column + GIN index so an embeddings layer can be added later without UI changes.
- Weekly digest scaffolding: pg_cron job hitting `/api/public/hooks/weekly-digest` to write digest notifications (email sending deferred).

---

### Approach

I'll deliver **Wave A in this turn** (highest user-visible impact, unblocks the home page promise), then ask before continuing to B and C so you can steer priorities and we keep PRs reviewable.

Confirm and I'll start with Wave A.