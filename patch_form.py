import re
import os

location_jsx = """
                    {/* Location Block */}
                    <div className="space-y-1 col-span-1 md:col-span-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Country */}
                      <div className="space-y-1">
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">Country</Label>
                        <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={countryOpen} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                              {watch("country") ? (
                                <div className="flex items-center gap-2">
                                  <ReactCountryFlag countryCode={countries.find(c => c.name === watch("country"))?.isoCode || ""} svg style={{ width: '1.2em', height: '1.2em' }} />
                                  <span className="truncate">{watch("country")}</span>
                                </div>
                              ) : "Select Country..."}
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." className="text-xs h-8" value={countrySearchText} onValueChange={setCountrySearchText} />
                              <CommandList className="max-h-[200px]">
                                <CommandEmpty>No country found.</CommandEmpty>
                                <CommandGroup>
                                  {countries.filter(c => c.name.toLowerCase().includes(countrySearchText.toLowerCase())).map((c) => (
                                    <CommandItem
                                      key={c.isoCode}
                                      value={c.name}
                                      onSelect={() => {
                                        setValue("country", c.name, { shouldValidate: true, shouldDirty: true });
                                        setValue("states", "");
                                        setValue("city", "");
                                        setCountryOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
                                      <ReactCountryFlag countryCode={c.isoCode} svg className="mr-2 h-4 w-4" />
                                      {c.name}
                                      <Check className={cn("ml-auto h-3 w-3", watch("country") === c.name ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* State */}
                      <div className="space-y-1">
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">State</Label>
                        <Popover open={stateOpen} onOpenChange={setStateOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={stateOpen} disabled={!watch("country")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                              <span className="truncate">{watch("states") || "Select State..."}</span>
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search state..." className="text-xs h-8" value={stateSearchText} onValueChange={setStateSearchText} />
                              <CommandList className="max-h-[200px]">
                                <CommandEmpty>No state found.</CommandEmpty>
                                <CommandGroup>
                                  {State.getStatesOfCountry(countries.find(c => c.name === watch("country"))?.isoCode || "").filter(s => s.name.toLowerCase().includes(stateSearchText.toLowerCase())).map((s) => (
                                    <CommandItem
                                      key={s.isoCode}
                                      value={s.name}
                                      onSelect={() => {
                                        setValue("states", s.name, { shouldValidate: true, shouldDirty: true });
                                        setValue("city", "");
                                        setStateOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
                                      {s.name}
                                      <Check className={cn("ml-auto h-3 w-3", watch("states") === s.name ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      {/* City */}
                      <div className="space-y-1">
                        <Label className="font-bold text-neutral-700 dark:text-neutral-300">City</Label>
                        <Popover open={cityOpen} onOpenChange={setCityOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={cityOpen} disabled={!watch("states")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                              <span className="truncate">{watch("city") || "Select City..."}</span>
                              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search city..." className="text-xs h-8" value={citySearchText} onValueChange={setCitySearchText} />
                              <CommandList className="max-h-[200px]">
                                <CommandEmpty>No city found.</CommandEmpty>
                                <CommandGroup>
                                  {City.getCitiesOfState(
                                    countries.find(c => c.name === watch("country"))?.isoCode || "",
                                    State.getStatesOfCountry(countries.find(c => c.name === watch("country"))?.isoCode || "").find(s => s.name === watch("states"))?.isoCode || ""
                                  ).filter(c => c.name.toLowerCase().includes(citySearchText.toLowerCase())).map((c) => (
                                    <CommandItem
                                      key={c.name}
                                      value={c.name}
                                      onSelect={() => {
                                        setValue("city", c.name, { shouldValidate: true, shouldDirty: true });
                                        setCityOpen(false);
                                      }}
                                      className="text-xs font-medium cursor-pointer"
                                    >
                                      {c.name}
                                      <Check className={cn("ml-auto h-3 w-3", watch("city") === c.name ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
"""

for form in ['IndiaStaffingForm.tsx', 'UsStaffingForm.tsx', 'GlobalStandardForm.tsx']:
    path = f'app/(dashboard)/job-posting/new/{form}'
    if not os.path.exists(path):
        continue
    with open(path, 'r', encoding='utf-8') as f:
        code = f.read()
    
    if '{/* Client Commission (%)' in code:
        code = code.replace('{/* Client Commission (%)', location_jsx + '\n                    {/* Client Commission (%)')
    elif '{/* Client' in code:
        code = code.replace('{/* Client', location_jsx + '\n                    {/* Client')
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(code)

