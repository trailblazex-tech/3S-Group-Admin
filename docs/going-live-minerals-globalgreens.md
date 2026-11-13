# Going live: 3S Minerals and 3S Global Greens

## Status (13 Nov 2026)

Done: API and admin deployed (both sites, three guides); content imported and
matches the sites exactly; cfo@3sgroup.co.in has both sites; first snapshots
published; Global Greens new build live (pages identical to before, enquiries
also reach Leads); Minerals new build uploaded to its bucket; all three form
routes answer in production.

Left:

1. **Minerals CloudFront** (distribution `EIWU9VKDSAN5S`) is in AWS account
   794038247362, not the admin account, and caches the home page for a year.
   Someone with access runs once:
   `aws cloudfront create-invalidation --distribution-id EIWU9VKDSAN5S --paths "/*"`
   Until then visitors keep seeing the old Minerals build. After it, Publish
   reaches Minerals visitors within seconds, with no further step.
2. **Global Greens Publish** (rebuild on Publish): deploy
   `infra/site-publish.yaml` (GitHub OIDC role, limited to that bucket and
   distribution), then `npm run site:connect-github` with a fine-grained
   token. The workflow in 3S_GlobalGreen already uses that role and needs no
   repository secrets. Until then Publish on Global Greens says the website
   could not be rebuilt; changes stay saved.

   ```bash
   aws cloudformation deploy --stack-name 3s-site-publish --template-file infra/site-publish.yaml --capabilities CAPABILITY_NAMED_IAM
   ```

Both sites are on the platform in code (`api/src/sites/minerals`,
`api/src/sites/globalgreens`) and fully tested locally. Nothing below has
been run against production yet. Do the steps in order; each one is safe to
repeat.

| | 3S Minerals | 3S Global Greens |
| --- | --- | --- |
| Site repo / branch | trailblazex-tech/3S_Minerals, `admin-content` | trailblazex-tech/3S_GlobalGreen, `admin-content` |
| Site type | React + Vite (single page) | Next.js static export |
| Hosting (unchanged) | S3 + CloudFront | S3 + CloudFront |
| How Publish reaches visitors | Pages load the published snapshot at page load: **seconds**, no rebuild | The site is **rebuilt** by its GitHub workflow: ~5 minutes |
| Leads (forms into the admin) | Contact form, Vendor Enquiry form | Buy / Sell enquiry form (still emailed as well) |
| Career applications | Email (career Lambda), unchanged | Email (mail service), unchanged |

## 1. Platform: API and admin

```bash
aws login                      # the account that holds the admin-3s stack (eu-north-1)
npm ci && npm run check        # tests, typecheck, lint, build
npm run deploy:api             # the two sites, new field types, Leads changes
npm run deploy:admin           # admin screens and the three guides
```

## 2. Content

Import each site's current content (taken from the live sites, unchanged):

```bash
npm run content:check -- --site minerals     --from ../3S_Minerals/content
npm run content:check -- --site globalgreens --from ../3S_GlobalGreen/content
npm run db:import -- --site minerals     --from ../3S_Minerals/content --dry-run
npm run db:import -- --site minerals     --from ../3S_Minerals/content
npm run db:import -- --site globalgreens --from ../3S_GlobalGreen/content --dry-run
npm run db:import -- --site globalgreens --from ../3S_GlobalGreen/content
```

## 3. Access

The admin has one login today. Give it the two sites (or invite new people
with `npm run user:invite`):

```bash
npm run site:grant -- --email cfo@3sgroup.co.in --site minerals
npm run site:grant -- --email cfo@3sgroup.co.in --site globalgreens
```

Then sign in, open each site and press **Publish to website** once. That
writes the published snapshot both sites read (the media CDN's
`delivery/minerals.js|json` and `delivery/globalgreens.json`).

## 4. 3S Minerals website

Merge `admin-content` into `main` in 3S_Minerals, then upload one new build
the same way as before. The build reads `.env.production` (form and content
addresses) and needs `VITE_CAREER_API_URL` set exactly as for earlier builds,
or the career form will not send.

From then on, Publish reaches visitors within seconds - no rebuild needed.
Optional: switch on its GitHub workflow (as in step 5, with the extra secret
`CAREER_API_URL`) so the content built into the pages also stays current.

Check after it is live:

- Every section looks as before (the content was moved, not changed).
- Change a headline in the admin, Publish, refresh the site: it changes.
- Send the Contact form and a Vendor enquiry: both appear under Leads.

## 5. 3S Global Greens website

Publish runs `.github/workflows/publish.yml` in 3S_GlobalGreen: pull the
published content, build, upload to the S3 bucket, refresh CloudFront.

1. **AWS role for the workflow** (in the account that holds the site's
   bucket): an IAM role GitHub can assume through OIDC
   (`token.actions.githubusercontent.com`, audience `sts.amazonaws.com`,
   subject `repo:trailblazex-tech/3S_GlobalGreen:*`), allowed to:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       { "Effect": "Allow", "Action": ["s3:ListBucket"], "Resource": "arn:aws:s3:::<bucket>" },
       { "Effect": "Allow", "Action": ["s3:PutObject", "s3:GetObject"], "Resource": "arn:aws:s3:::<bucket>/*" },
       { "Effect": "Allow", "Action": "cloudfront:CreateInvalidation", "Resource": "arn:aws:cloudfront::<account>:distribution/<distribution id>" }
     ]
   }
   ```

2. **Repository settings**: none - the workflow names the role, bucket and
   distribution itself (none is secret).
3. Merge `admin-content` into `main`, then run the workflow once by hand
   (Actions > Publish website > Run workflow) and check the live site.
4. **Connect Publish to the workflow** - a fine-grained GitHub token for that
   one repository with "Contents: Read and write", saved in a file:

   ```bash
   npm run site:connect-github -- --site globalgreens --repo trailblazex-tech/3S_GlobalGreen --token-file ./token.txt --test
   ```

   Delete the token file afterwards; the admin keeps it encrypted in SSM.

Until step 4 is done, Publish on Global Greens answers "the website could not
be rebuilt" - changes stay saved, nothing breaks.

Check after it is live:

- All pages look as before (the content was moved, not changed).
- Change the contact person's number, Publish, wait ~5 minutes: footer,
  Contact page and WhatsApp button show the new number.
- Send an enquiry: it appears under Leads and is still emailed.

## What changed on the websites (tell the client)

- **3S Minerals**: the Contact and Vendor Enquiry forms used to show "sent"
  without sending anything; they now arrive under Leads. The vendor form asks
  for a website or profile link instead of a brochure upload. Annual reports:
  the year picker reappears on the site once a real report is published (the
  four old years all pointed at a sample PDF and are imported hidden). The
  phone number shows only once one is entered (the old one was a placeholder,
  `+91 141-XXXXXXX`, and was not shown).
- **3S Global Greens**: certificates can carry a PDF ("View certificate");
  figures awaiting data appear as soon as a number is entered; contact
  numbers and emails that were typed into individual pages now all follow
  Contact Details.
