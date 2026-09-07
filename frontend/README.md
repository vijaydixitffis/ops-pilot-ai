# OpsPilot AI — frontend

React + TypeScript + Vite single-page app implementing the OpsPilot AI UI prototype
(see the repository root README for product context).

## Scripts

```bash
npm install       # install dependencies
npm run dev       # dev server with HMR
npm run build     # type-check (tsc -b) + production build to dist/
npm run preview   # serve the production build locally
npm run lint      # oxlint
```

## Notes

- **No backend yet.** All demo data and interactions live in
  `src/state/DemoStore.tsx` and `src/data/useCases.ts`; comments in both files map
  each behavior to the planned Supabase-backed API.
- **Design system**: StratifyIT.ai tokens are defined in `src/index.css`
  (colors, type scale, radii, shadows). Fonts (Syne, Inter, JetBrains Mono) are
  self-hosted via `@fontsource/*`.
- **Routing** uses hash routes so the static build works from any host without
  rewrite rules: `#/` (login), `#/simulator`, `#/l1/*`, `#/admin/*`.
