import { z } from 'zod';

export async function deterministicRoute<T extends z.ZodType>(
  request: Request, schema: T, run: (input: z.output<T>) => unknown | Promise<unknown>,
) {
  const headers = { 'cache-control': 'no-store' };
  const reply = (value: unknown, status: number) => Response.json(value, { status, headers });
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply({ error: 'Expected application/json' }, 415);
  }
  const reader = request.body?.getReader();
  if (!reader) return reply({ error: 'Missing body' }, 400);
  try {
    let bytes = 0;
    let body = '';
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 65536) {
        void reader.cancel().catch(() => {});
        return reply({ error: 'Request exceeds 64 KiB' }, 413);
      }
      body += decoder.decode(value, { stream: true });
    }
    const result = schema.safeParse(JSON.parse(body + decoder.decode()));
    if (!result.success) return reply({ error: 'Invalid request', issues: result.error.issues.map(({ path, message }) => ({ path, message })) }, 400);
    const output = await run(result.data);
    return output instanceof Response ? output : reply(output, 200);
  } catch {
    return reply({ error: 'Unable to process request' }, 400);
  } finally {
    reader.releaseLock();
  }
}
