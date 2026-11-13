import { z } from 'zod';
import type { ModelProvider } from '../lib/model-provider.js';
import type { Cases } from '../lib/schemas.js';

const claimSchema = z.object({
  claim: z.string(), sourceIds: z.array(z.string()),
  suppliedSupport: z.enum(['supported', 'partial', 'contradicted', 'unsupported']),
  rationale: z.string(),
});

export async function evaluateEvidence(cases: Cases<'evidence'>, provider: ModelProvider, signal: AbortSignal) {
  const { rows } = await provider.interpret(
    'Return one row per case ID. Extract explicit factual claims and assess whether the supplied source excerpts support each one. ' +
    'References without excerpts do not establish support. Cite only IDs belonging to excerpts in that same case. Use unsupported when no excerpt bears on the claim.',
    cases, z.object({ rows: z.array(z.object({ id: z.string(), claims: z.array(claimSchema) })) }), signal,
  );
  const byId = new Map(rows.map(row => [row.id, row]));
  if (rows.length !== cases.length || byId.size !== cases.length) throw new Error('Invalid case coverage');
  return cases.map(({ id, sources }) => {
    const row = byId.get(id);
    if (!row) throw new Error('Missing case');
    const excerptIds = new Set(sources.filter(source => source.excerpt).map(source => source.id));
    return {
      id,
      claims: row.claims.map(claim => {
        if (claim.sourceIds.some(sourceId => !excerptIds.has(sourceId))) throw new Error('Invalid source ID');
        return {
          ...claim,
          suppliedSupport: claim.sourceIds.length ? claim.suppliedSupport : 'unsupported',
          missingSource: claim.sourceIds.length === 0,
          verificationStatus: 'unverified',
        };
      }),
    };
  });
}
