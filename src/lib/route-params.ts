/** Normalize expo-router search params that may arrive as string[]. */
export function paramString(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
