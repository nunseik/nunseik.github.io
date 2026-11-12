// Minimal static server for the UX review: serves a built site the way GitHub Pages does
// (dir/ → dir/index.html, unknown path → 404.html with status 404). Loopback only.
//   node scripts/ux/static.mjs DIST PORT
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {join, normalize, extname} from 'node:path';

const [root, port] = [process.argv[2], Number(process.argv[3])];
const TYPES = {'.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml'};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = normalize(join(root, path));
  if (!file.startsWith(normalize(root))) { res.writeHead(403).end(); return; }
  try {
    const s = await stat(file);
    if (s.isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, {location: path + '/'}).end(); return; }
      file = join(file, 'index.html');
    }
    const body = await readFile(file);
    res.writeHead(200, {'content-type': TYPES[extname(file)] || 'application/octet-stream'}).end(body);
  } catch {
    const body = await readFile(join(root, '404.html')).catch(() => 'Not found');
    res.writeHead(404, {'content-type': 'text/html; charset=utf-8'}).end(body);
  }
}).listen(port, '127.0.0.1');
