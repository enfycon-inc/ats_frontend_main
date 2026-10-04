with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

start = -1
for i, line in enumerate(lines):
    if '{/* End Client POC */}' in line:
        start = i
        break

if start != -1:
    end = -1
    for i in range(start, start + 100):
        if '</Popover>' in lines[i]:
            end = i + 1
            break
    
    if end != -1:
        chunk = '\n'.join(lines[start:end])
        chunk = chunk.replace('pocList', 'endPocList')
        
        # Add the + Add POC button at the end of the CommandList
        chunk = chunk.replace(
            '                            </CommandList>',
            '''                              <div className="p-1 mt-1 border-t border-neutral-200 dark:border-slate-800">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  className="w-full text-xs font-semibold text-blue-600 justify-start h-8"
                                  onClick={() => {
                                    setEndPocOpen(false);
                                    setAddEndPocOpen(true);
                                  }}
                                >
                                  + Add New Contact
                                </Button>
                              </div>
                            </CommandList>'''
        )
        lines[start:end] = chunk.split('\n')

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("Fixed End POC UI")
