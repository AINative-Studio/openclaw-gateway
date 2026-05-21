# openclaw-gateway

ACP-compatible multi-agent orchestration gateway with REST, Server-Sent Events (SSE), and WebSocket support.

## Features

- **REST**: `POST /v1/agents/run` — synchronous agent execution
- **SSE**: `GET /v1/agents/stream?task=...` — streaming agent output
- **WebSocket**: `ws://host/v1/ws` — bidirectional agent communication
- Docker-ready with health checks

## Quick Start

```bash
# Docker Compose
AINATIVE_API_KEY=your-key docker-compose up

# Or local dev
npm install
npm run build
AINATIVE_API_KEY=your-key npm start
```

## API

### REST
```bash
curl -X POST http://localhost:8080/v1/agents/run \
  -H "Content-Type: application/json" \
  -d '{"task": "Summarize the latest AI news"}'
```

### SSE
```bash
curl "http://localhost:8080/v1/agents/stream?task=Hello"
```

### WebSocket
```javascript
const ws = new WebSocket("ws://localhost:8080/v1/ws");
ws.send(JSON.stringify({ id: "1", task: "Hello agent" }));
ws.on("message", (data) => console.log(JSON.parse(data)));
```

## Resources

- [AINative Agent Cloud](https://ainative.studio/agent-cloud)
- [ACP Protocol](https://agentcommunicationprotocol.dev)
