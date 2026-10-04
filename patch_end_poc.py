import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We need to find the end of the End Client div.
# End Client div starts with {/* End Client */}
# We will just inject the End Client POC markup before {/* Client Job ID */} (which actually should be right after End Client).

injection = '''
                    {/* End Client POC */}
                    <div className="space-y-1">
                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">End Client POC</Label>
                      <Popover open={endPocOpen} onOpenChange={setEndPocOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            disabled={!watch("endClientName")}
                            className="w-full h-8 px-2 text-xs font-semibold justify-between border-neutral-300 bg-white dark:bg-slate-800 dark:border-slate-700"
                          >
                            <span className="truncate">
                              {selectedEndPocId
                                ? pocList.myContacts.concat(pocList.otherContacts).find(p => p.id === selectedEndPocId)?.name || "Unknown POC"
                                : "Select End POC..."}
                            </span>
                            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput
                              placeholder="Search POC..."
                              className="text-xs h-8"
                              value={endPocSearch}
                              onValueChange={setEndPocSearch}
                            />
                            <CommandList className="max-h-[200px]">
                              <CommandEmpty>No POC found.</CommandEmpty>

                              {pocList.myContacts.length > 0 && (
                                <CommandGroup heading="?? My Contacts">
                                  {pocList.myContacts
                                    .filter(p => p.name.toLowerCase().includes(endPocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          setSelectedEndPocId(p.id);
                                          setEndPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer py-1.5"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                                          {p.email && <span className="text-[10px] text-neutral-500">{p.email}</span>}
                                        </div>
                                        <Check
                                          className={ml-auto h-3 w-3 }
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}

                              {pocList.otherContacts.length > 0 && (
                                <CommandGroup heading="?? Company Contacts">
                                  {pocList.otherContacts
                                    .filter(p => p.name.toLowerCase().includes(endPocSearch.toLowerCase()))
                                    .map(p => (
                                      <CommandItem
                                        key={p.id}
                                        value={p.name}
                                        onSelect={() => {
                                          setSelectedEndPocId(p.id);
                                          setEndPocOpen(false);
                                        }}
                                        className="text-xs cursor-pointer py-1.5"
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                                          {p.email && <span className="text-[10px] text-neutral-500">{p.email}</span>}
                                        </div>
                                        <Check
                                          className={ml-auto h-3 w-3 }
                                        />
                                      </CommandItem>
                                    ))}
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
'''

code = code.replace('{/* Row 4, Col 3: Client Job ID */}', injection + '\\n                    {/* Row 4, Col 3: Client Job ID */}')

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched End POC')
