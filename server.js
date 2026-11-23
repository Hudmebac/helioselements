import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8091);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    res.writeHead(400);
    res.end('Bad request');
    return;
  }

  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const filePath = path.resolve(__dirname, relative);
  const rel = path.relative(__dirname, filePath);

  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const serve = (fp) => {
    fs.stat(fp, (err, stat) => {
      // directories resolve to their index.html, like a normal static host
      if (!err && stat.isDirectory()) return serve(path.join(fp, 'index.html'));
      if (err || !stat.isFile()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found: ' + path.relative(__dirname, fp));
        return;
      }
      res.writeHead(200, {
        'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      });
      fs.createReadStream(fp).pipe(res);
    });
  };
  serve(filePath);
});

server.listen(PORT, () => {
  console.log('');
  console.log('  HELIOS ELEMENTS');
  console.log('  Arena live at http://localhost:' + PORT);
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
