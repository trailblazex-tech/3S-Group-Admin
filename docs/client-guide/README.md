# Client guide - 3S Admin for The Konark Academy

The how-to guide shared with the client: one self-contained HTML page with
annotated screenshots of every admin screen.

- Live copy: https://mehar-sharma.github.io/3s-admin-guide/ (repo Mehar-Sharma/3s-admin-guide,
  GitHub Pages from `main`). The published copy leaves out the login email.
- `build.mjs` builds `dist/index.html` from `img/*.webp` (the screenshots) and
  `callouts.json` (where each numbered mark points, in screenshot pixels).
  Edit the section text in `build.mjs`, then:

      mkdir -p dist && node build.mjs

  and copy `dist/index.html` over `index.html` in the Pages repo.
- The screenshots were taken from the real admin screens rendered with Konark's
  content; Leads and Analytics use sample data and say so on the page.
