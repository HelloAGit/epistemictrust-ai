import assert from 'node:assert/strict';
import { test } from 'node:test';
import { arenaInput, dataset, runArena } from '../lib/arena.js';

const models = [
  { id: 'anthropic:a', provider: 'anthropic' as const, model: 'a', key: 'fixture' },
  { id: 'openai:b', provider: 'openai' as const, model: 'b', key: 'fixture' },
];
const input = arenaInput.parse({ modelIds: models.map(model => model.id), datasetId: dataset.id, sampleSize: 2, maxCalls: 4 });
const prediction = { confidence: 0.75, rationale: 'Fixture', latencyMs: 10, responseId: 'fixture-id',
  modelVersion: 'fixture-version', inputTokens: 30, outputTokens: 10 };

test('Arena gives both models identical claim inputs and scores against server labels', async () => {
  const calls: string[] = [];
  const result = await runArena(input, models, async (_, claim) => {
    calls.push(claim);
    return prediction;
  }, async () => true, new AbortController().signal);
  assert.deepEqual(calls.slice(0, 2), calls.slice(2));
  assert.deepEqual(result.comparison.map(row => row.metrics?.accuracy), [0.5, 0.5]);
  assert.deepEqual(result.comparison.map(row => row.metrics?.brierScore), [0.3125, 0.3125]);
  assert.equal(result.predictions.length, 4);
});

test('Arena never calls a provider when the firewall refuses and omits incomplete metrics', async () => {
  let attempts = 0;
  const result = await runArena(input, models, async () => {
    attempts++;
    return prediction;
  }, async () => false, new AbortController().signal);
  assert.equal(attempts, 0);
  assert.ok(result.predictions.every(row => row.status === 'rate_limited'));
  assert.ok(result.comparison.every(row => row.metrics === null));
});
