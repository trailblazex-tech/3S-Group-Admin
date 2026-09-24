# Operations

All commands run from the repo root with AWS CLI credentials for the
account (`aws sts get-caller-identity` to check). Region: `eu-north-1`.
Stack: `admin-3s`.

## First-time setup (once per AWS account)

```bash
npm install
npm run deploy:infra                 # ~10 min (CloudFront); prints the outputs
npm run db:migrate                   # schema + admin_api role + IAM link
npm run deploy:api
npm run deploy:admin                 # prints the admin URL
npm run db:import -- --site konark --from ../konark-digital-academy/content
npm run user:invite -- --email you@example.com --name "Your Name" --platform-admin
```

Review infrastructure changes before applying them:

```bash
aws cloudformation create-change-set --stack-name admin-3s --change-set-name review \
  --template-body file://infra/template.yaml --capabilities CAPABILITY_NAMED_IAM --region eu-north-1
aws cloudformation describe-change-set --stack-name admin-3s --change-set-name review --region eu-north-1
```

## Deploying changes

| Changed | Run |
| --- | --- |
| `api/**` (engine, a site's sections) | `npm run check && npm run deploy:api` |
| `admin/**` | `npm run check && npm run deploy:admin` |
| `infra/template.yaml` | review a change set, then `npm run deploy:infra` |

## People

- Invite: `npm run user:invite -- --email ... --name "..." --sites a,b` (or `--platform-admin`)
- Add/remove a site: `npm run site:grant -- --email ... --site a [--revoke]`
- Lost authenticator / locked out (console or CLI):
  `aws cognito-idp admin-set-user-mfa-preference --user-pool-id <id> --username <email> --software-token-mfa-settings Enabled=false,PreferredMfa=false --region eu-north-1`
  then `admin-reset-user-password`; they set a new password and authenticator at next sign-in.
- Remove someone: `aws cognito-idp admin-disable-user ...` (keeps their history in the activity log).

## Publishing per site

Each site's "Publish" button posts to the webhook stored at
`/3s-admin/sites/<site>/publish-webhook`. Until that parameter exists, the
button says publishing isn't switched on (saving still works).

## Where to look when something's wrong

- Lambda logs: CloudWatch `/aws/lambda/3s-admin-api`
- API access logs (status, user, auth errors): `/aws/apigateway/3s-admin-api`
- A site build failed at `pull-content`: the admin API was unreachable or
  returned an error; the live site is unchanged. Re-run the build.

## Backups and recovery

- Records are never hard-deleted by the app (the DB role cannot DELETE).
  Anything "removed" in the admin is restorable with the eye button.
- Uploaded media: the bucket is versioned; overwritten/removed objects are
  kept 30 days.
- Aurora DSQL stores data across multiple availability zones. For an
  offline copy of a site's content at any time: `curl https://<admin domain>/api/delivery/<site> > backup.json`
  (published records), or `npm run db:import`'s inverse via SQL as the admin role.
