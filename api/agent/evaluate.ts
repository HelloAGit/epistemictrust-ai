import { createHash, timingSafeEqual } from 'node:crypto';
import { requestSchema } from '../../src/lib/schemas.js';
import { evaluate } from '../../src/agents/orchestrator.js';
import { allowModelCall } from '../../src/lib/cost-control.js';

const maxBodyBytes = 64 * 1024;
const error = (status: number, code: string, message: string, headers?: HeadersInit) =>
  Response.json({ executionStatus: status === 503 ? 'unavailable' : 'failed', error: { code, message } },
    { status, headers: { 'Cache-Control': 'no-store', ...headers } });
const digest = (value: string) => createHash('sha256').update(value).digest();

async function readJson(request: Request) {
  if (Number(request.headers.get('content-length')) > maxBodyBytes) throw new RangeError('Payload too large');
  const reader = request.body?.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let body = '';
  if (reader) {
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxBodyBytes) {
          void reader.cancel().catch(() => {});
          throw new RangeError('Payload too large');
        }
        body += decoder.decode(value, { stream: true });
      }
    } finally {
      reader.releaseLock();
    }
  }
  return JSON.parse(body + decoder.decode()) as unknown;
}

export async function POST(request: Request) {
  const production = process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL_ENV);
  const token = process.env.EVALUATION_API_TOKEN?.trim();
  if (production && !token) return error(503, 'authentication_unconfigured', 'Set EVALUATION_API_TOKEN to enable evaluations.');
  if (token && !timingSafeEqual(digest(request.headers.get('authorization') ?? ''), digest(`Bearer ${token}`))) {
    return error(401, 'unauthorized', 'Supply a valid bearer token.', { 'WWW-Authenticate': 'Bearer' });
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return error(415, 'unsupported_media_type', 'Use application/json.');
  }
  let input: unknown;
  try {
    input = await readJson(request);
  } catch (cause) {
    return cause instanceof RangeError
      ? error(413, 'payload_too_large', 'Maximum request size is 64 KiB.')
      : error(400, 'invalid_json', 'Supply valid UTF-8 JSON.');
  }
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return Response.json({
      executionStatus: 'failed',
      error: { code: 'invalid_request', message: 'Request failed validation.',
        issues: parsed.error.issues.map(issue => ({ path: issue.path, code: issue.code })) },
    }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  }
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(20000)]);
  const evaluation = parsed.data;
  try {
    let provider;
    if (evaluation.evaluationType === 'evidence' || evaluation.evaluationType === 'consistency') {
      const { AGENT_ENABLED, ANTHROPIC_API_KEY, OPENAI_API_KEY, EVALUATION_MODEL, VERCEL_ENV } = process.env;
      const providerName = process.env.EVALUATION_PROVIDER ?? 'openai';
      if (providerName !== 'anthropic' && providerName !== 'openai') {
        return error(503, 'model_unavailable', 'Set EVALUATION_PROVIDER to anthropic or openai.');
      }
      const apiKey = (providerName === 'anthropic' ? ANTHROPIC_API_KEY : OPENAI_API_KEY)?.trim();
      const model = EVALUATION_MODEL?.trim();
      if (AGENT_ENABLED !== 'true' || !apiKey || !model) {
        return error(503, 'model_unavailable', 'Enable the agent and configure the selected provider key and EVALUATION_MODEL.');
      }
      if (!token || VERCEL_ENV !== 'production') {
        return error(503, 'cost_control_unconfigured', 'Live calls require authenticated Vercel production and its firewall rule.');
      }
      let allowed;
      try {
        allowed = await allowModelCall();
      } catch {
        return error(503, 'cost_control_unavailable', 'The model-call limiter is unavailable.');
      }
      if (!allowed) return error(429, 'rate_limited', 'The model-call limit has been reached.', { 'Retry-After': '60' });
      const { createModelProvider } = await import('../../src/lib/model-provider.js');
      provider = createModelProvider(providerName, apiKey, model);
    }
    return Response.json(await evaluate(evaluation, signal, provider), { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    if (signal.aborted) return error(504, 'evaluation_timeout', 'Evaluation exceeded its time limit or was cancelled.');
    return error(502, 'evaluation_failed', 'The evaluation could not be completed.');
  }
}
