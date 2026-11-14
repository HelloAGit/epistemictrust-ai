import { arenaModels, dataset, maxOutputTokens } from '../src/lib/arena.js';

export function GET() {
  return Response.json({
    dataset: { id: dataset.id, title: dataset.title, count: dataset.cases.length },
    models: arenaModels().map(({ id, provider, model, key }) => ({
      id, provider, model, maxOutputTokens,
      available: Boolean(key && process.env.AGENT_ENABLED === 'true' && process.env.VERCEL_ENV === 'production'),
    })),
  }, { headers: { 'cache-control': 'no-store' } });
}
