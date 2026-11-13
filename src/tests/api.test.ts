import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST } from '../../api/agent/evaluate.js';
import { GET } from '../../api/health.js';
import { evaluationResponseSchema, requestSchema } from '../lib/schemas.js';
import examples from '../../data/sample-evaluations.json' with { type: 'json' };

const keys = ['NODE_ENV', 'VERCEL_ENV', 'EVALUATION_API_TOKEN', 'AGENT_ENABLED', 'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY', 'EVALUATION_PROVIDER', 'EVALUATION_MODEL', 'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'];
const post = (data: unknown, token?: string) => POST(new Request('http://localhost/api/agent/evaluate', {
  method: 'POST',
  headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
  body: JSON.stringify(data),
}));

async function isolated(run: () => Promise<void>) {
  const before = keys.map(key => process.env[key]);
  keys.forEach(key => delete process.env[key]);
  try {
    await run();
  } finally {
    keys.forEach((key, index) => {
      const value = before[index];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    });
  }
}

test('health responds with service status', async () => {
  const response = GET();
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok', service: 'epistemictrust-ai' });
});

test('samples validate and malformed calibration inputs are rejected', () => {
  for (const example of Object.values(examples)) assert.ok(requestSchema.safeParse(example).success);
  for (const cases of [[], [{ id: 'a', confidence: 1.2, outcome: 1 }],
    [{ id: 'a', confidence: -0.1, outcome: 0 }], [{ id: 'a', confidence: .8 }],
    [{ id: 'a', confidence: .8, outcome: 2 }]]) {
    assert.equal(requestSchema.safeParse({ ...examples.calibration, cases }).success, false);
  }
});

test('deterministic endpoints return structured results without a provider', () => isolated(async () => {
  for (const type of ['calibration', 'decision', 'benchmark'] as const) {
    const response = await post(examples[type]);
    assert.equal(response.status, 200);
    const result = evaluationResponseSchema.parse(await response.json());
    assert.equal(result.evaluationType, type);
    assert.equal(result.caseCount, examples[type].cases.length);
    if (type === 'calibration') assert.equal(result.metrics?.accuracy, .5);
    if (type === 'decision') {
      const [decision] = result.results as Array<{ bestImprovementOverBaseline: number }>;
      assert.equal(decision.bestImprovementOverBaseline, 1600);
    }
    if (type === 'benchmark') assert.match(JSON.stringify(result.results), /possible_answer_leakage/);
  }
}));

test('model-dependent calls report missing configuration', () => isolated(async () => {
  process.env.AGENT_ENABLED = 'true';
  process.env.EVALUATION_PROVIDER = 'anthropic';
  process.env.EVALUATION_MODEL = 'claude-sonnet-4-6';
  process.env.OPENAI_API_KEY = 'unused-openai-test-key';
  const response = await post(examples.evidence);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'model_unavailable');
}));

test('authentication and cost control fail closed in production', () => isolated(async () => {
  process.env.VERCEL_ENV = 'preview';
  assert.equal((await post(examples.calibration)).status, 503);
  process.env.EVALUATION_API_TOKEN = 'test-token';
  assert.equal((await post(examples.calibration)).status, 401);
  assert.equal((await post(examples.calibration, 'test-token')).status, 200);
  process.env.AGENT_ENABLED = 'true';
  process.env.OPENAI_API_KEY = 'test-provider';
  process.env.EVALUATION_MODEL = 'test-model';
  const response = await post(examples.evidence, 'test-token');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'cost_control_unconfigured');
}));

test('HTTP validation rejects empty cases, malformed JSON and oversized bodies', () => isolated(async () => {
  assert.equal((await post({ ...examples.calibration, cases: [] })).status, 400);
  assert.equal((await post({ text: 'a'.repeat(65_536) })).status, 413);
  const malformed = await POST(new Request('http://localhost/api/agent/evaluate', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
  }));
  assert.equal(malformed.status, 400);
}));
