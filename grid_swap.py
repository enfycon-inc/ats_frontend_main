with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Extraction Helpers
def ext(start, end):
    s = code.find(start)
    if s == -1: return ""
    e = code.find(end, s)
    if e == -1: return ""
    return code[s:e]

# Blocks
pri_block = ext('{/* Row 4, Col 4: Priority */}', '{/* Row 5: Tax Terms (1 Col) & Work Authorization (3 Cols) for US Market */}')
cli_block = ext('{/* Client */}', '{/* End Client */}')
end_block = ext('{/* End Client */}', '{/* Point of Contact (POC) */}')
poc_block = ext('{/* Point of Contact (POC) */}', '{/* Row 4, Col 3: Client Job ID */}')
job_block = ext('{/* Row 4, Col 3: Client Job ID */}', '{/* Row 4, Col 4: Priority */}')

# Bill Rate block from IN Market (We extract the inner logic, not the ternary)
# The IN market bill rate starts at {/* Row 3, Col 1: Client Commission
s_bill = code.find('{/* Row 3, Col 1: Client Commission')
e_bill = code.find('{/* Row 3, Col 2: Work Authorization', s_bill)
bill_block = code[s_bill:e_bill]

# Now, we need to assemble the new layout.
# We will do this by replacing the entire grid contents of Business Information from Row 3 Col 1 onwards!
s_grid = code.find('{/* Row 3, Col 1: Client Commission')
e_grid = code.find('</div>\n                  </CardContent>\n                </Card>\n\n                {/* Job Status')

if s_grid != -1 and e_grid != -1:
    # We need everything between Work Auth and Client
    # Wait, Work Auth in IN market is just {renderWorkAuthBlock()}
    # Let's extract the Work Auth block and the US Market logic from the original code
    s_wa_us = code.find('{/* Row 3, Col 2: Work Authorization')
    e_wa_us = code.find('{/* Client */}', s_wa_us)
    wa_us_budget_block = code[s_wa_us:e_wa_us]

    # The new Business Info should have:
    # Priority
    # (Then the rest of the old logic: Work Auth, Budget)
    # So we replace {true ? ( <> {Bill Rate} {Work Auth} ... with {Priority} {true ? ( <> {Work Auth} ...
    # Actually, we can just replace the entire content between s_grid and e_grid!

    # Wait, the {true ? ( is right before s_grid (Client Commission).
    s_true = code.rfind('{true ? (', 0, s_grid)
    
    # We will build:
    # [Priority Block]
    # {true ? ( <>
    # [Work Auth + Budget Block] (which is wa_us_budget_block)
    
    business_end = pri_block + code[s_true:s_grid] + wa_us_budget_block
    
    # Now build Client Info Card
    client_card = '''                    </div>
                  </CardContent>
                </Card>

                {/* -------------------- CLIENT INFORMATION SECTION -------------------- */}
                <Card className="rounded-md border-neutral-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                  <SectionHeader title="CLIENT INFORMATION" sectionKey="clientInfo" />
                  <CardContent className={code_cn("p-4 md:p-6 space-y-4 md:space-y-6 transition-all duration-300", collapsedSections["clientInfo"] ? "hidden" : "block")}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-x-6 md:gap-y-6">
'''
    client_card = client_card.replace('code_cn', 'cn')
    
    client_content = cli_block + bill_block + poc_block + end_block + job_block
    # Clean up job_block
    client_content = client_content.replace('</div>\n                    </div>\n                  </CardContent>\n', '</div>\n')
    
    new_chunk = business_end + client_card + client_content
    
    code = code[:s_true] + new_chunk + code[e_grid:]
    
    with open('app/(dashboard)/job-posting/new/IndiaStaffingForm.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print('Grid swap done!')
else:
    print('Could not find boundaries')
