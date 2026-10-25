const fs = require('node:fs');
const path = require('node:path');
const { Country, State, City } = require('country-state-city');
const root = path.resolve(__dirname, '../public/locations');
function write(name, value) { const target = path.join(root, name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, JSON.stringify(value)); }
const countries = Country.getAllCountries().map(({ name, isoCode, phonecode, flag }) => ({ name, isoCode, phonecode, flag }));
write('countries.json', countries);
for (const country of countries) {
  const states = State.getStatesOfCountry(country.isoCode).map(({ name, isoCode, countryCode }) => ({ name, isoCode, countryCode }));
  write(`states/${country.isoCode}.json`, states);
  const cities = City.getCitiesOfCountry(country.isoCode) || [];
  write(`search/${country.isoCode}.json`, cities.map(({ name, stateCode, countryCode }) => ({ name, stateCode, countryCode })));
  for (const state of states) write(`cities/${country.isoCode}-${state.isoCode}.json`, cities.filter(city => city.stateCode === state.isoCode).map(({ name, stateCode, countryCode }) => ({ name, stateCode, countryCode })));
}
console.log('Prepared location data from country-state-city for scoped browser requests.');
