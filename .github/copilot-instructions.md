# Project-specific instructions for GitHub Copilot

This project uses **Bun** as the primary runtime and package manager.

## General Rules
- Always use `bun` commands (install, run, test) instead of npm, yarn, or pnpm.
- Use `bun:sqlite` for database operations.
- Use `Bun.serve()` for HTTP servers.
- **Language**: Always respond and write documentation in **Japanese**.
- Refer to files using backticks like `src/index.ts`.

## Tech Stack specifics
- Runtime: Bun
- DB: SQLite with Drizzle ORM (using bun:sqlite)
- Framework: Hono or native Bun.serve()
- Frontend: Svelte 5 / native Bun bundling (no Vite preferred)
