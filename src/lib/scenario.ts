import { seededRandom } from './advanced-calibration.js';

export function simulateScenario(input: {
  probabilities: number[]; actions: { name: string; payoffs: number[] }[];
  baseline: string; trials: number; seed: number;
}) {
  const { probabilities, actions, baseline, trials, seed } = input;
  const optimalByState = probabilities.map((_, index) => Math.max(...actions.map(action => action.payoffs[index])));
  const expected = (payoffs: number[]) => payoffs.reduce((sum, value, index) => sum + value * probabilities[index], 0);
  const information = expected(optimalByState);
  const baselineValue = expected(actions.find(action => action.name === baseline)!.payoffs);
  const highest = Math.max(...actions.map(action => expected(action.payoffs)));
  const random = seededRandom(seed);
  const counts = probabilities.map(() => 0);
  const cumulative = probabilities.map((_, index) => probabilities.slice(0, index + 1).reduce((a, b) => a + b, 0));
  for (let draw = 0; draw < trials; draw++) {
    const sample = random();
    const state = cumulative.findIndex(value => sample < value);
    counts[state < 0 ? counts.length - 1 : state]++;
  }
  return {
    status: 'assumed_scenario', baseline, expectedValueOfPerfectInformation: Math.max(0, information - highest),
    actions: actions.map(action => ({
      name: action.name, expectedUtility: expected(action.payoffs),
      expectedRegret: Math.max(0, information - expected(action.payoffs)),
      improvementOverBaseline: expected(action.payoffs) - baselineValue,
      simulatedMean: action.payoffs.reduce((sum, value, index) => sum + value * counts[index], 0) / trials,
      stateBreakEvenInputs: action.payoffs.map((value, index) => value - actions.find(candidate => candidate.name === baseline)!.payoffs[index]),
    })),
  };
}
