with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'import { Country, State } from "country-state-city";',
    'import { Country, State, City } from "country-state-city";'
)

code = code.replace(
    'const states = countryIso ? State.getStatesOfCountry(countryIso) : [];',
    'const states = countryIso ? State.getStatesOfCountry(countryIso) : [];\n  const watchState = watch("state");\n  const cities = countryIso && watchState ? City.getCitiesOfState(countryIso, watchState) : [];'
)

code = code.replace(
    '''<Input
                className="h-8 text-xs bg-white dark:bg-slate-955 border-neutral-300 dark:border-slate-700"
                placeholder="City"
                {...register("city")}
              />''',
    '''<select
                className="w-full h-8 px-2 bg-white dark:bg-slate-955 border border-neutral-300 dark:border-slate-700 rounded text-xs text-neutral-800 dark:text-neutral-200 focus:border-primary outline-hidden cursor-pointer"
                {...register("city")}
              >
                <option value="">Select City</option>
                {cities.map((c: any) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>'''
)

with open('c:/Users/deb/enfyProjects/ATS_DOCKERREPO/ats_frontend_main/app/(dashboard)/job-posting/components/add-client-modal.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Patched city")
