/**
 * The published snapshot: what a site's pages read at page load.
 *
 * Publishing writes <site>.json to the media bucket under delivery/, served
 * by the media CloudFront distribution with a 10-second cache - so every
 * visitor reads a static file from the nearest edge (no Lambda or database
 * per visit), and a publish reaches visitors within seconds.
 */
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export const snapshotKey = (siteId) => `delivery/${siteId}.json`;

export function createSnapshotWriter({ bucket, region = process.env.AWS_REGION || 'eu-north-1' }) {
  const s3 = new S3Client({ region });

  return {
    async write(siteId, payload) {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: snapshotKey(siteId),
          Body: JSON.stringify(payload),
          ContentType: 'application/json; charset=utf-8',
          CacheControl: 'public, max-age=10, must-revalidate',
        }),
      );
    },
  };
}
