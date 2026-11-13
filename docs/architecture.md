# Architecture

Vercel serves the dashboard from `public/index.html`. The initial prototype is preserved in Git at commit `ce6a34c`. The current dashboard loads `public/analytics.js` to add the Analytics section. The browser uses localStorage for demo records.

| Section | Data and controls |
| --- | --- |
| Overview | Twenty synthetic binary cases for Model Alpha, Beta, and Gamma. Four computed metric cards, a five-bin SVG reliability diagram, a recent cases table, and four illustrative reliability dimensions alongside computed calibration quality. Add evaluation opens Calibration Lab. Reset demo restores the seed and Overview. |
| Calibration Lab | Prediction, model, confidence, binary outcome, and evidence reference. Submitting adds a browser-local case and refreshes the five measures and both reliability diagrams. |
| Consistency Audit | Reveal a scripted self-correction, adjust the pressure slider, and run the scripted pressure test. The audit table describes five failure modes. |
| Decision Simulator | Enter event and model probabilities, false-positive cost, and missed-event loss. Compare expected-loss bars, optimal action, threshold, model recommendation, and extra expected loss. |
| Benchmark Integrity | Three integrity risk cards, a fictional keyword-based grader and a trace-based verification example. |
| Reports & Exports | JSON report, CSV cases, browser print, readiness checklist, and a static integration contract example. |
| Analytics | Model filter, reliability chart, Brier score comparison, and a summary from the cases in this browser. MLStatSoft API integration is pending its API contract. |

Navigation toggles the visible section and updates its title and description. The original breakpoints at 950 px and 650 px control the grid and sidebar.

The two Web Handler routes are `GET /api/health` and `POST /api/agent/evaluate`. The evaluation route validates requests before dispatching to an evaluator. Calibration, decision, and benchmark checks run locally. The consistency and evidence evaluators use Vercel AI SDK's ToolLoopAgent with Anthropic or OpenAI. Each request allows one generation step and no model tool calls. The optional TypeScript API client is available in `src/lib/api-client.ts`; the dashboard does not load it. Keep production bearer tokens on trusted servers.

Supabase is reserved for future persistence. This version stores no API evaluation state. Redis stores only rate-limit counters.
