/** Only return to a relative page on the current workspace. */
export function safeLoginCallback(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/dashboard";
  try {
    const url = new URL(value, "https://callback.invalid");
    if (
      url.origin !== "https://callback.invalid" ||
      url.pathname.startsWith("/auth/login")
    )
      return "/dashboard";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/dashboard";
  }
}
