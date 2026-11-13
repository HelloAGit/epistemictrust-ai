# Architecture

Vercel serves the original single-file dashboard from `public/index.html`. Its expected SHA-256 is `6825d758e1b76d2cbcdf7a4d1608bffa74e93f85de6e9ae62f45a74727fc990c`. Git preserves the file bytes without line-ending conversion. The browser uses localStorage for demo records.

| Section | Data and controls |
| --- | --- |
| Overview | Twenty synthetic binary cases for Model Alpha, Beta, and Gamma. Four computed metric cards, a five-bin SVG reliability diagram, a recent cases table, and four illustrative reliability dimensions alongside computed calibration quality. Add evaluation opens Calibration Lab. Reset demo restores the seed and Overview. |
| Calibration Lab | Prediction, model, confidence, binary outcome, and evidence reference. Submitting adds a browser-local case and refreshes the five measures and both reliability diagrams. |
| Consistency Audit | Reveal a scripted self-correction, adjust the pressure slider, and run the scripted pressure test. The audit table describes five failure modes. |
| Decision Simulator | Enter event and model probabilities, false-positive cost, and missed-event loss. Compare expected-loss bars, optimal action, threshold, model recommendation, and extra expected loss. |
| Benchmark Integrity | Three integrity risk cards, a fictional keyword-based grader and a trace-based verification example. |
| Reports & Exports | JSON report, CSV cases, browser print, readiness checklist, and a static integration contract example. |

Navigation toggles the visible section and updates its title and description. The original breakpoints at 950 px and 650 px control the grid and sidebar.

The two Web Handler routes are `GET /api/health` and `POST /api/agent/evaluate`. The evaluation route validates requests before dispatching to an evaluator. Calibration, decision, and benchmark checks run locally. The consistency and evidence evaluators invoke a provider abstraction backed by Vercel AI SDK's ToolLoopAgent with OpenAI. Each request allows one generation step and no model tool calls. The optional TypeScript API client is available in `src/lib/api-client.ts`; the dashboard does not load it. Keep production bearer tokens on trusted servers.

Supabase is reserved for future persistence. This version stores no API evaluation state. Redis stores only rate-limit counters.
