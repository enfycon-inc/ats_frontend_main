import re

with open('temp.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

def ext(s_mark, e_mark):
    s = code.find(s_mark)
    if s == -1: return ""
    e = code.find(e_mark, s)
    if e == -1: return ""
    return code[s:e]

code = code.replace('\\n                    {/* Row 4, Col 3: Client Job ID */}', '                    {/* Row 4, Col 3: Client Job ID */}')
code = code.replace('\\n\\n      <AddClientModal', '\\n      <AddClientModal')

cli_html = ext('{/* Client */}', '{/* End Client */}')
end_html = ext('{/* End Client */}', '{/* Point of Contact (POC) */}')
poc_html = ext('{/* Point of Contact (POC) */}', '{/* Row 4, Col 3: Client Job ID */}')
job_html = ext('{/* Row 4, Col 3: Client Job ID */}', '{/* Row 4, Col 4: Priority */}')

job_html = job_html.replace('</div>\n                    </div>\n                  </CardContent>\n', '</div>\n')
job_html = job_html.replace('</div>\n                  </CardContent>\n', '</div>\n')

s_pri = code.find('{/* Row 4, Col 4: Priority */}')
e_pri = code.find('</div>', code.find('errors.priority', s_pri)) + 6
priority_html = code[s_pri:e_pri]

s_commission = code.find('{/* Row 3, Col 1: Client Commission')
s_true = code.rfind('{true ? (', 0, s_commission)
# To find the true end of true_block, find {* Pay Rate and go back to the closing div
e_true = code.rfind(')}', 0, code.find('{/* Pay Rate', s_true)) + 2
true_block = code[s_true:e_true]

true_block = true_block.replace('{renderWorkAuthBlock()}', '')
true_block = true_block.replace('{renderWorkAuthBlock("md:col-span-3")}', '')
true_block = re.sub(r'\{\/\* Row 3, Col 2: Work Authorization.*?\*\/\}', '', true_block, flags=re.DOTALL)

pay_rate = ext('{/* Pay Rate', '{/* Job Status')

business_end = (
    priority_html + '\n                    ' +
    '{renderWorkAuthBlock()}\n                    ' +
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
print('UI Split complete successfully!')
