// Query string repetida chega como array; única, como string.
export function toArray(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  return Array.isArray(value) ? (value as string[]) : [value as string];
}
