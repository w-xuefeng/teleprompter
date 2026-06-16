import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { readFileSync, existsSync } from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { networkInterfaces } from 'os';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CERT_FILE = join(__dirname, 'cert.pem');
const KEY_FILE = join(__dirname, 'key.pem');

function generateCert() {
  const ip = getLocalIP();
  const san = 'DNS:localhost,IP:127.0.0.1' + (ip ? ',IP:' + ip : '');

  execSync(
    'openssl req -x509 -newkey rsa:2048 -keyout ' + KEY_FILE +
    ' -out ' + CERT_FILE + ' -days 365 -nodes' +
    ' -subj "/CN=Teleprompter Self-Signed"' +
    ' -addext "subjectAltName=' + san + '"',
    { stdio: 'pipe' }
  );

  return {
    cert: readFileSync(CERT_FILE, 'utf8'),
    key: readFileSync(KEY_FILE, 'utf8'),
  };
}

const PORT = process.env.PORT || 3456;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res) {
  let pathname = req.url.split('?')[0];
  if (pathname === '/') pathname = '/index.html';

  // Clean URLs: try .html extension if file not found
  let filePath = join(ROOT, pathname);
  if (!existsSync(filePath) && !extname(pathname)) {
    const tryHtml = join(ROOT, pathname + '.html');
    if (existsSync(tryHtml)) {
      pathname = pathname + '.html';
      filePath = tryHtml;
    }
  }

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not Found');
    return;
  }

  const ext = extname(filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  try {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
}

const rooms = new Map();

function requestHandler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(404);
  res.end();
}

function getLocalIP() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const useHttp = process.argv.includes('--http');
let cert, key;

if (!useHttp) {
  if (existsSync(CERT_FILE) && existsSync(KEY_FILE)) {
    cert = readFileSync(CERT_FILE, 'utf8');
    key = readFileSync(KEY_FILE, 'utf8');
  } else {
    try {
      const generated = generateCert();
      cert = generated.cert;
      key = generated.key;
      console.log('已生成自签名证书 (cert.pem, key.pem)，首次访问需跳过浏览器安全警告');
    } catch {
      console.error('无法生成自签名证书，请确认已安装 openssl，或使用 --http 模式');
      process.exit(1);
    }
  }
}

const httpServer = useHttp
  ? createServer(requestHandler)
  : createHttpsServer({ key, cert }, requestHandler);

const wss = new WebSocketServer({ server: httpServer });

function generateId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function broadcast(roomName, msg, excludeWs) {
  const room = rooms.get(roomName);
  if (!room) return;
  room.forEach(info => {
    if (info.ws !== excludeWs && info.ws.readyState === 1) {
      info.ws.send(JSON.stringify(msg));
    }
  });
}

wss.on('connection', ws => {
  let clientRoom = null;
  let clientRole = null;

  ws.on('message', data => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.type) {
      case 'join': {
        const roomName = msg.room || generateId();
        clientRoom = roomName;
        clientRole = msg.role || 'remote';

        if (!rooms.has(roomName)) {
          rooms.set(roomName, new Set());
        }
        rooms.get(roomName).add({ ws, role: clientRole });

        ws.send(
          JSON.stringify({
            type: 'joined',
            room: roomName,
            role: clientRole,
          }),
        );

        broadcast(roomName, { type: 'peer-joined', role: clientRole }, ws);
        break;
      }

      case 'command':
      case 'sync':
      case 'state':
        if (clientRoom) {
          broadcast(clientRoom, msg, ws);
        }
        break;
    }
  });

  ws.on('close', () => {
    if (!clientRoom || !rooms.has(clientRoom)) return;

    const room = rooms.get(clientRoom);
    for (const info of room) {
      if (info.ws === ws) {
        room.delete(info);
        break;
      }
    }

    if (room.size === 0) {
      rooms.delete(clientRoom);
    } else {
      broadcast(clientRoom, { type: 'peer-left', role: clientRole });
    }
  });

  ws.on('error', () => {});
});

httpServer.listen(PORT, () => {
  const ip = getLocalIP();
  const proto = useHttp ? 'http' : 'https';
  console.log(`Teleprompter remote server running on port ${PORT}`);
  console.log(`  Local:    ${proto}://localhost:${PORT}/`);
  if (ip) {
    console.log(`  Remote:   ${proto}://${ip}:${PORT}/remote-control`);
    console.log(`  Short:    ${proto}://${ip}:${PORT}/ctrl`);
  }
  if (!useHttp) {
    console.log('  提示: 使用 --http 参数可切换到 HTTP 模式（不支持 PWA 安装）');
  }
});
