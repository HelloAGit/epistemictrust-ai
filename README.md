# EpistemicTrust AI

[Open the deployed dashboard](https://epistemictrust-ai.vercel.app/).

EpistemicTrust AI is a synthetic evaluation dashboard and API for confidence calibration, claim consistency, supplied evidence, decision quality, and benchmark integrity. The dashboard runs without API credentials; demo cases are stored in browser `localStorage` and are separate from API evaluations.

## Dashboard

The dashboard includes:

- **Overview and Calibration Lab** : synthetic model cases, calibration metrics, reliability diagrams, and editable browser-local evaluations.
- **Consistency Audit** and **Evidence** : scripted dashboard examples, plus API evaluators that use a configured language model.
- **Decision Simulator** and **Benchmark Integrity** : expected-loss comparisons and deterministic benchmark-risk checks.
- **Reports & Exports**:  JSON and CSV downloads, print support, and an integration contract example.
- **Analytics**: browser-local model filters, calibration charts, and Brier-score comparisons. 

## Evaluation API

The API provides `GET /api/health` and `POST /api/agent/evaluate`. The evaluation route accepts one of five types: `calibration`, `decision`, `consistency`, `evidence`, or `benchmark`. Calibration, decision, and benchmark evaluations run deterministically. Consistency and evidence use the Vercel AI SDK with OpenAI or Anthropic when configured. AI-generated assessments are limited to supplied input and are not independently verified.

On Vercel, the evaluation route requires `EVALUATION_API_TOKEN`; keep the bearer token on a trusted server, never in the browser. Paid model calls are restricted to authenticated production requests and require the configured Vercel Firewall rate-limit rule. Health checks are public. The API does not persist evaluation state.

```sh
# Local development; no token is required unless you configure one.
curl http://127.0.0.1:3000/api/health
curl -X POST http://127.0.0.1:3000/api/agent/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"evaluationType":"calibration","model":"demo-model","cases":[{"id":"case-001","confidence":0.85,"outcome":1},{"id":"case-002","confidence":0.70,"outcome":0}]}'
```

In production, add `-H 'Authorization: Bearer <token>'` to the evaluation request. Its response includes an evaluation ID, timestamp, case count, evidence status, warnings, and results. The example yields 50% classification accuracy, a Brier score of 0.25625, and ECE of 0.425. See [sample requests](data/sample-evaluations.json) for all five request types.

## Run locally

Requires Node.js 24.

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:3000. Run `npm test` for the tests and `npm run typecheck` for TypeScript checking. Model-backed evaluations need the environment variables described in the deployment guide.

## Documentation

- [Architecture and dashboard inventory](docs/architecture.md)
- [Deployment and environment configuration](docs/deployment.md)
- [Evaluation methodology](docs/evaluation-methodology.md)
