/** Preserve formatting while limiting the India national number to ten digits. */
export function limitIndiaPhoneInput(value: string): string {
  if (!value.startsWith('+91')) return value;
  let digits = 0;
  for (let index = 0; index < value.length; index++) {
    if (/\d/.test(value[index]) && ++digits > 12) return value.slice(0, index).trimEnd();
  }
  return value;
}
