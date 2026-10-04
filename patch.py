import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Fix placeholders for Per Month (min/max)
code = code.replace(
    'placeholder="e.g. 10.0"',
    'placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 50000" : "e.g. 10.0"}'
)
code = code.replace(
    'placeholder="e.g. 15.0"',
    'placeholder={["Contract", "C2H", "Freelance"].includes(watch("jobType")) ? "e.g. 80000" : "e.g. 15.0"}'
)

# 2. Add End POC state
s = code.find('const [selectedPocId, setSelectedPocId] = useState<string | null>(null);')
if s != -1:
    e = code.find('\n', s)
    code = code[:e] + '\n  const [endPocOpen, setEndPocOpen] = useState(false);\n  const [endPocSearch, setEndPocSearch] = useState("");\n  const [selectedEndPocId, setSelectedEndPocId] = useState<string | null>(null);' + code[e:]

# 3. Clear clientBillRate on taxTerms change
injection = '''
  // Clear clientBillRate if it switches from Permanent to something else and contains %
  useEffect(() => {
    const currentRate = watch("clientBillRate");
    if (watch("taxTerms") !== "Permanent" && currentRate && currentRate.includes("Placement")) {
      setValue("clientBillRate", "");
    } else if (watch("taxTerms") === "Permanent" && !currentRate) {
      setValue("clientBillRate", "8.33% Placement Commission");
    }
  }, [watch("taxTerms")]);
'''
# Find 'const watchTaxTerms = watch("taxTerms");' specifically as a statement
match = re.search(r'const watchTaxTerms = watch\("taxTerms"\);', code)
if match:
    e = match.end()
    code = code[:e] + '\n' + injection + code[e:]

# 4. Add POC to payload
s = code.find('endClientName: data.endClientName || undefined,')
if s != -1:
    e = code.find('\n', s)
    code = code[:e] + '\n        pocId: selectedPocId || undefined,\n        endClientPocId: selectedEndPocId || undefined,' + code[e:]

# 5. Add End POC UI
injection_ui = '''
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
code = code.replace('{/* Row 4, Col 3: Client Job ID */}', injection_ui + '\\n                    {/* Row 4, Col 3: Client Job ID */}')

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Patched successfully')
