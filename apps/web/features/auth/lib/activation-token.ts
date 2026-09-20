/** Normalises the untrusted `token` query value; blank or missing becomes undefined. */
export function resolveActivationToken(
  candidate: string | string[] | undefined,
): string | undefined {
  const value = Array.isArray(candidate) ? candidate[0] : candidate;
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}
