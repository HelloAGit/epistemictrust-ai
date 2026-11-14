import { generateText, Output } from 'ai';
import { createLanguageModel, providerOptions } from './model-provider.js';
import { maxOutputTokens, predictionSchema, protocol, type ArenaModel } from './arena.js';

export async function predictArena(model: ArenaModel, claim: string, signal: AbortSignal) {
  const start = performance.now();
  const result = await generateText({
    model: createLanguageModel(model.provider, model.key!, model.model),
    providerOptions: providerOptions(model.provider),
    system: protocol, prompt: claim, output: Output.object({ schema: predictionSchema }),
    maxOutputTokens, maxRetries: 0, abortSignal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
  });
  return {
    ...predictionSchema.parse(result.output),
    responseId: result.response.id, modelVersion: result.response.modelId,
    inputTokens: result.totalUsage.inputTokens ?? null, outputTokens: result.totalUsage.outputTokens ?? null,
    latencyMs: Math.round(performance.now() - start),
  };
}
