# Deployment

Use the GitHub repository as the Vercel project source. Select Other as the framework preset, use the repository root, and set Node.js 24. The checked-in configuration serves the `public` directory and deploys the two TypeScript handlers. Set the production branch to `main`. Check the project's Git settings to confirm the repository is connected and verify a preview from a pull request.

| Variable | Use |
| --- | --- |
| `EVALUATION_API_TOKEN` | Required for the evaluation endpoint on every Vercel deployment. Use a high-entropy bearer token and keep it on trusted servers. The health endpoint is public. |
| `AGENT_ENABLED` | Set to `true` to enable evidence and consistency evaluations once the remaining credentials are configured. Defaults to disabled. |
| `EVALUATION_PROVIDER` | Use `anthropic` for Claude. The default is `openai`. |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY` | Set the key for the selected provider as a server-side secret. |
| `EVALUATION_MODEL` | Provider model ID with native structured outputs, for example `claude-sonnet-4-6` with Anthropic. |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Required for model-dependent requests. Use an HTTPS Upstash Redis REST endpoint. An atomic fixed-window counter allows five model calls per minute across instances sharing that Redis database. A failed limiter blocks model calls. |
| `DATABASE_URL` | Reserved for later Supabase PostgreSQL integration. Leave empty for this release. |

Set variables in the correct Preview and Production environments and redeploy after changes. Use separate Preview credentials if enabling its paid evaluations. Requests have a 64 KiB JSON limit. Provider orchestration has a 20-second deadline, no retries, one generation step, and a 2,500-token output limit. The service returns generic operational errors without logging credentials or evaluation content.

Run `vercel deploy` for a preview and `vercel inspect <deployment-url> --logs` to inspect the build. Verify the health route, run the README calibration request with `Authorization: Bearer <token>`, and compare the dashboard at desktop and mobile sizes. Run `vercel deploy --prod` after preview verification. Recheck the production URL and record its deployment ID from `vercel inspect <production-url>`. Verify the Git integration separately in project settings.

Sources for the hosting and agent APIs are the [Vercel Node.js runtime documentation](https://vercel.com/docs/functions/runtimes/node-js) and the [ToolLoopAgent reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/tool-loop-agent).
