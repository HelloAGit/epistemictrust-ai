import type { Cases } from '../lib/schemas.ts';

export function evaluateDecisions(cases: Cases<'decision'>) {
  return cases.map(({ id, objective, baselineId, recommendationId, alternatives, realisedOutcome }) => {
    const direction = objective === 'maximize_utility' ? 1 : -1;
    const scores = alternatives.map(alternative => ({
      id: alternative.id,
      expectedValue: alternative.outcomes.reduce((sum, outcome) => sum + outcome.probability * outcome.value, 0),
    }));
    const baseline = scores.find(score => score.id === baselineId)!;
    const best = Math.max(...scores.map(score => direction * score.expectedValue));
    const recommendation = scores.find(score => score.id === recommendationId);
    return {
      id, objective, scores, baselineId, recommendationId: recommendationId ?? null,
      optimalAlternativeIds: scores.filter(score => direction * score.expectedValue === best).map(score => score.id),
      bestImprovementOverBaseline: best - direction * baseline.expectedValue,
      recommendedImprovementOverBaseline: recommendation
        ? direction * (recommendation.expectedValue - baseline.expectedValue) : null,
      expectedOutcomeStatus: 'simulated',
      realisedOutcome: realisedOutcome ? { ...realisedOutcome, status: 'reported_unverified' } : null,
    };
  });
}
