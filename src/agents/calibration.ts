import type { Cases } from '../lib/schemas.js';
import { calibrationMetrics } from '../lib/metrics.js';

export function evaluateCalibration(cases: Cases<'calibration'>) {
  const { bins, ...metrics } = calibrationMetrics(cases);
  return { metrics, results: { bins } };
}
