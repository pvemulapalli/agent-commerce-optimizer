## Release workflow

Release dates in `CHANGELOG.md` and `content/releases.json` come from **git commit dates** on `lib/app-version.ts`. Run `npm run release:sync-dates` to fix drift — never use the session clock or `new Date()` as a default.

### Standard release (preferred — one commit)

```bash
# 1. Finish feature work
npm run release:add          # bumps lib/app-version.ts + CHANGELOG + releases.json
git add -A
git commit -m "Version 3.3.0 - …"
npm run release:sync-dates   # optional verify
```

Commit **code, version bump, and release notes together** in a single commit.

### Catch-up: version already committed

If `lib/app-version.ts` was committed before release notes (e.g. branding landed first):

```bash
npm run release:docs         # same as release:add --docs-only
git add CHANGELOG.md content/releases.json
git commit --amend --no-edit   # fold notes into the version commit (if not pushed)
```

Use `--amend` only when the version commit is local and not pushed. Otherwise make a small docs-only follow-up commit.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run release:add` | Bump version + add release notes (before commit) |
| `npm run release:docs` | Add release notes only (version already in git) |
| `npm run release:sync-dates` | Align dates in CHANGELOG + releases.json from git history |

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
