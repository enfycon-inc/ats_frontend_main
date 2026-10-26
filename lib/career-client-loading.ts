// Bound the whole read, including any session recovery before the network call.
// Credential mutations deliberately do not use this read-only helper.
export async function loadCareerClientSettings<T>(read: (signal: AbortSignal) => Promise<T>, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve().then(() => read(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error('Loading timed out. Please retry.'));
          controller.abort();
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
