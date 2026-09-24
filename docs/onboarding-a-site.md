# Onboarding a new website

About an hour for a typical site. You need: the site's repo, and a list of
what its owners want to edit.

## 1. Declare the site

Create `api/src/sites/<id>/` (id: short, lowercase, e.g. `minerals`).

`site.js`:

```js
import { collections } from './collections.js';

export default {
  id: 'minerals',
  name: '3S Minerals',
  shortName: '3M',                        // badge in the site switcher
  publicUrl: 'https://3sminerals.co.in',  // where relative image paths live
  accent: '152 55% 38%',                  // brand colour as HSL components
  collections,
};
```

`collections.js` - one entry per editable section. Copy a similar section
from `sites/konark/collections.js` and adjust; every option is explained in
`api/src/core/schema.js`. Every collection needs a `sortOrder` field, and
usually an `isActive` field (lets editors hide records).

Register it in `api/src/sites/index.js`:

```js
import minerals from './minerals/site.js';
const all = [konark, minerals];
```

`npm test` validates the declarations.

## 2. Make the site read its content from files

The site must render the sections from `content/<file>.json` (one key per
collection, as declared). If it currently hardcodes them, move that data into
those files first - this is the only change to the site's own code besides
step 4.

## 3. Import its current content

```bash
npm run db:import -- --site minerals --from ../minerals-site/content --dry-run
npm run db:import -- --site minerals --from ../minerals-site/content
```

## 4. Wire the site's build

In the site repo, copy `scripts/pull-content.mjs` from the Konark repo and
add it to the build before compiling (Amplify: `preBuild`, after `npm ci`).
It does nothing until `CONTENT_DELIVERY_URL` is set, so this can ship early.

## 5. Ship and switch on

```bash
npm run deploy:api
```

Then, for the site's Amplify app (replace ids):

```bash
# the site build pulls from the platform
aws amplify update-app --app-id <APP_ID> --region <region> \
  --environment-variables CONTENT_DELIVERY_URL=https://<admin domain>/api/delivery/minerals,...existing vars...

# "Publish" in the admin triggers that build
aws amplify create-webhook --app-id <APP_ID> --branch-name main --description 3s-admin-publish
aws ssm put-parameter --type SecureString --name /3s-admin/sites/minerals/publish-webhook --value '<webhook url>'
```

> `update-app --environment-variables` replaces the whole map - include the
> app's existing variables.

## 6. Give people access

```bash
npm run user:invite -- --email owner@example.com --name "Owner Name" --sites minerals
npm run site:grant  -- --email existing@example.com --site minerals
```
