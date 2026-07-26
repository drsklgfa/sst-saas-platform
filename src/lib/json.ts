export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Converts arbitrary values into a JSON-safe structure. BigInt values become
 * strings and values that JSON cannot represent at the root use the fallback.
 */
export function safeJson(value: unknown, fallback: JsonValue = {}): JsonValue {
  const serialized = JSON.stringify(value, (_, item) =>
    typeof item === 'bigint' ? item.toString() : item,
  );

  if (serialized === undefined) return fallback;
  return JSON.parse(serialized) as JsonValue;
}
