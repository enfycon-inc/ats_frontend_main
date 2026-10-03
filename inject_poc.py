with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

POC_FIELD = '''
                    {/* Point of Contact (POC) */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Point of Contact</Label>
                      <Popover open={pocOpen} onOpenChange={setPocOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!selectedClientId}
                            className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700"
                          >
                            <span className="truncate">
                              {selectedPocId
                                ? pocList.myContacts.concat(pocList.otherContacts).find(p => p.id === selectedPocId)?.name || "Unknown POC"
                                : "Select POC..."}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search POC..."
                              className="text-xs h-8"
                              value={pocSearch}
                              onValueChange={setPocSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No POC found.</CommandEmpty>

                              {pocList.myContacts.length > 0 && (
                                <CommandGroup heading="? My Contacts">
                                  {pocList.myContacts
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          setSelectedPocId(p.id);
                                          setPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{p.name}</span>
                                          {p.designation && <span className="text-[10px] text-neutral-500">{p.designation}</span>}
                                        </div>
                                        <Check
                                          className={ml-auto h-3 w-3 }
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}

                              {pocList.otherContacts.length > 0 && (
                                <CommandGroup heading="?? Other Contacts">
                                  {pocList.otherContacts
                                    .filter(p => p.name.toLowerCase().includes(pocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          setSelectedPocId(p.id);
                                          setPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">{p.name}</span>
                                          <span className="text-[10px] text-neutral-500">Added by {p.addedBy?.name || 'Unknown'}</span>
                                        </div>
                                        <Check
                                          className={ml-auto h-3 w-3 }
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                            <div className="p-2 border-t">
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full text-xs font-semibold text-blue-600 justify-start h-8"
                                onClick={() => {
                                  setPocOpen(false);
                                  setAddPocOpen(true);
                                }}
                              >
                                + Add New Contact
                              </Button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
'''

code = code.replace('{/* Row 4, Col 3: Client Job ID */}', POC_FIELD + '\\n                    {/* Row 4, Col 3: Client Job ID */}')

# Add payload insertion for pocId on submit
code = code.replace(
    'const jobData = {',
    'const jobData = {\\n      pocId: selectedPocId,'
)

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('POC injected')
