with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

POC_AND_CLIENT_SECTION = '''
              {/* -------------------- GEOGRAPHIC LOCATION SECTION -------------------- */}
              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">
                <SectionHeader title="Geographic Location" sectionKey="location" />
                {!collapsedSections.location && (
                  <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    {/* Country */}
                    <div className="space-y-1">
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">Country</label>
                      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
                            {watch("country") ? (
                              <div className="flex items-center gap-2">
                                <ReactCountryFlag countryCode={Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || ""} svg style={{ width: "1.2em", height: "1.2em" }} />
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
                                {Country.getAllCountries().filter((c: any) => c.name.toLowerCase().includes(countrySearchText.toLowerCase())).map((c: any) => (
                                  <CommandItem key={c.isoCode} value={c.name} onSelect={() => { setValue("country", c.name, { shouldValidate: true, shouldDirty: true }); setValue("states", ""); setValue("city", ""); setCountryOpen(false); }} className="text-xs font-medium cursor-pointer">
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
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">State</label>
                      <Popover open={stateOpen} onOpenChange={setStateOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" disabled={!watch("country")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
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
                                {State.getStatesOfCountry(Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "").filter((s: any) => s.name.toLowerCase().includes(stateSearchText.toLowerCase())).map((s: any) => (
                                  <CommandItem key={s.isoCode} value={s.name} onSelect={() => { setValue("states", s.name, { shouldValidate: true, shouldDirty: true }); setValue("city", ""); setStateOpen(false); }} className="text-xs font-medium cursor-pointer">
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
                      <label className="font-bold text-neutral-700 dark:text-neutral-300">City</label>
                      <Popover open={cityOpen} onOpenChange={setCityOpen}>
                        <PopoverTrigger asChild>
                          <Button variant="outline" role="combobox" disabled={!watch("states")} className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700">
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
                                  Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "",
                                  State.getStatesOfCountry(Country.getAllCountries().find((c: any) => c.name === watch("country"))?.isoCode || "").find((s: any) => s.name === watch("states"))?.isoCode || ""
                                ).filter((c: any) => c.name.toLowerCase().includes(citySearchText.toLowerCase())).map((c: any) => (
                                  <CommandItem key={c.name} value={c.name} onSelect={() => { setValue("city", c.name, { shouldValidate: true, shouldDirty: true }); setCityOpen(false); }} className="text-xs font-medium cursor-pointer">
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
                )}
              </div>

'''

# Insert the Geographic Location section before REQUIRED SKILLS
REQUIRED_SKILLS_ANCHOR = '{/* -------------------- REQUIRED SKILLS SECTION'
code = code.replace(REQUIRED_SKILLS_ANCHOR, POC_AND_CLIENT_SECTION + REQUIRED_SKILLS_ANCHOR)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Geographic Location section injected.')
