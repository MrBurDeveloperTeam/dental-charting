# Legacy compatibility layer

The existing `index.html`, `js/app.js`, `js/tooth-silhouettes.js`, and
`js/supabaseSync.js` remain the production implementation during migration.
New features belong in typed modules under `src/`. Migrate one visible section
at a time and remove legacy code only after browser regression tests pass.
