/**
 * Local stand-in for S3 direct uploads, so the admin's upload code path is
 * identical in development: presign() hands out a single-use grant, and the
 * dev server's /local-uploads endpoint accepts the browser's form POST and
 * writes the file into the site's public/uploads/ folder.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import busboy from 'busboy';

export function createLocalUploader({ apiOrigin, publicDirFor }) {
  const grants = new Map();

  return {
    async presign({ key, contentType, maxBytes }, site) {
      grants.set(key, { contentType, maxBytes, site, expires: Date.now() + 5 * 60 * 1000 });
      // Keys are "<site>/<collection>/<file>"; locally they live at /uploads/<collection>/<file>.
      const publicPath = `/uploads/${key.split('/').slice(1).join('/')}`;
      return { upload: { url: `${apiOrigin}/local-uploads`, fields: { key, 'Content-Type': contentType } }, publicUrl: publicPath };
    },

    handleUpload(request, response, send) {
      const fields = {};
      let finished = false;
      const done = (status, body) => {
        if (finished) return;
        finished = true;
        send(response, status, body);
      };

      const bb = busboy({ headers: request.headers, limits: { files: 1, fields: 5, fileSize: 25 * 1024 * 1024 } });
      bb.on('field', (name, value) => {
        fields[name] = value;
      });
      bb.on('file', (_name, stream, info) => {
        const grant = grants.get(fields.key);
        if (!grant || grant.expires < Date.now() || info.mimeType !== grant.contentType) {
          stream.resume();
          done(403, { error: 'Upload grant is missing, expired, or for a different file type.' });
          return;
        }
        grants.delete(fields.key);

        const chunks = [];
        let size = 0;
        stream.on('data', (chunk) => {
          size += chunk.length;
          if (size <= grant.maxBytes) chunks.push(chunk);
        });
        stream.on('end', async () => {
          if (size > grant.maxBytes) return done(413, { error: 'That file is too large.' });
          const relative = fields.key.split('/').slice(1).join('/');
          const target = path.join(publicDirFor(grant.site), 'uploads', relative);
          await mkdir(path.dirname(target), { recursive: true });
          await writeFile(target, Buffer.concat(chunks));
          done(204, null);
        });
      });
      bb.on('error', () => done(400, { error: 'Upload failed.' }));
      request.pipe(bb);
    },
  };
}
