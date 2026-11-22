// Serves the built demo (site/) on http://127.0.0.1:4318 for a local look.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const site = fileURLToPath(new URL('../site/', import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const port = Number(process.env.PORT ?? 4318);

createServer(async (request, response) => {
  const { pathname } = new URL(request.url, 'http://localhost');
  if (pathname === '/') return response.writeHead(302, { Location: '/console/?demo' }).end();
  const file = normalize(join(site, pathname.endsWith('/') ? `${pathname}index.html` : pathname));
  if (!file.startsWith(site)) return response.writeHead(404).end();
  try {
    const body = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Demo at http://127.0.0.1:${port}/console/?demo`));
