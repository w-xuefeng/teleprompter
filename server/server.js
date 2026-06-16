import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = process.env.PORT || 3456;

const rooms = new Map();

const server = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
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

  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

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

server.listen(PORT, () => {
  console.log(`Teleprompter WebSocket server running on port ${PORT}`);
});
