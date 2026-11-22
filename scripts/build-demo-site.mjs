// Builds the read-only console demo as static files for Vercel: the same fixed
// list the local server serves under /console/, and nothing that needs the API.
import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticFiles } from '../src/static-files.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'site');

await rm(out, { recursive: true, force: true });
for (const [route, [file]] of staticFiles) {
  if (!route.startsWith('/console/') || route.endsWith('/')) continue;
  const target = join(out, route);
  await mkdir(dirname(target), { recursive: true });
  await cp(join(root, 'public', file), target);
}
await cp(join(root, 'public/console/index.html'), join(out, 'console/index.html'));
console.log(`Demo site written to ${out}`);
