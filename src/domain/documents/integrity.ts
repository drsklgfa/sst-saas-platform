import { createHash } from 'node:crypto';

function jsonSafe(value: unknown): unknown {
  const serialized = JSON.stringify(value, (_, item) => typeof item === 'bigint' ? item.toString() : item);
  return serialized === undefined ? {} : JSON.parse(serialized);
}

function sortJson(value: unknown): unknown {
  const normalized = jsonSafe(value);
  if (Array.isArray(normalized)) return normalized.map(sortJson);
  if (normalized && typeof normalized === 'object') {
    return Object.fromEntries(
      Object.entries(normalized)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sortJson(child)]),
    );
  }
  return normalized;
}

export function canonicalJsonStringify(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

export function hashSnapshot(value: unknown): string {
  return createHash('sha256').update(canonicalJsonStringify(value)).digest('hex');
}

export function verifySnapshotHash(value: unknown, expectedHash: string): boolean {
  return hashSnapshot(value) === expectedHash;
}
