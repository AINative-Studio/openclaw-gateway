/**
 * OpenClaw Gateway
 * ACP-compatible multi-agent orchestration gateway
 *
 * Supports:
 * - REST: POST /v1/agents/run
 * - SSE:  GET  /v1/agents/stream
 * - WS:   ws://host/v1/ws
 *
 * Docs: https://github.com/AINative-Studio/openclaw-gateway
 */

import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const AINATIVE_API = (process.env.AINATIVE_API_URL ?? 'https://api.ainative.studio').replace(/\/$/, '');
const AINATIVE_KEY = process.env.AINATIVE_API_KEY ?? '';

interface AgentRunRequest {
  task: string;
  agent?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

// ── HTTP Server ────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost`);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Health check
  if (url.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    return;
  }

  // Run agent (REST)
  if (url.pathname === '/v1/agents/run' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const payload: AgentRunRequest = JSON.parse(body);
        const upstream = await fetch(`${AINATIVE_API}/api/v1/public/agents/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${AINATIVE_KEY}`,
          },
          body: JSON.stringify(payload),
        });
        const data = await upstream.json();
        res.writeHead(upstream.status);
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: String(err) }));
      }
    });
    return;
  }

  // SSE streaming agent
  if (url.pathname === '/v1/agents/stream' && req.method === 'GET') {
    const task = url.searchParams.get('task') ?? '';
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    const send = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    send('start', { task });

    // Poll AINative API for streaming (simplified — replace with real streaming when available)
    try {
      const upstream = await fetch(`${AINATIVE_API}/api/v1/public/agents/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AINATIVE_KEY}`,
        },
        body: JSON.stringify({ task }),
      });
      const data = await upstream.json();
      send('result', data);
    } catch (err) {
      send('error', { message: String(err) });
    }

    send('done', {});
    res.end();
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// ── WebSocket Server ────────────────────────────────────────────────────────

const wss = new WebSocketServer({ server, path: '/v1/ws' });

wss.on('connection', (ws: WebSocket) => {
  console.log('WS client connected');

  ws.on('message', async (data) => {
    try {
      const msg: AgentRunRequest & { id?: string } = JSON.parse(data.toString());
      const { id, ...payload } = msg;

      const upstream = await fetch(`${AINATIVE_API}/api/v1/public/agents/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AINATIVE_KEY}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await upstream.json();
      ws.send(JSON.stringify({ id, result }));
    } catch (err) {
      ws.send(JSON.stringify({ error: String(err) }));
    }
  });

  ws.on('close', () => console.log('WS client disconnected'));
});

server.listen(PORT, () => {
  console.log(`OpenClaw Gateway running on port ${PORT}`);
});
