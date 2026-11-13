# Deployment

Use the GitHub repository as the Vercel project source. Select Other as the framework preset, use the repository root, and set Node.js 24. The checked-in configuration serves the `public` directory and deploys the two TypeScript handlers. Set the production branch to `main`. Check the project's Git settings to confirm the repository is connected and verify a preview from a pull request.

| Variable | Use |
| --- | --- |
| `EVALUATION_API_TOKEN` | Required for the evaluation endpoint on every Vercel deployment. Use a high-entropy bearer token and keep it on trusted servers. The health endpoint is public. |
| `AGENT_ENABLED` | Set to `true` to enable evidence and consistency evaluations once the remaining credentials are configured. Defaults to disabled. |
| `EVALUATION_PROVIDER` | Use `anthropic` for Claude. The default is `openai`. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Set the key for the selected provider as a server-side secret. |
| `EVALUATION_MODEL` | Provider model ID with native structured outputs, for example `claude-sonnet-4-6` with Anthropic. |
| `RATE_LIMIT_SECRET` | High-entropy production secret used to derive the shared firewall bucket key. Enable Vercel system environment variables so the SDK can use the production domain. |
| `DATABASE_URL` | Reserved for later Supabase PostgreSQL integration. Leave empty for this release. |

Set variables in the correct Preview and Production environments and redeploy after changes. Requests have a 64 KiB JSON limit. Provider orchestration has a 20-second deadline, no retries, one generation step, and a 2,500-token output limit. The service returns generic operational errors without logging credentials or evaluation content.

Paid model calls run only in Vercel Production, after bearer authentication and an SDK check against the published Vercel Firewall rate-limit rule `epistemictrust-model-calls`. Configure the rule with the `@vercel/firewall` condition, a fixed 60-second window, and five requests. All paid calls share a bucket within each Vercel region. A missing rule or failed firewall check blocks the provider call.

Run `vercel deploy` for a preview and `vercel inspect <deployment-url> --logs` to inspect the build. Verify the health route, run the README calibration request with `Authorization: Bearer <token>`, and compare the dashboard at desktop and mobile sizes. Run `vercel deploy --prod` after preview verification. Recheck the production URL and record its deployment ID from `vercel inspect <production-url>`. Verify the Git integration separately in project settings.

Sources for the hosting and agent APIs are the [Vercel Node.js runtime documentation](https://vercel.com/docs/functions/runtimes/node-js) and the [ToolLoopAgent reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent).
