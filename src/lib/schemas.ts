import { z } from 'zod';

const id = z.string().trim().min(1).max(100);
const prose = z.string().trim().min(1).max(3000);
const probability = z.number().min(0).max(1);
const common = { model: id };
const cases = <T extends z.ZodType<{ id: string }>>(schema: T, maximum = 20) =>
  z.array(schema).min(1).max(maximum).refine(
    rows => new Set(rows.map(row => row.id)).size === rows.length,
    'IDs must be unique',
  );

const alternative = z.strictObject({
  id,
  outcomes: z.array(z.strictObject({ probability, value: z.number().min(-1e12).max(1e12) }))
    .min(1).max(50).refine(
      rows => Math.abs(rows.reduce((total, row) => total + row.probability, 0) - 1) <= 1e-9,
      'Outcome probabilities must sum to 1',
    ),
});

export const requestSchema = z.discriminatedUnion('evaluationType', [
  z.strictObject({
    ...common, evaluationType: z.literal('calibration'),
    cases: cases(z.strictObject({
      id, question: prose.optional(), confidence: probability, outcome: z.union([z.literal(0), z.literal(1)]),
    }), 500),
  }),
  z.strictObject({
    ...common, evaluationType: z.literal('decision'),
    cases: cases(z.strictObject({
      id, objective: z.enum(['minimize_loss', 'maximize_utility']),
      baselineId: id, recommendationId: id.optional(),
      alternatives: cases(alternative).refine(rows => rows.length >= 2, 'Provide at least two alternatives'),
      realisedOutcome: z.strictObject({ alternativeId: id, value: z.number().min(-1e12).max(1e12), evidenceReference: id }).optional(),
    }).refine(row => [row.baselineId, row.recommendationId, row.realisedOutcome?.alternativeId]
      .every(value => value === undefined || row.alternatives.some(alternative => alternative.id === value)),
      'Alternative reference does not exist')),
  }),
  z.strictObject({
    ...common, evaluationType: z.literal('consistency'),
    cases: cases(z.strictObject({
      id, initialPosition: prose, revisedPosition: prose.optional(),
      initialConfidence: probability.optional(), revisedConfidence: probability.optional(),
      challengeType: z.enum(['new_evidence', 'social_pressure']),
      challenge: prose.optional(), newEvidence: prose.optional(),
    }).refine(row => row.challengeType !== 'new_evidence' || row.newEvidence !== undefined,
      'New-evidence cases require evidence')),
  }),
  z.strictObject({
    ...common, evaluationType: z.literal('evidence'),
    cases: cases(z.strictObject({
      id, text: prose,
      sources: z.array(z.strictObject({ id, excerpt: prose.optional(), reference: prose.optional() })).max(8).default([]),
    }).refine(row => new Set(row.sources.map(source => source.id)).size === row.sources.length,
      'Source IDs must be unique')),
  }),
  z.strictObject({
    ...common, evaluationType: z.literal('benchmark'),
    cases: cases(z.strictObject({
      id, prompt: prose, referenceAnswer: prose, rubric: prose,
      response: prose.optional(), promptVariants: z.array(prose).max(5).default([]),
    })),
  }),
]);

export type EvaluationRequest = z.infer<typeof requestSchema>;
export type Cases<T extends EvaluationRequest['evaluationType']> = Extract<EvaluationRequest, { evaluationType: T }>['cases'];
export const evaluationResponseSchema = z.strictObject({
  evaluationId: z.uuid(), evaluationType: z.enum(['calibration', 'decision', 'consistency', 'evidence', 'benchmark']),
  model: id, timestamp: z.iso.datetime(), caseCount: z.number().int().positive(),
  metrics: z.record(z.string(), z.number()).nullable(), results: z.json(),
  evidenceStatus: z.enum(['unverified', 'not_applicable']),
  warnings: z.array(z.string()), executionStatus: z.literal('completed'),
});
