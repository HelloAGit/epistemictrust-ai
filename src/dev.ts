import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { GET } from '../api/health.js';
import { POST } from '../api/agent/evaluate.js';
import { POST as calibration } from '../api/calibration/analyze.js';
import { POST as simulate } from '../api/decisions/simulate.js';
import { POST as evaluateArena } from '../api/evaluations.js';
import { GET as models } from '../api/models.js';

const html = await readFile(new URL('../../public/index.html', import.meta.url));
const analytics = await readFile(new URL('../../public/analytics.js', import.meta.url));
const advanced = await readFile(new URL('../../public/advanced.js', import.meta.url));
const arena = await readFile(new URL('../../public/arena.js', import.meta.url));
const postRoutes = new Map([
  ['/api/agent/evaluate', POST],
  ['/api/calibration/analyze', calibration],
  ['/api/decisions/simulate', simulate],
  ['/api/evaluations', evaluateArena],
]);
const port = Number(process.env.PORT ?? '3000');
const server = createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url ?? '/', 'http://localhost');
    if (url.pathname === '/' && incoming.method === 'GET') {
      outgoing.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    const scripts = { '/analytics.js': analytics, '/advanced.js': advanced, '/arena.js': arena };
    const script = scripts[url.pathname as keyof typeof scripts];
    if (script && incoming.method === 'GET') {
      outgoing.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' })
        .end(script);
      return;
    }
    let response: Response;
    if (url.pathname === '/api/health' && incoming.method === 'GET') {
      response = GET();
    } else if (url.pathname === '/api/models' && incoming.method === 'GET') {
      response = models();
    } else if (postRoutes.has(url.pathname) && incoming.method === 'POST') {
      const controller = new AbortController();
      outgoing.once('close', () => {
        if (!outgoing.writableFinished) controller.abort();
      });
      response = await postRoutes.get(url.pathname)!(new Request(url, {
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
