# 3S Admin

One admin panel for every 3S Group website. Staff sign in once (with an
authenticator app), pick a website, and edit its content - photos, people,
documents, announcements - without a developer. "Publish" rebuilds that
website with what was saved.

**Websites on the platform:** The Konark Academy (`konark`).

## How it fits together

```
 browser ──► CloudFront (admin domain)
               ├─ /*      admin app (S3)
               └─ /api/*  HTTP API ─► Lambda ─► Aurora DSQL   (content, per site)
                              │                 S3 + CloudFront (uploaded media)
                              └─ Cognito JWT check (+ site groups in Lambda)

 site build (Amplify) ──► GET /api/delivery/<site> ──► content/*.json ──► vite build
```

- **One platform, many sites.** Every row in the database carries its site;
  a request can only reach the site in its URL, and only if the signed-in
  user's groups allow it.
- **Each site keeps its own content model** as code in
  [`api/src/sites/<site>/`](api/src/sites) - completely different businesses
  can share the platform without sharing a schema.
- **The engine is generic.** Validation, ordering, soft deletes, categories,
  uploads and the activity log work the same for every section of every site.

More in [docs/architecture.md](docs/architecture.md).

## Repository

| Path | What |
| --- | --- |
| `api/src/core/` | the site-agnostic engine, router, access rules, upload rules |
| `api/src/sites/` | one folder per website: its sections and fields |
| `api/src/aws/` | production adapters: DSQL store, S3 upload grants, publish webhooks |
| `api/src/local/` | local-dev adapters: edit a site repo's `content/*.json` directly |
| `api/test/` | engine, access and isolation tests (`npm test`) |
| `admin/` | the admin app (React + Vite + Tailwind) |
| `infra/template.yaml` | the entire AWS platform as one CloudFormation stack |
| `scripts/` | deploy, database, content import, user management |

## Everyday commands

```bash
npm install
npm run dev              # local admin + API (see "Local development")
npm run check            # tests, typecheck, lint, build

npm run deploy:api       # ship backend changes
npm run deploy:admin     # ship admin app changes
npm run deploy:infra     # apply infra/template.yaml changes

npm run user:invite -- --email a@b.com --name "A B" --sites konark
npm run site:grant  -- --email a@b.com --site other-site [--revoke]
```

Guides: [onboarding a new website](docs/onboarding-a-site.md) ·
[operations & first-time setup](docs/operations.md).

## Local development

1. `cp .env.example .env.local` and fill in the Cognito ids (stack outputs).
2. Point `LOCAL_SITE_KONARK` at a checkout of the site's repo. Edits in the
   local admin change that repo's `content/*.json`; uploads land in its
   `public/uploads/`. Run the site (`npm run dev` there) to see changes live.
3. `npm run dev` → admin on http://localhost:5173, API on :8787.

Sign-in uses the real Cognito pool, so your account (and its site groups)
work the same locally as in production. Nothing local touches the
production database.
