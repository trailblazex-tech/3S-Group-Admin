# Architecture

## Goals

1. One admin, one login, for several unrelated websites.
2. A site can never see or change another site's content.
3. Each website keeps its own content model - a school and a mining company
   don't share fields.
4. Websites stay static and fast: content is baked in at build time, not
   fetched by visitors.
5. Everything is reproducible from this repo (infra as code, scripted ops).

## Request path

The admin app and its API share one CloudFront domain. `/api/*` goes to the
HTTP API; everything else is the static app. Same origin means no CORS on the
API and a tight Content-Security-Policy (`connect-src` is the app itself,
Cognito, and the media bucket for uploads).

```
browser ─► CloudFront ─┬─ /*     S3 (admin app; SPA routes rewritten to index.html by a CloudFront Function)
                       └─ /api/* API Gateway HTTP API
                                   ├─ JWT authorizer: valid Cognito ID token for this app client
                                   └─ Lambda (api/src/lambda.js)
                                        ├─ router: /me, /sites/<site>/..., /delivery/<site>
                                        ├─ access: user's Cognito groups ─► allowed sites
                                        └─ engine(site) + store(site) ─► Aurora DSQL
```

## Identity and access

- **Cognito user pool `3s-admin-users`** - invite-only (no self sign-up),
  email as username, 12+ character passwords, **authenticator-app MFA
  required for everyone**, email-based recovery, deletion protection.
- **Groups are the permission model:**
  - `platform-admins` - every site.
  - `site-<id>` - that one site.
  - Neither - the user can sign in but sees "not linked to any website".
- API Gateway verifies the token; the Lambda checks the site on **every**
  request (`api/src/core/access.js`). The admin UI hiding a site is
  convenience, not security.
- The browser authenticates with SRP (password never sent); tokens last 60
  minutes, refresh tokens 7 days and are revoked on sign-out.

## Data

Aurora DSQL (serverless PostgreSQL-compatible, no servers or capacity to
manage, scales to zero cost when idle).

| Table | Key | Holds |
| --- | --- | --- |
| `content_records` | (site, collection, id) | every record of every section; fields as JSON text |
| `collection_meta` | (site, collection) | editable category lists |
| `activity_log` | (site, at, id) | who changed what, when |

- The Lambda connects as database role **`admin_api`**, which may SELECT,
  INSERT and UPDATE - **no DELETE**. Deletes in the admin are soft (the record
  is hidden and restorable).
- Writes are per-record upserts in a transaction, retried on DSQL's
  optimistic-concurrency conflicts - two people editing different records
  never overwrite each other.
- The database cluster, user pool and media bucket are retained if the stack
  is ever deleted.

## Per-site content model

`api/src/sites/<id>/collections.js` declares each section once: where it
lives in the site's `content/*.json`, its fields and field types, how the
list is labelled and grouped. That one declaration drives server validation,
the admin's list and form screens, and the files the site build pulls.
Declarations are checked at startup (`assertValidCollections`), so a typo
fails the deploy's tests, not an editor's save.

Field types: `text`, `textarea`, `number`, `date`, `image`, `file`,
`select` (fixed options, or an editable category list), `tags`, `boolean`.
Options per collection are documented in `api/src/core/schema.js`.

## Media

Uploads never pass through Lambda (whose request limit is 6 MB). The admin
asks for a grant (`POST /sites/<site>/uploads`), the Lambda validates the
section, type (JPG/PNG/WEBP up to 10 MB, PDF up to 20 MB) and size, and
returns a 5-minute presigned POST for one exact key
`<site>/<section>/<name>-<random>.<ext>`. The browser uploads straight to the
private bucket; files are served by CloudFront with year-long caching (keys
are unique, so they never go stale).

Existing site images keep their relative paths (`/images/...`) and are
served by the site itself; the admin previews them against the site's
`publicUrl`.

## Publishing

1. Editors save; the database is the source of truth.
2. **Publish** calls that site's build webhook, stored in SSM Parameter Store
   at `/3s-admin/sites/<site>/publish-webhook` (SecureString; rotate without
   a redeploy).
3. The site build runs `scripts/pull-content.mjs` (in the site's repo), which
   GETs `/api/delivery/<site>` - published records only, in order, shaped
   exactly like the site's `content/*.json` - then builds as usual.
4. If the pull fails the build fails, and hosting keeps the previous version
   live. A site is never published from stale content.

`/api/delivery/<site>` is unauthenticated on purpose: it returns only what
is already public on that website, and is rate limited at the API.

## Operations and cost

- Throttling on the API (25 req/s sustained, 50 burst).
- API access logs and Lambda logs in CloudWatch, 30-day retention; optional
  error alarm by email (`npm run deploy:infra -- --alarm-email ...`).
- Everything bills per use. At a few editors across 3-4 sites, expect low
  single-digit dollars a month; Cognito is free up to 10,000 monthly users.
