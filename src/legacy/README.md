# Legacy compatibility layer

The existing `index.html`, `public/js/app.js`,
`public/js/tooth-silhouettes.js`, and `public/js/supabaseSync.js` remain the
production implementation during migration.
New features belong in typed modules under `src/`. Migrate one visible section
at a time and remove legacy code only after browser regression tests pass.
