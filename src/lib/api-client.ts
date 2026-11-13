import { evaluationResponseSchema, type EvaluationRequest } from './schemas.ts';

export async function runEvaluation(origin: string, request: EvaluationRequest, token?: string, signal?: AbortSignal) {
  const response = await fetch(new URL('/api/agent/evaluate', origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error?.message ?? `Evaluation failed (HTTP ${response.status}).`);
  }
  return evaluationResponseSchema.parse(await response.json());
}
