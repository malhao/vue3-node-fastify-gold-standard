# Contributing

## Setup

```sh
nvm use            # or fnm/volta, matches .nvmrc / .node-version (Node 24 Active LTS)
pnpm install
cp .env.example .env
```

## Workflow

- `pnpm dev` — run all apps in dev mode.
- `pnpm lint` / `pnpm lint:fix` — ESLint across the workspace.
- `pnpm format` / `pnpm format:check` — Prettier across the workspace.
- `pnpm typecheck` — TypeScript project references across the workspace.
- `pnpm test` — Vitest (and Playwright/Testcontainers where configured) across the workspace.
- `pnpm build` — build all apps/packages.

Every slice should be green (`lint`, `typecheck`, `test`, `build`) before opening a PR.

A pre-commit hook (via `simple-git-hooks`, installed automatically by `pnpm install`'s `prepare`
script) runs `pnpm lint && pnpm typecheck` on every commit — a commit is rejected if either fails.

## Conventions

- See `CLAUDE.md` for the working agreement and `/docs/master-prompts` for the architectural specs both apps follow.
- Conventional Commits for commit messages (`feat:`, `fix:`, `chore:`, ...).
- Zod is the source of truth at every boundary — never hand-maintain parallel types.
- Changes to the API contract (`docs/master-prompts/shared-api-conventions.md`) must flow schema → OpenAPI → generated client, ideally in one PR.

## Reporting issues

Use GitHub Issues. For security issues, see `SECURITY.md` instead of filing a public issue.
