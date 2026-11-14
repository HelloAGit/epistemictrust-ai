# V2 baseline audit

Production `dpl_AsD93kv7dxdmX6fRGhp5MdQH3kGP` serves the static dashboard and two Node.js 24 Web Handlers. The repository baseline was `39b8cab473d3e3a0ef948a99d2256bbdd7b26d88`. Production health returned 200 and an unauthenticated evaluation POST returned 401. The repository baseline passed nine tests and type checking.

The six prototype modules plus Analytics use browser-local case data. Existing reusable code includes schemas, deterministic Brier and ECE, expected-value decisions, and provider adapters for Claude and OpenAI. Production has an Anthropic secret configured. Live invocation remains unverified. The Vercel rate limit rule is staged for human approval.

No configured database, durable evaluation worker, tenant identity, or provider registry was found. The current API uses one bearer token and does not persist history. Model Arena, independently acquired evidence, and persistent benchmark runs depend on tenant authorization and storage. Vercel previously rejected the GitHub link for the private repository.
