import { Prisma } from '@prisma/client';
import { safeJson, type JsonValue } from './json';

/**
 * Normalizes an arbitrary value for non-null Prisma Json columns.
 * Prisma does not accept a top-level JavaScript null as InputJsonValue, so a
 * caller-controlled fallback is used for that case.
 */
export function toPrismaJson(
  value: unknown,
  fallback: Prisma.InputJsonValue = {},
): Prisma.InputJsonValue {
  const normalized = safeJson(value, fallback as JsonValue);
  return normalized === null ? fallback : (normalized as Prisma.InputJsonValue);
}

/**
 * Normalizes an optional value for nullable Prisma Json columns. Undefined
 * means “leave the column unset”; an explicit null is stored as JSON null.
 */
export function toPrismaNullableJson(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === undefined) return undefined;
  const normalized = safeJson(value, null);
  return normalized === null ? Prisma.JsonNull : (normalized as Prisma.InputJsonValue);
}
