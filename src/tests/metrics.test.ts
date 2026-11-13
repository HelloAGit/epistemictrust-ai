import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calibrationMetrics } from '../lib/metrics.js';

const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} != ${b}`);

test('Brier and threshold accuracy use supplied probabilities and outcomes', () => {
  const result = calibrationMetrics([{ confidence: .85, outcome: 1 }, { confidence: .7, outcome: 0 }]);
  close(result.brierScore, .25625);
  close(result.accuracy, .5);
  close(result.expectedCalibrationError, .425);
});

test('ECE handles bin boundaries, empty bins and cancellation within a bin', () => {
  const result = calibrationMetrics([
    { confidence: 0, outcome: 0 }, { confidence: .4, outcome: 0 },
    { confidence: .5, outcome: 1 }, { confidence: 1, outcome: 1 },
  ]);
  assert.deepEqual(result.bins.map(bin => bin.count), [1, 0, 2, 0, 1]);
  assert.equal(result.bins[1].meanConfidence, null);
  close(result.expectedCalibrationError, .025);
  close(result.accuracy, 1);
});

test('invalid probability and empty case list are rejected', () => {
  assert.throws(() => calibrationMetrics([]), RangeError);
  assert.throws(() => calibrationMetrics([{ confidence: NaN, outcome: 0 }]), RangeError);
});
