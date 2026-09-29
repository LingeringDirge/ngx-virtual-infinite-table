const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4200;
const DIST = path.join(__dirname, 'dist', 'demo', 'browser');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  // Strip base href prefix if present
  if (reqPath.startsWith('/ngx-virtual-infinite-table')) {
    reqPath = reqPath.slice('/ngx-virtual-infinite-table'.length);
  }
  if (!reqPath || reqPath === '/') {
    reqPath = '/index.html';
  }

  let filePath = path.join(DIST, reqPath);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500);
      res.end('Error loading file');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Local static server running at http://localhost:${PORT}/ with no-cache headers`);
});
