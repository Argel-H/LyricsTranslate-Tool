export function trimToUndefined(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  if (text.length === 0) return undefined;
  return text;
}
