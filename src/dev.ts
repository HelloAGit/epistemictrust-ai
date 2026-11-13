import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { GET } from '../api/health.ts';
import { POST } from '../api/agent/evaluate.ts';

const html = await readFile(new URL('../public/index.html', import.meta.url));
const port = Number(process.env.PORT ?? '3000');
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? '/', 'http://localhost');
    if (url.pathname === '/' && incoming.method === 'GET') {
      outgoing.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    let response: Response;
    if (url.pathname === '/api/health' && incoming.method === 'GET') {
      response = GET();
    } else if (url.pathname === '/api/agent/evaluate' && incoming.method === 'POST') {
      const controller = new AbortController();
      outgoing.once('close', () => {
        if (!outgoing.writableFinished) controller.abort();
      });
      response = await POST(new Request(url, {
        method: 'POST',
        headers: incoming.headers as Record<string, string>,
        body: Readable.toWeb(incoming) as ReadableStream,
        duplex: 'half',
        signal: controller.signal,
      } as RequestInit & { duplex: 'half' }));
    } else {
      response = Response.json({ error: 'Not found' }, { status: 404 });
    }
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    if (!outgoing.headersSent) outgoing.writeHead(500);
    outgoing.end();
  }
});
server.requestTimeout = 30_000;
server.listen(port, '127.0.0.1', () => console.log(`Listening at http://127.0.0.1:${port}`));
