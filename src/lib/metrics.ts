export function calibrationMetrics(cases: readonly { confidence: number; outcome: 0 | 1 }[]) {
  if (!cases.length) throw new RangeError('Calibration requires at least one case');
  const bins = Array.from({ length: 5 }, () => ({ count: 0, confidence: 0, outcome: 0 }));
  let correct = 0;
  let positives = 0;
  let squaredError = 0;
  for (const { confidence, outcome } of cases) {
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1 || (outcome !== 0 && outcome !== 1)) {
      throw new RangeError('Invalid probability or outcome');
    }
    correct += Number(Number(confidence >= 0.5) === outcome);
    positives += outcome;
    squaredError += (confidence - outcome) ** 2;
    const bin = bins[Math.min(4, Math.floor(confidence * 5))];
    bin.count++;
    bin.confidence += confidence;
    bin.outcome += outcome;
  }
  const count = cases.length;
  return {
    accuracy: correct / count,
    positiveOutcomeRate: positives / count,
    brierScore: squaredError / count,
    expectedCalibrationError: bins.reduce((sum, bin) => sum + Math.abs(bin.outcome - bin.confidence), 0) / count,
    bins: bins.map((bin, index) => ({
      lower: index / 5,
      upper: (index + 1) / 5,
      upperInclusive: index === 4,
      count: bin.count,
      meanConfidence: bin.count ? bin.confidence / bin.count : null,
      observedFrequency: bin.count ? bin.outcome / bin.count : null,
    })),
  };
}
