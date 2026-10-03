/**
 * Anthropic Claude client.
 *
 * The model is a config value (ANTHROPIC_MODEL) so it can be changed without a
 * code change. When no API key is present every helper degrades to null so the
 * calling flow (e.g. report generation) can fall back to a deterministic
 * template instead of failing.
 */

import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { config } from '@/config/unifiedConfig';

let client: Anthropic | null = null;

export function isAnthropicEnabled(): boolean {
  return config.anthropic.enabled;
}

export function getAnthropicClient(): Anthropic | null {
  if (!config.anthropic.enabled || !config.anthropic.apiKey) return null;
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropic.apiKey, maxRetries: 2, timeout: 120_000 });
  }
  return client;
}

export type GenerateOptions<TSchema extends z.ZodType> = {
  /** System prompt — house style, constraints, safety rails. */
  system: string;
  /** User prompt containing the data to synthesise. */
  prompt: string;
  /** Zod schema the response must conform to. */
  schema: TSchema;
  maxTokens?: number;
  /** 'low' | 'medium' | 'high' — reasoning effort. */
  effort?: 'low' | 'medium' | 'high';
};

export type GenerateResult<T> =
  | { ok: true; data: T; usage: { inputTokens: number; outputTokens: number } }
  | {
      ok: false;
      reason: 'not_configured' | 'refused' | 'error';
      message: string;
      /**
       * The unparsed model output, present when validation failed. Lets a
       * caller repair borderline values instead of discarding the response.
       */
      raw?: unknown;
    };

/**
 * Calls Claude with a schema-constrained output and returns parsed, typed data.
 * The API guarantees the response matches the schema, so downstream code never
 * has to defend against malformed model output.
 */
export async function generateStructured<TSchema extends z.ZodType>(
  opts: GenerateOptions<TSchema>,
): Promise<GenerateResult<z.infer<TSchema>>> {
  const anthropic = getAnthropicClient();
  if (!anthropic) {
    return {
      ok: false,
      reason: 'not_configured',
      message: 'ANTHROPIC_API_KEY is not configured',
    };
  }

  try {
    // messages.create() rather than messages.parse(): structured outputs
    // guarantee schema-shaped JSON, but the API cannot enforce numeric bounds,
    // so a single out-of-range value would otherwise fail the whole call with no
    // way to inspect or repair the response. Validating here exposes the raw
    // text so callers can repair instead of losing the result.
    const message = await anthropic.messages.create({
      model: config.anthropic.model,
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      output_config: {
        format: zodOutputFormat(opts.schema),
        ...(opts.effort ? { effort: opts.effort } : {}),
      },
      messages: [{ role: 'user', content: opts.prompt }],
    });

    // A model with adaptive thinking spends part of max_tokens on reasoning,
    // so a truncated response arrives without a complete text block.
    if (message.stop_reason === 'refusal') {
      return {
        ok: false,
        reason: 'refused',
        message: 'The model declined to produce a response for this input.',
      };
    }
    if (message.stop_reason === 'max_tokens') {
      return {
        ok: false,
        reason: 'error',
        message:
          'Response hit the max_tokens limit before completion. Raise maxTokens or lower the reasoning effort.',
      };
    }

    const text = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return {
        ok: false,
        reason: 'error',
        message: 'Model response was not valid JSON',
        raw: text,
      };
    }

    const result = opts.schema.safeParse(parsed);
    if (!result.success) {
      return {
        ok: false,
        reason: 'error',
        message: result.error.issues
          .map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`)
          .join('; '),
        raw: parsed,
      };
    }

    return {
      ok: true,
      data: result.data as z.infer<TSchema>,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[anthropic] generation failed:', message);
    return { ok: false, reason: 'error', message };
  }
}
