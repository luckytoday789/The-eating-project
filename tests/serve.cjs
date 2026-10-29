const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };
http.createServer((request, response) => {
  let filename;
  try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
  catch { response.writeHead(400).end(); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
  if (filename === root) filename = path.join(root, 'index.html');
  fs.readFile(filename, (error, contents) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(contents);
  });
}).listen(4192, '127.0.0.1', () => console.log('Local: http://127.0.0.1:4192/'));
