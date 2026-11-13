# Client guides - 3S Admin, one per website

The how-to guides shared with each website's team: one self-contained HTML
page per site with annotated screenshots of its admin screens. The admin
shows the guide of the open website under **Guide** in its menu.

| Site | Page text | Screenshots | Built into |
| --- | --- | --- | --- |
| The Konark Academy | `sites/konark.mjs` | `img/`, `callouts.json` | `dist/index.html`, `admin/public/guide.html` |
| 3S Minerals | `sites/minerals.mjs` | `sites/minerals/` | `dist/minerals.html`, `admin/public/guide-minerals.html` |
| 3S Global Greens | `sites/globalgreens.mjs` | `sites/globalgreens/` | `dist/globalgreens.html`, `admin/public/guide-globalgreens.html` |

A site's own screenshots override the shared ones in `img/` (the sign-in
screen is shared). `callouts.json` holds where each numbered mark points, in
screenshot pixels.

## Change the text

Edit `sites/<site>.mjs`, then rebuild every guide:

    npm run guide:build

and deploy the admin (`npm run deploy:admin` uploads every `guide*.html`).
Konark's published copy: https://mehar-sharma.github.io/3s-admin-guide/
(repo Mehar-Sharma/3s-admin-guide, GitHub Pages from `main`) - copy
`dist/index.html` over its `index.html`. Published copies leave out the login
email.

## Retake the screenshots

After an admin screen changes, retake that site's screenshots with
`capture/` - see `capture/README.md`. The shots and the parts each numbered
mark points at are declared in `sites/<site>.mjs` (`shots`); the legend under
each picture lists the marks in the same order.

Konark's screenshots were taken before this tool existed; its content file
has no `shots`, so its pictures are kept as they are.
