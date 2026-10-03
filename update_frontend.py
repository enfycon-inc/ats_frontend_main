import re
file_path = 'app/(dashboard)/job-posting/[id]/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    code = f.read()

new_block = '''              {/* Extended Logistics & Skills Analysis */}
              {selectedSub && (
                <div className="p-3 bg-neutral-50 dark:bg-slate-850 border border-neutral-200 dark:border-slate-800 rounded-lg space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Current CTC</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block">{selectedSub.candidateCurrentCtc ? ?\ : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Expected CTC</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block">{selectedSub.candidateExpectedCtc ? ?\ : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Notice Period</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block">{selectedSub.candidateNoticePeriod ? \ Days : "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Rel. Experience</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block">{selectedSub.candidateRelevantExperience ? \ Yrs : "N/A"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Current Location</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block truncate">{selectedSub.candidateCurrentLocation || "N/A"}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Preferred Locations</span>
                      <span className="font-semibold text-neutral-700 dark:text-neutral-200 block truncate">{(selectedSub.candidatePreferredLocations || []).join(", ") || "N/A"}</span>
                    </div>
                  </div>
                  
                  {/* Skill Matching & Highlighting */}
                  {selectedSub.candidateSkills && selectedSub.jobSkillsRequired && (
                    <div className="pt-2 border-t border-neutral-200 dark:border-slate-700">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 block tracking-wider">Skill Match Analysis</span>
                        {(() => {
                           const cSkills = (selectedSub.candidateSkills || []).map((s: any) => String(s).toLowerCase());
                           const reqSkills = (selectedSub.jobSkillsRequired || []);
                           const matched = reqSkills.filter((rs: any) => cSkills.some((cs: any) => cs.includes(String(rs).toLowerCase()) || String(rs).toLowerCase().includes(cs)));
                           const score = reqSkills.length > 0 ? Math.round((matched.length / reqSkills.length) * 100) : 0;
                           return (
                             <span className={	ext-xs font-bold px-2 py-0.5 rounded \}>
                               Match Score: {score}%
                             </span>
                           );
                        })()}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(selectedSub.jobSkillsRequired || []).map((skill: any, idx: number) => {
                          const isMatched = (selectedSub.candidateSkills || []).some((cs: any) => String(cs).toLowerCase().includes(String(skill).toLowerCase()) || String(skill).toLowerCase().includes(String(cs).toLowerCase()));
                          return (
                            <span key={idx} className={px-2 py-0.5 rounded text-[10px] font-semibold \}>
                              {String(skill)}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* UNIFIED SINGLE-THEME INTERVIEW STAGES (3-Column Grid) */}'''

code = code.replace('{/* UNIFIED SINGLE-THEME INTERVIEW STAGES (3-Column Grid) */}', new_block, 1)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(code)
