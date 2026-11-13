import type { Cases } from '../lib/schemas.ts';
import { calibrationMetrics } from '../lib/metrics.ts';

export function evaluateCalibration(cases: Cases<'calibration'>) {
  const { bins, ...metrics } = calibrationMetrics(cases);
  return { metrics, results: { bins } };
}
