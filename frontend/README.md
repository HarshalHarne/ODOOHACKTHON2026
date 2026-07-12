# AssetFlow Frontend

This frontend is the user-facing layer for AssetFlow, built with Next.js, React, TypeScript, and Tailwind CSS.

## What it contains

- Auth screens for login and signup
- A dashboard shell with workspace navigation
- Modules for assets, allocations, bookings, audits, maintenance, notifications, reports, and organization setup
- Shared UI primitives and workspace-state helpers

## Project structure

- [src/app](src/app) — route-based pages and layout wrappers
- [src/components](src/components) — feature-specific UI components
- [src/lib/workspace](src/lib/workspace) — types, storage helpers, and demo workspace data
- [src/hooks](src/hooks) — reusable hooks

## Runtime behavior

The current frontend uses browser local storage for workspace state. Demo data is seeded from [src/lib/workspace/storage.ts](src/lib/workspace/storage.ts) and stored under the key `assetflow-workspace-v2`.

## Local development

```bash
cd frontend
npm install
npm run dev
```

Then open http://localhost:3000.

## Build verification

```bash
cd frontend
npm run build
```

## Notes

The UI is currently a frontend-first prototype. Most of the workspace modules are driven by local demo data, while the backend provides a separate API foundation for department management.
