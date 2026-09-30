/**
 * The published snapshot: what a site's pages read at page load.
 *
 * Publishing writes two copies to the media bucket under delivery/, both
 * served by the media CloudFront distribution with a 10-second cache - so
 * every visitor reads a static file from the nearest edge (no Lambda or
 * database per visit), and a publish reaches visitors within seconds:
 *
 *   <site>.js    what browsers load, as a plain <script>. Scripts aren't
 *                subject to CORS, which matters: CloudFront drops its CORS
 *                response headers whenever the request carries Cache-Control
 *                or Pragma (as a hard refresh does), and a fetch() would then
 *                fail. A script load has no such failure mode.
 *   <site>.json  the same content as JSON, for build tooling (the site's
 *                pull-content step) and anything else server-side.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const snapshotKey = (siteId, ext = 'json') => `delivery/${siteId}.${ext}`;

/** The browser copy: assigns the snapshot to a known global when the script runs. */
export function snapshotScript(payload) {
  return `window.__CONTENT_SNAPSHOT__=${JSON.stringify(payload)};\n`;
}

export function createSnapshotWriter({ bucket, region = process.env.AWS_REGION || 'eu-north-1' }) {
  const s3 = new S3Client({ region });
  const put = (Key, Body, ContentType) =>
    s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body, ContentType, CacheControl: 'public, max-age=10, must-revalidate' }));

  return {
    async write(siteId, payload) {
      await Promise.all([
        put(snapshotKey(siteId, 'json'), JSON.stringify(payload), 'application/json; charset=utf-8'),
        put(snapshotKey(siteId, 'js'), snapshotScript(payload), 'text/javascript; charset=utf-8'),
      ]);
    },
  };
}
