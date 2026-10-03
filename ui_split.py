with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

def ext(s_mark, e_mark):
    s = code.find(s_mark)
    if s == -1: return ""
    e = code.find(e_mark, s)
    if e == -1: return ""
    return code[s:e]

cli_html = ext('{/* Client */}', '{/* End Client */}')
end_html = ext('{/* End Client */}', '{/* Point of Contact (POC) */}')
poc_html = ext('{/* Point of Contact (POC) */}', '{/* Row 4, Col 3: Client Job ID */}')
job_html = ext('{/* Row 4, Col 3: Client Job ID */}', '{/* Row 4, Col 4: Priority */}')

# Clean up job_html closing tags
job_html = job_html.replace('\\n', '')

s_pri = code.find('{/* Row 4, Col 4: Priority */}')
e_pri = code.find('</div>', code.find('errors.priority', s_pri)) + 6
priority_html = code[s_pri:e_pri]

s_true = code.find('{true ? (')
e_true = code.find(')}', code.find('{/* For US Market', s_true)) + 2
true_block = code[s_true:e_true]

import re
wa_match = re.search(r'\{\/\* Row 3, Col 2: Work Authorization.*?\/\>', true_block, flags=re.DOTALL)
wa_html = wa_match.group(0) if wa_match else ''
if wa_html: true_block = true_block.replace(wa_html, '')
us_wa_match = re.search(r'\{renderWorkAuthBlock\("md:col-span-3"\)\}', true_block)
if us_wa_match: true_block = true_block.replace(us_wa_match.group(0), '')

pay_rate = ext('{/* Pay Rate', '{/* Job Status')

business_end = (
    priority_html + '\n                    ' +
    wa_html + '\n                    ' +
    pay_rate + 
    '                  </div>\n' +
    '                )}\n' +
    '              </div>\n\n' +
    '              {/* -------------------- CLIENT INFORMATION SECTION -------------------- */}\n' +
    '              <div className="bg-white dark:bg-slate-900 border border-neutral-200 dark:border-slate-800 rounded-lg shadow-xs overflow-visible">\n' +
    '                <SectionHeader title="CLIENT INFORMATION" sectionKey="clientInfo" />\n' +
    '                {!collapsedSections.clientInfo && (\n' +
    '                  <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">\n                    ' +
    cli_html + true_block + '\n' + poc_html + end_html + job_html
)

chunk_start = s_true
chunk_end = code.find('{/* Job Status', chunk_start)

code = code[:chunk_start] + business_end + code[chunk_end:]

with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('UI Split complete')
