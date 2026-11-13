import type { Cases } from '../lib/schemas.js';

const normalize = (text: string) => text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

export function evaluateBenchmarks(cases: Cases<'benchmark'>) {
  return cases.map(({ id, prompt, referenceAnswer, rubric, response, promptVariants }) => {
    const answer = normalize(referenceAnswer);
    const variants = [prompt, ...promptVariants].map((text, index) => ({
      index,
      kind: index === 0 ? 'original' : 'controlled_variant',
      exactAnswerPresent: answer.length >= 4 && normalize(text).includes(answer),
    }));
    const findings: { code: string; variantIndex?: number; rationale: string }[] = variants
      .filter(variant => variant.exactAnswerPresent)
      .map(variant => ({ code: 'possible_answer_leakage', variantIndex: variant.index, rationale: 'Normalized reference answer appears in the prompt.' }));
    if (/\b(keyword|string match|substring|exact phrase|contains the word)\b/i.test(rubric)) {
      findings.push({ code: 'superficial_grading_signal', rationale: 'Rubric mentions lexical checks. Review whether scoring independently verifies the underlying task.' });
    }
    if (response && /\b(validated|tests passed|verified)\b/i.test(response)) {
      findings.push({ code: 'execution_claim_requires_evidence', rationale: 'Response claims verification or execution. Check independent execution records before awarding credit.' });
    }
    return { id, variants, findings };
  });
}
