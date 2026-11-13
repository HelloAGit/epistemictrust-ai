import { checkRateLimit } from '@vercel/firewall';

export async function allowModelCall() {
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (process.env.NODE_ENV !== 'production' || !host || !process.env.RATE_LIMIT_SECRET) {
    throw new Error('Firewall rate limiter unavailable');
  }
  const { error, rateLimited } = await checkRateLimit('epistemictrust-model-calls', {
    headers: new Headers({ host }),
    rateLimitKey: 'epistemictrust-production',
    timeout: 3000,
  });
  if (error || typeof rateLimited !== 'boolean') throw new Error('Firewall rate limiter unavailable');
  return !rateLimited;
}
