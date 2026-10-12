type EntrySession = { user?: unknown; error?: unknown } | null;
export type LoginEntryParams = Record<string, string | string[] | undefined>;

export function hasUsableEntrySession(session: EntrySession): boolean {
  return !!session?.user && !session.error;
}

/** These flows must reach the login client even when an older cookie exists. */
export function requiresLoginFlow(params: LoginEntryParams): boolean {
  const first = (key: string) => Array.isArray(params[key]) ? params[key][0] : params[key];
  return first('expired') === 'true' || !!first('error') || first('handoff') === 'true' || !!first('token');
}
