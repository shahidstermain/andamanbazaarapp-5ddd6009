# GitHub Branch Protection (Lovable Sync Safety)

Lovable's two-way sync breaks when the tracked branch (usually `main`) is force-pushed,
rebased, reset, or deleted — that's what causes errors like
`commit … not found in any remote`.

Apply these protections **once** on the tracked branch to make those operations impossible.

## Recommended settings (tracked branch, e.g. `main`)

Required:
- [x] **Restrict deletions** — branch cannot be deleted.
- [x] **Block force pushes** — no `git push --force` / history rewrites.
- [x] **Require linear history** — prevents merge-commit history corruption that confuses sync.
- [x] **Require a pull request before merging**
  - Required approvals: `1` (or `0` for solo projects, but keep PRs to get a diff view).
  - [x] Dismiss stale approvals on new commits.
- [x] **Require status checks to pass before merging** — add your CI checks (lint, typecheck, build) once they exist.
- [x] **Require conversation resolution before merging**.

Optional but recommended:
- [x] **Require signed commits** (only if all contributors have signing set up).
- [ ] **Lock branch** — leave OFF; locking blocks Lovable from pushing too.
- [ ] **Do not allow bypassing the above settings** — leave **OFF** for the Lovable GitHub App
      (or explicitly add the Lovable App to the bypass list). Otherwise Lovable's pushes will be rejected.

## Apply via GitHub UI

Repo → **Settings → Branches → Add branch ruleset** (or classic *Branch protection rule*) →
target `main` → tick the boxes above → **Create**.

## Apply via `gh` CLI (one command)

Requires the [GitHub CLI](https://cli.github.com/) authenticated as a repo admin.
Replace `OWNER/REPO` and run:

```bash
OWNER_REPO="OWNER/REPO"
BRANCH="main"

gh api -X PUT "repos/${OWNER_REPO}/branches/${BRANCH}/protection" \
  -H "Accept: application/vnd.github+json" \
  -F required_status_checks=null \
  -F enforce_admins=false \
  -F required_pull_request_reviews.required_approving_review_count=1 \
  -F required_pull_request_reviews.dismiss_stale_reviews=true \
  -F restrictions=null \
  -F required_linear_history=true \
  -F allow_force_pushes=false \
  -F allow_deletions=false \
  -F required_conversation_resolution=true \
  -F block_creations=false \
  -F lock_branch=false
```

Notes:
- `enforce_admins=false` lets the Lovable GitHub App push on your behalf. If you set it to `true`,
  add the Lovable App to a bypass list in a **ruleset** instead (rulesets support per-actor bypass; classic protections do not).
- Add CI checks later by replacing `required_status_checks=null` with:
  `-F 'required_status_checks[strict]=true' -F 'required_status_checks[contexts][]=build' -F 'required_status_checks[contexts][]=typecheck'`

## Verify

```bash
gh api "repos/${OWNER_REPO}/branches/${BRANCH}/protection" | jq '{
  force_pushes: .allow_force_pushes.enabled,
  deletions:    .allow_deletions.enabled,
  linear:       .required_linear_history.enabled,
  conv:         .required_conversation_resolution.enabled
}'
```

Expected: `force_pushes=false`, `deletions=false`, `linear=true`, `conv=true`.

## If Lovable pushes start failing after enabling protection

1. Confirm `enforce_admins=false`, OR add the Lovable GitHub App to the ruleset bypass list.
2. Confirm the branch isn't **locked**.
3. Disconnect & reconnect GitHub in Lovable (**Connectors → GitHub**).

_Reference this from `LOVABLE_MAINTENANCE_CHECKLIST.md` § 1 (Git & branch hygiene)._