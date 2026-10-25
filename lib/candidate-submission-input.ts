import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { z } from 'zod';

const locationLookups = new Map<string, Promise<{ cities: { name: string; stateCode: string }[]; states: { name: string; isoCode: string }[] }>>();
export async function normalizeCandidateLocation(value: string, country: string) {
  if (!/^[A-Z]{2}$/.test(country)) return value;
  try {
    if (!locationLookups.has(country)) {
      const load = async (path: string) => { const result = await fetch(path); if (!result.ok) throw new Error('Location data unavailable'); return result.json(); };
      locationLookups.set(country, Promise.all([load(`/locations/search/${country}.json`), load(`/locations/states/${country}.json`)]).then(([cities, states]) => ({ cities, states })).catch(error => { locationLookups.delete(country); throw error; }));
    }
    const { cities, states } = await locationLookups.get(country)!;
    const pieces = value.split(',').map(part => part.trim());
    const matches = cities.filter(city => city.name.toLowerCase() === pieces[0]?.toLowerCase() && (!pieces[1] || states.find(state => state.isoCode === city.stateCode)?.name.toLowerCase() === pieces[1].toLowerCase()));
    if (matches.length !== 1) return value;
    return [matches[0].name, states.find(state => state.isoCode === matches[0].stateCode)?.name].filter(Boolean).join(', ');
  } catch { return value; }
}
export function formatCandidateAmount(value: string) {
  const [whole, decimal] = value.replaceAll(',', '').split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (decimal != null ? `.${decimal}` : '');
}
export const candidatePhoneSchema = z.string().refine(value => {
  const phone = parsePhoneNumberFromString(value);
  return !!phone && phone.isValid() && (phone.country !== 'IN' || phone.nationalNumber.length === 10);
}, 'Enter valid mobile number');
export const candidateAmountSchema = z.string().regex(/^\d+(?:\.\d{1,2})?$/, 'Enter a valid nonnegative amount with up to two decimal places.');
