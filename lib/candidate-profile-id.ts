/** Display codes are labels; candidate API identifiers are UUIDs. */
export function candidateProfileId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const id = value.replace(/^(CAN|APP)-/i, '');
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
