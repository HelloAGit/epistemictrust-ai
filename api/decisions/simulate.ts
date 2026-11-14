import { z } from 'zod';
import { simulateScenario } from '../../src/lib/scenario.js';
import { deterministicRoute } from '../../src/lib/deterministic-route.js';

const schema = z.strictObject({
  probabilities: z.array(z.number().min(0).max(1)).min(2).max(25)
    .refine(rows => Math.abs(rows.reduce((a, b) => a + b, 0) - 1) < 1e-10, 'Probabilities must sum to 1'),
  actions: z.array(z.strictObject({
    name: z.string().trim().min(1).max(80),
    payoffs: z.array(z.number().min(-1e12).max(1e12)).min(2).max(25),
  })).min(2).max(20),
  baseline: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(20).default('utility'),
  seed: z.number().int().min(0).max(4294967295).default(42),
  trials: z.number().int().min(100).max(10000).default(2000),
}).refine(row => new Set(row.actions.map(action => action.name)).size === row.actions.length
  && row.actions.some(action => action.name === row.baseline)
  && row.actions.every(action => action.payoffs.length === row.probabilities.length),
'Require unique actions, an existing baseline and one payoff per state');

export const POST = (request: Request) => deterministicRoute(request, schema, input => ({
  unit: input.unit, seed: input.seed, trials: input.trials, ...simulateScenario(input),
}));
