/**
 * Uploads the banner library built by build.py to the media bucket, where
 * the admin's pickers and the websites load it from.
 *
 *   python scripts/greeting-library/build.py
 *   npm run library:upload
 *
 * Banners keep their names when rebuilt, so they are cached for a week
 * rather than forever.
 */
import { existsSync } from 'node:fs';
import { aws, fail, stackOutputs } from '../lib/aws.mjs';

const source = '.build/greeting-library';
if (!existsSync(source)) fail(`Nothing to upload - run python scripts/greeting-library/build.py first.`);

const { MediaBucket, MediaBaseUrl } = stackOutputs();
aws(
  [
    's3',
    'sync',
    source,
    `s3://${MediaBucket}/library/greetings`,
    '--exclude',
    '*',
    '--include',
    '*.webp',
    '--content-type',
    'image/webp',
    '--cache-control',
    'public, max-age=604800',
  ],
  { json: false },
);

console.log(`Banner library live at ${MediaBaseUrl}/library/greetings/`);
