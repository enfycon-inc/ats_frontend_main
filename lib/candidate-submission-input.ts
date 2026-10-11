import { City, State } from 'country-state-city';
import { parsePhoneNumberFromString } from 'libphonenumber-js/max';
import { z } from 'zod';

export function normalizeCandidateLocation(value: string, country: string) {
  const pieces = value.split(',').map(part => part.trim());
  const matches = (City.getCitiesOfCountry(country) || []).filter(city => city.name.toLowerCase() === pieces[0]?.toLowerCase() && (!pieces[1] || State.getStateByCodeAndCountry(city.stateCode, country)?.name.toLowerCase() === pieces[1].toLowerCase()));
  if (matches.length !== 1) return value;
  const city = matches[0];
  return [city.name, State.getStateByCodeAndCountry(city.stateCode, country)?.name].filter(Boolean).join(', ');
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
