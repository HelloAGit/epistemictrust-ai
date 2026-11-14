import { z } from 'zod';
import { analyzeCalibration } from '../../src/lib/advanced-calibration.js';
import { deterministicRoute } from '../../src/lib/deterministic-route.js';

const schema = z.strictObject({
  cases: z.array(z.strictObject({
    confidence: z.number().min(0).max(1),
    outcome: z.union([z.literal(0), z.literal(1)]),
  })).min(1).max(1000),
  binCount: z.number().int().min(2).max(20).default(5),
  binning: z.enum(['equal_width', 'equal_frequency']).default('equal_width'),
  seed: z.number().int().min(0).max(4294967295).default(42),
  bootstrapSamples: z.number().int().min(100).max(2000).default(1000),
});
export const POST = (request: Request) =>
  deterministicRoute(request, schema, ({ cases, ...options }) => ({ options, ...analyzeCalibration(cases, options) }));
