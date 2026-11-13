const incrementWithExpiry = "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 120) end; return n";

export async function allowModelCall(url: string, token: string, signal: AbortSignal) {
  const endpoint = new URL(url);
  if (endpoint.protocol !== 'https:') throw new Error('Redis endpoint must use HTTPS');
  const minute = Math.floor(Date.now() / 60000);
  const response = await fetch(endpoint, {
    method: 'POST', redirect: 'error', signal,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(['EVAL', incrementWithExpiry, 1, `epistemictrust:model-calls:${minute}`]),
  });
  if (!response.ok) throw new Error('Rate limiter unavailable');
  const payload = await response.json() as { result?: unknown };
  if (typeof payload.result !== 'number' || !Number.isInteger(payload.result) || payload.result < 1) {
    throw new Error('Invalid rate limiter response');
  }
  return payload.result <= 5;
}
