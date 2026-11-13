# Evaluation methodology

**Calibration.** Brier is the mean squared error between the submitted event probability and the binary outcome. The API counts a classification as correct when thresholding at 0.5 yields the supplied outcome. It also reports the positive outcome rate, which is the statistic labelled Accuracy in the original dashboard. ECE uses five equal-width bins with inclusive lower bounds and exclusive upper bounds except for the final bin, which includes 1. ECE is the mean absolute difference between bin confidence and observed event frequency, weighted by bin size. Empty bins contribute zero.

**Decision quality.** Expected loss or utility is the sum of probability times value. Each alternative's probabilities must sum to 1 within 1e-9. The evaluator reports the optimal alternatives, baseline improvement, and recommendation improvement if supplied. Expected results are simulated. Caller-reported realised outcomes carry an unverified status and their evidence reference.

**Consistency.** The evaluator produces a controlled challenge and assesses the recorded revision when provided. It distinguishes pressure from supplied new evidence. It computes the confidence delta from the recorded values and identifies potentially unsupported shifts through model interpretation. Missing observations do not imply a reversal.

**Evidence.** The agent extracts factual claims and compares each claim with provided excerpts. It flags missing supporting material. The server validates cited excerpt IDs against the same case. Every claim remains explicitly unverified because the evaluator has no independent source access.

**Benchmark integrity.** Deterministic checks flag exact normalized answer overlap, rubrics that mention superficial lexical matching, and execution claims that require evidence. It accepts caller-controlled prompt variants and reports the checks per variant. Treat flags as review candidates. These checks cannot establish contamination or semantic equivalence.
