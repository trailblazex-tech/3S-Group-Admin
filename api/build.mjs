/**
 * Bundles each Lambda into one file and zips it:
 *   dist/lambda.zip       the admin API (src/lambda.js)
 *   dist/auth-mailer.zip  Cognito's custom email sender (src/aws/auth-mailer.js)
 * A single bundled index.mjs means no node_modules in the package and no
 * platform-specific zip path quirks.
 */
import { build } from 'esbuild';
import { createWriteStream, mkdirSync, readFileSync } from 'node:fs';
import yazl from 'yazl';

mkdirSync('dist', { recursive: true });

async function bundle(entry, name) {
  const outfile = `dist/${name}/index.mjs`;
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'esm',
    minify: true,
    sourcemap: 'inline',
    legalComments: 'none',
    external: ['pg-native'],
    // Some bundled CommonJS dependencies call require(); give ESM output one.
    banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  });

  await new Promise((resolve, reject) => {
    const zip = new yazl.ZipFile();
    zip.addBuffer(readFileSync(outfile), 'index.mjs', { mtime: new Date(0) });
    zip.end();
    zip.outputStream.pipe(createWriteStream(`dist/${name}.zip`)).on('close', resolve).on('error', reject);
  });
  console.log(`Built api/dist/${name}.zip`);
}

await bundle('src/lambda.js', 'lambda');
await bundle('src/aws/auth-mailer.js', 'auth-mailer');
