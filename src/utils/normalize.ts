// apps/backend/src/utils/normalize.ts

/**
 * Convert value to undefined if null, otherwise return as-is
 */
export function toU<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert date to undefined if null, otherwise return as-is
 */
export function toDateU(value: Date | null): Date | undefined {
  return value === null ? undefined : value;
}

/**
 * Convert number to undefined if null, otherwise return as-is
 */
export function toNumberOr(value: number |null|undefined): number | undefined {
  return value === null ? undefined : value;
}

