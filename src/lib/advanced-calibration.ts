type Prediction = { confidence: number; outcome: 0 | 1 };
export type CalibrationOptions = {
  binCount: number; binning: 'equal_width' | 'equal_frequency'; seed: number; bootstrapSamples: number;
};

export function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const squaredError = ({ confidence, outcome }: Prediction) => (confidence - outcome) ** 2;
const wrong = ({ confidence, outcome }: Prediction) => Number(Number(confidence >= 0.5) !== outcome);

export function analyzeCalibration(rows: Prediction[], options: CalibrationOptions) {
  const n = rows.length;
  const sorted = [...rows].sort((a, b) => a.confidence - b.confidence);
  const groups: Prediction[][] = Array.from({ length: options.binCount }, () => []);
  let rank = 0;
  let positives = 0;
  let concordant = 0;
  for (let i = 0; i < n;) {
    let end = i + 1;
    while (end < n && sorted[end].confidence === sorted[i].confidence) end++;
    const group = sorted.slice(i, end);
    const positive = group.reduce((sum, row) => sum + row.outcome, 0);
    concordant += positive * (i - positives + (group.length - positive) / 2);
    positives += positive;
    rank = options.binning === 'equal_width'
      ? Math.floor(sorted[i].confidence * groups.length)
      : Math.floor(i * groups.length / n);
    for (const item of group) groups[Math.min(rank, groups.length - 1)].push(item);
    i = end;
  }
  const bins = groups.flatMap((group, index) => group.length ? [{
    index, count: group.length,
    confidence: group.reduce((sum, row) => sum + row.confidence, 0) / group.length,
    observed: group.reduce((sum, row) => sum + row.outcome, 0) / group.length,
  }] : []);
  const random = seededRandom(options.seed);
  const bootstrap = Array.from({ length: options.bootstrapSamples }, () => {
    let total = 0;
    for (let i = 0; i < n; i++) total += squaredError(rows[Math.floor(random() * n)]);
    return total / n;
  }).sort((a, b) => a - b);
  const ranked = rows.map(row => ({ certainty: Math.abs(row.confidence - 0.5) * 2, error: wrong(row) }))
    .sort((a, b) => b.certainty - a.certainty);
  let errors = 0;
  const riskCoverage = ranked.flatMap((row, index) => {
    errors += row.error;
    return ranked[index + 1]?.certainty === row.certainty ? [] : [{
      threshold: row.certainty, coverage: (index + 1) / n, risk: errors / (index + 1),
    }];
  });
  return {
    count: n, bins, riskCoverage,
    accuracy: 1 - errors / n,
    brierScore: rows.reduce((sum, row) => sum + squaredError(row), 0) / n,
    logLoss: rows.reduce((sum, { confidence, outcome }) => {
      const p = Math.min(1 - 1e-15, Math.max(1e-15, confidence));
      return sum - (outcome ? Math.log(p) : Math.log1p(-p));
    }, 0) / n,
    expectedCalibrationError: bins.reduce((sum, bin) => sum + bin.count * Math.abs(bin.confidence - bin.observed), 0) / n,
    maximumCalibrationError: Math.max(...bins.map(bin => Math.abs(bin.confidence - bin.observed))),
    auroc: positives && positives < n ? concordant / (positives * (n - positives)) : null,
    brierInterval: n > 1 ? {
      lower: bootstrap[Math.floor((bootstrap.length - 1) * 0.025)],
      upper: bootstrap[Math.ceil((bootstrap.length - 1) * 0.975)],
    } : null,
    warnings: n < 30 ? ['Small sample. Estimates and intervals may be unstable.'] : [],
  };
}
