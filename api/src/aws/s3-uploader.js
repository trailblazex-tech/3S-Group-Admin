/**
 * Direct-to-S3 uploads. The grant pins the exact key, content type and a
 * size ceiling, and expires in five minutes; the bucket stays fully private
 * and files are served through CloudFront.
 */
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

export function createS3Uploader({ bucket, mediaBaseUrl, region = process.env.AWS_REGION || 'eu-north-1' }) {
  const s3 = new S3Client({ region });
  const base = mediaBaseUrl.replace(/\/$/, '');

  return {
    async presign({ key, contentType, maxBytes }) {
      const { url, fields } = await createPresignedPost(s3, {
        Bucket: bucket,
        Key: key,
        Conditions: [['content-length-range', 1, maxBytes]],
        Fields: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
        Expires: 300,
      });
      return { upload: { url, fields }, publicUrl: `${base}/${key}` };
    },
  };
}
