# Retaking guide screenshots

Two local-only tools:

- `serve.mjs` - a test harness: the real API router, engine and file store
  on :8787, and the admin app on :5173, signed in as a test editor. Only the
  admin's sign-in module is swapped for `fake-auth.ts`, at dev-server time;
  the admin build never contains it, and the production API never accepts
  its token. It edits **copies** of the sites' content, never the real ones.
- `capture.mjs` - opens each screen declared in `../sites/<site>.mjs`
  (`shots`), takes the screenshot and records the numbered marks.

Neither is a dependency of the repo. You need Chrome and puppeteer-core
(`npm i --no-save puppeteer-core`, or point `PUPPETEER` at an installed copy's
`lib/esm/puppeteer/puppeteer-core.js`).

```bash
# 1. Copies of each site's content (the harness writes to them)
mkdir -p /tmp/guide/{konark,minerals,globalgreens}/public
cp -r ../konark-site/content     /tmp/guide/konark/
cp -r ../3S_Minerals/content     /tmp/guide/minerals/
cp -r ../3S_GlobalGreen/content  /tmp/guide/globalgreens/

# 2. The harness (leave it running)
node docs/client-guide/capture/serve.mjs . /tmp/guide/data \
  konark=/tmp/guide/konark minerals=/tmp/guide/minerals globalgreens=/tmp/guide/globalgreens

# 3. Example enquiries for the Leads screens: POST a few to
#    http://localhost:8787/forms/<site>/<form> with an Origin header the site
#    accepts (see formOrigins in api/src/sites/<site>/site.js). The guide
#    marks those screens "Example data".

# 4. Take a site's screenshots (all, or name some), then rebuild the guides
node docs/client-guide/capture/capture.mjs minerals
node docs/client-guide/capture/capture.mjs minerals leads lead-detail
npm run guide:build
```

A mark that cannot be found, or falls outside the picture, stops the run with
the shot and mark named - adjust `shots` in the site's file (a taller
`height`, a different `scrollTo`) and run that shot again.
