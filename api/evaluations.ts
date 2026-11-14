import { createHash, timingSafeEqual } from 'node:crypto';
import { arenaInput, arenaModels, runArena } from '../src/lib/arena.js';
import { allowModelCall } from '../src/lib/cost-control.js';
import { deterministicRoute } from '../src/lib/deterministic-route.js';

const digest = (value: string) => createHash('sha256').update(value).digest();
const reply = (error: string, status: number) => Response.json({ error }, { status, headers: { 'cache-control': 'no-store' } });

export async function POST(request: Request) {
  const token = process.env.EVALUATION_API_TOKEN?.trim();
  if (!token || process.env.VERCEL_ENV !== 'production' || process.env.AGENT_ENABLED !== 'true') {
    return reply('Live Arena requires configured Vercel Production.', 503);
  }
  if (!timingSafeEqual(digest(request.headers.get('authorization') ?? ''), digest('Bearer ' + token))) {
    return reply('Supply the evaluation bearer token.', 401);
  }
  const models = arenaModels();
  return deterministicRoute(request, arenaInput, async input => {
    const selected = input.modelIds.map(id => models.find(model => model.id === id));
    if (selected.some(model => !model?.key)) return reply('A selected model is unavailable.', 400);
    if (input.modelIds.length * input.sampleSize > input.maxCalls) return reply('Selection exceeds the call budget.', 400);
    const { predictArena } = await import('../src/lib/arena-provider.js');
    return runArena(input, selected.filter(model => model !== undefined), predictArena, allowModelCall,
      AbortSignal.any([request.signal, AbortSignal.timeout(23000)]));
  });
}
