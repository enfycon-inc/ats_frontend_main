import re

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. State changes
code = code.replace('businessInfo: false, location: false', 'businessInfo: false, clientInfo: false, location: false')
code = code.replace('title="GEOGRAPHIC LOCATION"', 'title="JOB LOCATION"')
code = code.replace('GEOGRAPHIC LOCATION SECTION', 'JOB LOCATION SECTION')
code = code.replace('\\n                    {/* Row 4, Col 3: Client Job ID */}', '{/* Row 4, Col 3: Client Job ID */}')
code = code.replace('\\n\\n      <AddClientModal', '\\n      <AddClientModal')

code = re.sub(
    r'(<div className="space-y-1[^>]*>)\s*<Label className="font-bold text-neutral-700 dark:text-neutral-300">\s*Primary Skills',
    r'<div className="space-y-1 md:col-span-full">\n                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">\n                        Primary Skills',
    code
)
code = re.sub(
    r'(<div className="space-y-1[^>]*>)\s*<Label className="font-bold text-neutral-700 dark:text-neutral-300">Secondary Skills',
    r'<div className="space-y-1 md:col-span-full">\n                      <Label className="font-bold text-neutral-700 dark:text-neutral-300">Secondary Skills',
    code
)


# Extract pieces individually
def ext(s_mark, e_mark):
    s = code.find(s_mark)
    e = code.find(e_mark, s)
    return code[s:e]

s_true = code.find('{true ? (')
e_true = code.find(')}', code.find('{/* For US Market', s_true)) + 2
true_block = code[s_true:e_true]

wa_match = re.search(r'\{\/\* Row 3, Col 2: Work Authorization.*?\/\>', true_block, flags=re.DOTALL)
wa_html = wa_match.group(0) if wa_match else ''
if wa_html: true_block = true_block.replace(wa_html, '')
us_wa_match = re.search(r'\{renderWorkAuthBlock\("md:col-span-3"\)\}', true_block)
if us_wa_match: true_block = true_block.replace(us_wa_match.group(0), '')

pay_rate = ext('{/* Pay Rate', '{/* Job Status')
cli_html = ext('{/* Client */}', '{/* End Client */}')
end_html = ext('{/* End Client */}', '{/* Point of Contact (POC) */}')
poc_html = ext('{/* Point of Contact (POC) */}', '{/* Row 4, Col 3: Client Job ID */}')

s_job = code.find('{/* Row 4, Col 3: Client Job ID */}')
e_job = code.find('{/* Row 4, Col 4: Priority */}', s_job)
job_html = code[s_job:e_job]
job_html = job_html.replace('\\n', '')

s_pri = code.find('{/* Row 4, Col 4: Priority */}')
e_pri = code.find('</div>', code.find('errors.priority', s_pri)) + 6
priority_html = code[s_pri:e_pri]

# The block to REPLACE entirely starts at {true ? ( and ends at <div className="bg-white dark:bg-slate-900 (which is JOB LOCATION)
# Let's find exactly the chunk to replace
chunk_start = s_true
chunk_end = code.find('{/* -------------------- JOB LOCATION SECTION -------------------- */}')

new_chunk = f'''{priority_html}
                    {wa_html}
                    {pay_rate}
                    </div>
                  </CardContent>
                </Card>

                {{/* -------------------- CLIENT INFORMATION SECTION -------------------- */}}
                <Card className="rounded-md border-neutral-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                  <SectionHeader title="CLIENT INFORMATION" sectionKey="clientInfo" />
                  <CardContent className={{cn("p-4 md:p-6 space-y-4 md:space-y-6 transition-all duration-300", collapsedSections["clientInfo"] ? "hidden" : "block")}}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-x-6 md:gap-y-6">
                      {cli_html}
                      {true_block}
                      {poc_html}
                      {end_html}
                      {job_html}
                    </div>
                  </CardContent>
                </Card>

                '''

code = code[:chunk_start] + new_chunk + code[chunk_end:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
