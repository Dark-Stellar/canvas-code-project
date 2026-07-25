## Goal

Introduce a weekly **Routine** — a 24-hour timeline for each of the 7 days, split into segments assigned to your existing tasks. Tap any segment to mark it done (color changes), or drag/edit to change what task fills that slot. Fully editable from Dashboard and Calendar, persisted to the backend, and it drives per-task completion so a full day of segments = 100% productivity.

## Core concepts

- **Routine template** (weekly, repeats every week): for each weekday, a list of segments `{ start, end, taskId, title, category }` covering 24h.
- **Routine day** (per calendar date): a copy of the template's day, plus per-segment completion state. This is what you tap on and edit for a specific date.
- Segment completion rolls up into task completion: each task's % complete for the day = (completed segment minutes for that task) / (total segment minutes for that task). Daily productivity uses the existing weighted formula on top.

## Data model (new tables)

Both scoped by `user_id` with RLS + GRANTs following project rules.

- `routine_templates`
  - `day_of_week` (0–6)
  - `segments jsonb` — array of `{ id, start_min, end_min, task_id, title, category, color }` covering 0–1440 minutes
- `routine_days`
  - `date` (YYYY-MM-DD, unique per user)
  - `segments jsonb` — same shape plus `completed: boolean` and optional `note`
  - When a date has no row yet, we lazily materialize it from the template for that weekday.

Existing `daily_reports` / `draft_tasks` stay as-is; the routine writes back computed `completion_percent` for each task into the day's draft/report so all analytics keep working.

## UI

### New component: `RoutineTimeline`
- Horizontal 24h bar (0:00 → 24:00) with hour ticks, or a vertical variant on narrow screens.
- Each segment rendered with its task's category color; completed segments switch to a filled "glow" style (round-cap, brighter color, subtle pulse) — incomplete are muted/outlined.
- Tap a segment → toggle completed (optimistic update, saves in background).
- Long-press / edit icon → segment editor sheet:
  - change task, change start/end time (snap to 15 min), split, merge with neighbor, delete.
- "+ Add segment" fills the earliest gap; segments can't overlap; gaps allowed and shown as empty slots you can tap to fill.
- Legend showing each task with its total scheduled minutes and % done today.

### Dashboard (`/`)
- New "Today's Routine" card above the task list showing `RoutineTimeline` for today. Tapping segments updates task completion live, which updates the productivity ring.
- "Edit weekly routine" button → opens routine editor.

### Calendar (`/calendar`)
- Day cells get a thin routine strip preview (mini timeline).
- Tapping a day opens the day view with the full `RoutineTimeline` for that date, fully editable retroactively (respects existing "edit any day" rule).

### New page: `/routine`
- Weekly editor: 7 tabs (Mon–Sun) each showing a 24h timeline you can build up from your current tasks. Save = updates `routine_templates`. Option: "Apply to future dates" (default on).

## Interaction / visual polish

- Category-based color tokens (reuse existing `TASK_CATEGORIES` palette via CSS variables — no hardcoded hex).
- Completed segment: filled with category color + `shadow-[0_0_12px_hsl(var(--primary)/.5)]` round glow, matches the app's "round glow" rule.
- Incomplete: same color at 25% opacity with a dashed outline.
- Smooth `animate-scale-in` on toggle; `hover-scale` on desktop.
- Now-indicator: a thin vertical line at the current time on today's timeline.

## Sync + performance

- `useRoutine(date)` React Query hook, cached alongside `useReports`; optimistic updates on segment toggle; invalidates the day report cache so Dashboard/Analytics stay in sync.
- Template lives in its own cache; changing the template only invalidates future undated days.

## Files to add / change

Add:
- `supabase migration` — `routine_templates`, `routine_days` (+ GRANTs, RLS, updated_at trigger).
- `src/types/index.ts` — `RoutineSegment`, `RoutineDay`, `RoutineTemplate` types.
- `src/lib/routine.ts` — load/save template + day, materialize-from-template, toggle segment, recompute task completion.
- `src/hooks/useRoutine.ts` — React Query wrappers.
- `src/components/RoutineTimeline.tsx` — the visual timeline.
- `src/components/RoutineSegmentEditor.tsx` — bottom sheet editor.
- `src/pages/Routine.tsx` — weekly editor, routed at `/routine`.

Change:
- `src/pages/Index.tsx` — mount `RoutineTimeline` for today, wire completion → productivity ring.
- `src/pages/Calendar.tsx` + `src/pages/DayReport.tsx` — show routine for the selected date, edit inline.
- `src/App.tsx` — register `/routine` route + prefetch.
- `src/components/MobileLayout.tsx` — nav entry for Routine.

## Out of scope (for this pass)

- Drag-to-resize with pointer gestures (v2 — start with tap + sheet editor which is faster to ship and mobile-friendly).
- Notifications per segment (can layer on the existing reminder system later).
- Sharing / exporting the routine as a PDF.

Confirm and I'll build it.