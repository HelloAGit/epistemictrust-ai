import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { calibrationMetrics } from './metrics.js';

export const dataset = {
  id: 'binary-reference-v1', title: 'Binary reference questions',
  cases: [
    { id: 'arithmetic', claim: '17 multiplied by 19 equals 323.', outcome: 1 },
    { id: 'astronomy', claim: 'Venus is farther from the Sun than Earth.', outcome: 0 },
    { id: 'geography', claim: 'The equator passes through Kenya.', outcome: 1 },
    { id: 'geometry', claim: 'Every rectangle has four sides of equal length.', outcome: 0 },
  ] as const,
};
export const protocol = 'Assess whether the supplied claim is true. Return your probability that it is true between 0 and 1 and a brief rationale. Use your own knowledge.';
export const maxOutputTokens = 256;
export const predictionSchema = z.object({ confidence: z.number().min(0).max(1), rationale: z.string() });

export const arenaInput = z.strictObject({
  modelIds: z.array(z.string().min(1).max(100)).min(1).max(2)
    .refine(ids => new Set(ids).size === ids.length, 'Select distinct models'),
  datasetId: z.literal(dataset.id),
  sampleSize: z.number().int().min(1).max(dataset.cases.length),
  maxCalls: z.number().int().min(1).max(4),
});
export type ArenaInput = z.infer<typeof arenaInput>;

export function arenaModels() {
  const providers = [
    { provider: 'anthropic' as const, key: process.env.ANTHROPIC_API_KEY, models: process.env.ARENA_ANTHROPIC_MODELS },
    { provider: 'openai' as const, key: process.env.OPENAI_API_KEY, models: process.env.ARENA_OPENAI_MODELS },
  ];
  return providers.flatMap(({ provider, key, models }) => {
    const fallback = (process.env.EVALUATION_PROVIDER ?? 'openai') === provider ? process.env.EVALUATION_MODEL : undefined;
    const ids = new Set((models ?? fallback ?? '').split(',').map(id => id.trim()).filter(Boolean));
    return [...ids].map(model => ({ id: provider + ':' + model, provider, model, key: key?.trim() }));
  });
}

export type ArenaModel = ReturnType<typeof arenaModels>[number];
export type PredictionRecord = z.infer<typeof predictionSchema> & {
  responseId: string; modelVersion: string; inputTokens: number | null; outputTokens: number | null; latencyMs: number;
};
type ArenaRow = { modelId: string; caseId: string; claim: string; outcome: 0 | 1 } & (
  { status: 'completed' } & PredictionRecord |
  { status: 'deadline' | 'rate_limited' | 'limiter_unavailable' | 'provider_error' }
);

export async function runArena(
  input: ArenaInput, models: readonly ArenaModel[],
  predict: (model: ArenaModel, claim: string, signal: AbortSignal) => Promise<PredictionRecord>,
  reserve: () => Promise<boolean>, signal: AbortSignal,
) {
  const predictions: ArenaRow[] = [];
  const startedAt = new Date().toISOString();
  for (const model of models) {
    for (const item of dataset.cases.slice(0, input.sampleSize)) {
      const base = { modelId: model.id, caseId: item.id, claim: item.claim, outcome: item.outcome };
      if (signal.aborted) {
        predictions.push({ ...base, status: 'deadline' as const });
        continue;
      }
      let admitted;
      try {
        admitted = await reserve();
      } catch {
        predictions.push({ ...base, status: 'limiter_unavailable' as const });
        continue;
      }
      if (!admitted) {
        predictions.push({ ...base, status: 'rate_limited' as const });
        continue;
      }
      try {
        signal.throwIfAborted();
        const prediction = await predict(model, item.claim, signal);
        predictions.push({ ...base, ...prediction, status: 'completed' as const });
      } catch {
        predictions.push({ ...base, status: signal.aborted ? 'deadline' as const : 'provider_error' as const });
      }
    }
  }
  return {
    id: randomUUID(), startedAt, completedAt: new Date().toISOString(),
    mode: 'live', confidenceOrigin: 'self_reported_event_probability',
    configuration: { ...input, protocol, protocolHash: createHash('sha256').update(protocol).digest('hex'),
      maxOutputTokens, maxRetries: 0, tools: [], datasetHash: createHash('sha256').update(JSON.stringify(dataset)).digest('hex') },
    predictions,
    comparison: models.map(model => {
      const rows = predictions.filter((row): row is Extract<ArenaRow, { status: 'completed' }> =>
        row.modelId === model.id && row.status === 'completed');
      return { modelId: model.id, completed: rows.length, requested: input.sampleSize,
        meanLatencyMs: rows.length ? rows.reduce((sum, row) => sum + row.latencyMs, 0) / rows.length : null,
        metrics: rows.length === input.sampleSize ? calibrationMetrics(rows) : null };
    }),
  };
}
