# Code Structure & Routing Overview

This `frontend/` app is an isolated Next.js 14 + TypeScript + Tailwind setup for the Connect aka Signull game UI & FirestoreDB. It does not impact the root project deployment.

## Routing Philosophy

- **Normal routes** (e.g., `/`, `/lobby`, `/play` under `/(game)/`) represent the **prototype v2** of the application. These are stable, production-ready features and UI.
- **`/beta` routes** (e.g., `/beta`, `/beta/lobby`, `/beta/play`) are the **latest project developments**. These routes are used for testing new features, UI/UX experiments, and ongoing improvements before they are merged into the main prototype.

## Project Structure

The main folders and their purposes are:

- `src/app/` — Next.js app directory. Contains route definitions and page layouts.
  - `/(game)/` — Main game routes (prototype v2).
  - `beta/` — Latest development routes and features.
  - `components/` — Reusable UI components, organized by feature (e.g., `game/`, `lobby/`, `ui/`, `beta/`).
  - `lib/` — Shared utilities, game logic, types, and hooks.
  - `public/` — Static assets (images, sounds, favicon, etc.).
  - `test/` — Test setup files.

### Key Files & Folders

- `src/app/globals.css` — Global styles.
- `src/app/layout.tsx` — Root layout for the app.
- `src/app/page.tsx` — Main landing page.
- `src/components/` — UI components, further split by domain (e.g., `game/`, `lobby/`, `ui/`, `beta/`).
- `src/lib/` — Core logic, types, and utilities.

### Development Notes

- The `/beta` directory is the primary place for new features and rapid iteration. Once features are stable, they are migrated to the main game routes.
- The codebase uses TypeScript for type safety and Tailwind CSS for styling.
- Testing is set up with Vitest (see `vitest.config.ts`).

---

## Getting Started

First, install deps and run the development server:

```bash
npm install && npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

Routes:

- `/(game)/lobby`
- `/(game)/play`

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
