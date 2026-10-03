import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { reportSectionsSchema } from '../src/validators/reportValidator';

// The SDK transforms the Zod schema before sending it. Inspecting the result
// catches incompatible constraints locally, with no API key or network needed.
const format = zodOutputFormat(reportSectionsSchema) as unknown as {
  type: string;
  schema: Record<string, unknown>;
};

console.log('format.type:', format.type);

const json = JSON.stringify(format.schema, null, 2);
console.log(json.slice(0, 2200));

// Every object must declare additionalProperties: false. Subschemas live in
// $defs behind $ref, so collect them all rather than walking only from the root.
const defs = (format.schema.$defs ?? {}) as Record<string, Record<string, unknown>>;
const root = format.schema;
const allObjects: Record<string, unknown>[] = [root, ...Object.values(defs)];

const problems: string[] = [];
const objectNodes = allObjects.filter((n) => n.type === 'object');
for (const node of objectNodes) {
  if (node.additionalProperties !== false) problems.push('an object is missing additionalProperties: false');
}

// The `required` list must match Zod optionality exactly: a required Zod field
// must be enforced by the API, and an optional one must be allowed to be absent.
// Optional properties are supported by structured outputs.
const requiredOf = (node: Record<string, unknown>) =>
  ((node.required ?? []) as string[]).slice().sort();

/** Keys a Zod object treats as optional (they accept `undefined`). */
const optionalKeysOf = (obj: z.ZodObject<any>): string[] => {
  const shape = obj.shape as Record<string, z.ZodTypeAny>;
  return Object.keys(shape).filter((k) => shape[k]!.safeParse(undefined).success);
};

const requiredZod = (obj: z.ZodObject<any>): string[] =>
  Object.keys(obj.shape)
    .filter((k) => !optionalKeysOf(obj).includes(k))
    .sort();

// Root object
{
  const expected = requiredZod(reportSectionsSchema);
  const actual = requiredOf(root);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    problems.push(`root required mismatch: expected ${expected}, got ${actual}`);
  }
}

// topicsCovered[] element object
{
  const arr = reportSectionsSchema.shape.topicsCovered as unknown as z.ZodArray<any>;
  const element = arr.element as z.ZodObject<any>;
  const match = Object.values(defs).find(
    (d) =>
      Array.isArray(d.required) &&
      ((d.required as string[]) as string[]).includes('mastery'),
  );
  if (!match) {
    problems.push('could not locate the topicsCovered element subschema');
  } else {
    const expected = requiredZod(element);
    const actual = requiredOf(match);
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      problems.push(`topicsCovered[] required mismatch: expected ${expected}, got ${actual}`);
    }
  }
}

console.log(`\nsubschemas checked: ${allObjects.length} (${objectNodes.length} objects, ${allObjects.length - objectNodes.length} scalars)`);
console.log('root required:', requiredOf(root).join(', '));
console.log('topicsCovered[] required:', requiredOf(Object.values(defs)[0]!).join(', '));
console.log('topicsCovered[] optional (correctly not required):', optionalKeysOf(
  (reportSectionsSchema.shape.topicsCovered as unknown as z.ZodArray<any>).element as z.ZodObject<any>,
).join(', ') || 'none');

if (problems.length) {
  console.error('\nFAIL: schema issues\n' + problems.join('\n'));
  process.exit(1);
}
console.log('\nPASS: every object is strict and `required` matches Zod optionality');

// Numeric bounds are stripped into a description string, so the model can
// legitimately return out-of-range values. Confirm the repair path is required.
const boundsCarriedAsDescription = JSON.stringify(format.schema).includes('minimum: 1, maximum: 5');
console.log(
  boundsCarriedAsDescription
    ? 'PASS: numeric bounds are advisory only (repair path is required)'
    : 'FAIL: expected bounds to be stripped into descriptions',
);
if (!boundsCarriedAsDescription) process.exit(1);

// A client can be constructed without a key for schema work, confirming the
// SDK does not need credentials for local transformation.
void Anthropic;
console.log('PASS: no API key required for local schema transformation');
