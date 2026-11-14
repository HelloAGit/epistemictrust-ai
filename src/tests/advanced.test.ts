import assert from 'node:assert/strict';
import { test } from 'node:test';
import { POST as calibration } from '../../api/calibration/analyze.js';
import { POST as decision } from '../../api/decisions/simulate.js';

const request = (body: unknown) => new Request('http://localhost', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
});

test('advanced calibration matches a hand-calculated two-case fixture', async () => {
  const body = { cases: [{ confidence: 0.25, outcome: 0 }, { confidence: 0.75, outcome: 1 }], seed: 17 };
  const response = await calibration(request(body));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.brierScore, 0.0625);
  assert.equal(result.auroc, 1);
  assert.equal(result.expectedCalibrationError, 0.25);
  assert.ok(Math.abs(result.logLoss - Math.log(4 / 3)) < 1e-12);
  assert.deepEqual(result, await (await calibration(request(body))).json());
  assert.equal((await calibration(request({ cases: [] }))).status, 400);
});

test('scenario matches exact utility, regret and perfect information reference values', async () => {
  const body = { probabilities: [0.5, 0.5], baseline: 'Wait',
    actions: [{ name: 'Wait', payoffs: [0, 0] }, { name: 'Act', payoffs: [10, -4] }] };
  const response = await decision(request(body));
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.actions[1].expectedUtility, 3);
  assert.equal(result.actions[1].expectedRegret, 2);
  assert.equal(result.expectedValueOfPerfectInformation, 2);
  assert.deepEqual(result, await (await decision(request(body))).json());
  assert.equal((await decision(request({ ...body, probabilities: [0.5, 0.6] }))).status, 400);
});
