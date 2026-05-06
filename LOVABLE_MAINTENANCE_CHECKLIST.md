# Lovable Compatibility Checklist

Run this before every GitHub reconnect, major merge, or publish. Each item should pass — if not, fix before reconnecting to avoid sync errors like `commit … not found in any remote`.

## 1. Git & branch hygiene
- [ ] Default branch is the one Lovable tracks (usually `main`) and still exists on GitHub.
- [ ] No force-push, rebase, or history rewrite on the tracked branch since the last Lovable sync.
- [ ] No unresolved merge conflicts; conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`) absent:
      `rg -n '^(<<<<<<<|=======|>>>>>>>)' || echo OK`
- [ ] Working tree contains no files >100 MB and no symlinks:
      `find . -type f -size +100M -not -path './node_modules/*'`
      `find . -type l -not -path './node_modules/*'`
- [ ] All paths are ASCII (no exotic unicode in filenames).

## 2. Auto-managed files untouched
These must match upstream — never hand-edit:
- [ ] `src/integrations/supabase/client.ts`
- [ ] `src/integrations/supabase/types.ts`
- [ ] `.env` (only `VITE_SUPABASE_*` keys present)
- [ ] `supabase/config.toml` project-level keys (`project_id` unchanged)
- [ ] `supabase/migrations/*` — only new timestamped files added; existing files unchanged

Quick check:
`git diff --name-only origin/main -- src/integrations/supabase .env supabase/config.toml`

## 3. Stack lock
- [ ] `package.json` still uses React 18, Vite 5, Tailwind v3, TypeScript 5.
- [ ] No Next.js / Vue / Svelte / Angular dependencies added.
- [ ] No server runtimes (Express, Fastify, Python, etc.) added to the repo. Backend logic stays in `supabase/functions/`.
- [ ] Scripts `dev`, `build`, `lint` still present in `package.json`.
- [ ] Entry chain intact: `index.html` → `src/main.tsx` → `src/App.tsx`.

## 4. Build & quality gates
- [ ] `bun install` succeeds clean.
- [ ] `bunx tsc --noEmit` passes.
- [ ] `bun run lint` passes.
- [ ] `bunx vitest run` passes.
- [ ] `bun run build` succeeds (catches Vite/Tailwind regressions).

## 5. Backend (Lovable Cloud) integrity
- [ ] Every new table has RLS enabled with explicit policies.
- [ ] Roles still stored in `user_roles` table; `has_role()` SECURITY DEFINER unchanged.
- [ ] No CHECK constraints using `now()` or other non-immutable functions — use triggers.
- [ ] No edits to reserved schemas: `auth`, `storage`, `realtime`, `supabase_functions`, `vault`.
- [ ] All edge functions live under `supabase/functions/<name>/index.ts` and import shared helpers from `_shared/`.
- [ ] Secrets only referenced via `Deno.env.get(...)` in edge functions; none committed to the repo:
      `rg -n 'sk_live_|sk_test_|SUPABASE_SERVICE_ROLE_KEY\\s*=' -g '!**/node_modules/**'`

## 6. Design system
- [ ] No raw color utilities in components: `rg -n '\\b(text|bg|border)-(white|black|red-|blue-|green-|gray-)' src/components src/pages`
      All colors must use semantic tokens from `src/index.css` / `tailwind.config.ts`.
- [ ] All custom colors defined as HSL.

## 7. Routing & SEO
- [ ] New routes registered in `src/App.tsx`.
- [ ] Admin routes wrapped in `<AdminGuard>`.
- [ ] `public/robots.txt` and `public/sitemap.xml` updated for new public routes.
- [ ] `<SeoHead>` (or `usePageSeo`) used on every public page; single H1; meta description <160 chars.

## 8. Connectors & secrets
- [ ] Connector secrets fetched server-side only (`Deno.env.get`) — never bundled into the client unless prefixed `VITE_LOVABLE_CONNECTOR_*` and intentionally public.
- [ ] Lovable AI Gateway used for AI calls (`LOVABLE_API_KEY`); no user-supplied AI keys unless explicitly required.

## 9. Pre-reconnect smoke test
1. `git status` clean on the tracked branch.
2. Latest commit on GitHub matches latest commit shown in Lovable history.
3. App boots in preview without runtime errors (check console + network).
4. `/admin/*` routes still gated; sign-in flow works.

## 10. Reconnect procedure
If sync is broken (e.g. `commit … not found in any remote`):
1. Verify the tracked branch on GitHub still exists and was not force-pushed.
2. In Lovable: **Connectors → GitHub → Disconnect**, then **Reconnect** the same repo.
3. Confirm the latest commit hash matches on both sides.
4. Trigger a trivial edit in Lovable to verify push-to-GitHub works.
5. Push a trivial commit on GitHub to verify pull-into-Lovable works.

---
_Keep this file at the repo root. Update it whenever Lovable's platform rules change._