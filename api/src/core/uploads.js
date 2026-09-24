/**
 * Upload rules, shared by the S3 presigner (production) and the local dev
 * uploader. The browser uploads straight to storage with a short-lived,
 * single-use grant, so large photos and PDFs never pass through Lambda
 * (whose request limit is 6 MB).
 */
import crypto from 'node:crypto';
import { ApiError } from './engine.js';
import { slugify } from './slugify.js';

const MB = 1024 * 1024;

export const uploadTypes = {
  'image/jpeg': { ext: 'jpg', maxBytes: 10 * MB },
  'image/png': { ext: 'png', maxBytes: 10 * MB },
  'image/webp': { ext: 'webp', maxBytes: 10 * MB },
  'application/pdf': { ext: 'pdf', maxBytes: 20 * MB },
};

/**
 * Validates an upload request and returns the storage key for it:
 * <site>/<collection>/<name>-<random>.<ext>. The random part makes every key
 * unique, so uploaded files can be cached forever.
 */
export function planUpload({ siteId, collections, collection, filename, contentType, size }) {
  if (!Object.prototype.hasOwnProperty.call(collections, collection)) {
    throw new ApiError(400, 'Uploads must belong to a section of this site.');
  }

  const rule = uploadTypes[contentType];
  if (!rule) throw new ApiError(400, 'That file type is not allowed. Use a JPG, PNG or WEBP photo, or a PDF.');

  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) throw new ApiError(400, 'That file looks empty.');
  if (bytes > rule.maxBytes) {
    throw new ApiError(413, `That file is too large - the limit is ${Math.round(rule.maxBytes / MB)} MB.`);
  }

  const base = slugify(String(filename ?? '').replace(/\.[^.]+$/, '')) || 'file';
  const key = `${siteId}/${collection}/${base}-${crypto.randomBytes(5).toString('hex')}.${rule.ext}`;
  return { key, contentType, maxBytes: rule.maxBytes };
}
