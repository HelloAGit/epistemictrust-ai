# EpistemicTrust AI

A standalone synthetic dashboard and an evaluation API for confidence calibration, claim consistency, supplied evidence, decision quality, and benchmark integrity.

## Run locally

Use Node.js 24. Run `npm ci`, then `npm run dev` and open http://127.0.0.1:3000. Use `npm test` and `npm run typecheck` to verify the backend. The dashboard runs without API credentials and keeps edited demo cases in browser storage.

```sh
curl http://127.0.0.1:3000/api/health
curl -X POST http://127.0.0.1:3000/api/agent/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"evaluationType":"calibration","model":"demo-model","cases":[{"id":"case-001","confidence":0.85,"outcome":1},{"id":"case-002","confidence":0.70,"outcome":0}]}'
```

The response includes an evaluation ID, timestamp, case count, evidence status, warnings, and results. The example yields 50% classification accuracy, a Brier score of 0.25625, and ECE of 0.425. See [sample requests](data/sample-evaluations.json) for all five types. Deployment requests require the bearer token documented below.

- [Architecture and dashboard inventory](docs/architecture.md)
- [Deployment and environment configuration](docs/deployment.md)
- [Evaluation methodology](docs/evaluation-methodology.md)
