import { randomUUID } from 'node:crypto';
import { evaluationResponseSchema, type EvaluationRequest } from '../lib/schemas.ts';
import type { ModelProvider } from '../lib/model-provider.ts';
import { evaluateCalibration } from './calibration.ts';
import { evaluateDecisions } from './decision.ts';
import { evaluateConsistency } from './consistency.ts';
import { evaluateEvidence } from './evidence.ts';
import { evaluateBenchmarks } from './benchmark.ts';

export async function evaluate(request: EvaluationRequest, signal: AbortSignal, provider?: ModelProvider) {
  const base = {
    evaluationId: randomUUID(), evaluationType: request.evaluationType,
    model: request.model, timestamp: new Date().toISOString(), caseCount: request.cases.length,
    executionStatus: 'completed', metrics: null, evidenceStatus: 'unverified',
  };
  switch (request.evaluationType) {
    case 'calibration':
      return evaluationResponseSchema.parse({ ...base, ...evaluateCalibration(request.cases),
        warnings: ['Outcome labels were supplied by the caller.'] });
    case 'decision':
      return evaluationResponseSchema.parse({ ...base, results: evaluateDecisions(request.cases),
        warnings: ['Expected values use supplied assumptions. Reported realised outcomes are unverified.'] });
    case 'benchmark':
      return evaluationResponseSchema.parse({ ...base, results: evaluateBenchmarks(request.cases),
        warnings: ['Heuristic flags require manual review. Variant equivalence is caller-controlled.'] });
    case 'consistency':
      if (!provider) throw new Error('Model provider required');
      return evaluationResponseSchema.parse({ ...base, results: await evaluateConsistency(request.cases, provider, signal),
        warnings: ['Interpretation is model-assisted and uses only the supplied record.'] });
    case 'evidence':
      if (!provider) throw new Error('Model provider required');
      return evaluationResponseSchema.parse({ ...base, results: await evaluateEvidence(request.cases, provider, signal),
        warnings: ['Supplied excerpts are assessed without independent verification.'] });
  }
}
