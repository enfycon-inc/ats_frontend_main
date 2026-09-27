"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, Filter, MapPin, Briefcase, FileText, Download, UserPlus, 
  X, Sparkles, GraduationCap, Mail, Phone, Calendar, ChevronRight, IndianRupee
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { mockApplicants } from "../../data/mock-applicants";
import Link from "next/link";

import { atsApi } from "@/lib/ats-api";

export default function DomesticSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [candidatesList, setCandidatesList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [canSearchAllMarkets, setCanSearchAllMarkets] = useState(false);
  const [searchAllMarkets, setSearchAllMarkets] = useState(false);
  
  // Boolean Builder Inputs
  const [mustHave, setMustHave] = useState("");
  const [anyOf, setAnyOf] = useState("");
  const [exactPhrase, setExactPhrase] = useState("");
  const [exclude, setExclude] = useState("");

  // Filters
  const [selectedNoticePeriods, setSelectedNoticePeriods] = useState<string[]>([]);
  const [experienceRange, setExperienceRange] = useState([0]);
  const [maxCtcRange, setMaxCtcRange] = useState([40]); // default max 40 LPA
  const [preferredMetro, setPreferredMetro] = useState("");
  const [selectedSource, setSelectedSource] = useState<string[]>([]);

  // Selection state
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  useEffect(() => {
    const currentUser = atsApi.auth.getCurrentUser();
    if (currentUser) {
      const isAuth = currentUser.roles?.includes("TENANT_ADMIN") || currentUser.roles?.includes("SUPER_ADMIN") || currentUser.permissions?.includes("candidate:search_all_markets");
      setCanSearchAllMarkets(!!isAuth);
    }
  }, []);

  useEffect(() => {
    fetchCandidates();
  }, [searchAllMarkets, searchQuery]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        market: searchAllMarkets ? undefined : "INDIA",
        allMarkets: searchAllMarkets,
      };
      if (searchQuery.trim()) {
        params.q = searchQuery.trim();
      }
      const data = await atsApi.candidates.list(params);
      setCandidatesList(data || []);
    } catch (err) {
      console.error("Failed to load candidates:", err);
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Boolean query compiler
  useEffect(() => {
    let queryParts: string[] = [];
    if (mustHave.trim()) {
      const words = mustHave.trim().split(/\s+/);
      queryParts.push(words.join(" AND "));
    }
    if (exactPhrase.trim()) {
      queryParts.push(`"${exactPhrase.trim()}"`);
    }
    if (anyOf.trim()) {
      const words = anyOf.trim().split(/\s+/);
      queryParts.push(`(${words.join(" OR ")})`);
    }
    if (exclude.trim()) {
      const words = exclude.trim().split(/\s+/);
      queryParts.push(`NOT (${words.join(" OR ")})`);
    }

    if (queryParts.length > 0) {
      setSearchQuery(queryParts.join(" AND "));
    }
  }, [mustHave, anyOf, exactPhrase, exclude]);

  // Handle Search Filtering
  const displayList = candidatesList.length > 0 
    ? candidatesList.map(c => ({
        applicantId: String(c.id),
        candidateCode: c.candidateCode || `CAN-${String(c.dbId || c.id).padStart(6, '0')}`,
        uploadedByName: c.uploadedByName || "System",
        applicantName: c.fullName,
        jobTitle: c.jobTitle,
        skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || ''),
        workAuthorization: c.workAuthorization,
        experience: `${c.experienceYears || 0} Yrs`,
        city: c.city || 'Unknown',
        state: c.state || '',
        expectedSalary: c.expectedCTC ? String(c.expectedCTC) : '18',
        source: c.source || 'Database',
      }))
    : mockApplicants;

  const filteredCandidates = displayList.filter(candidate => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = candidate.applicantName.toLowerCase().includes(q);
      const titleMatch = (candidate.jobTitle || "").toLowerCase().includes(q);
      const skillsMatch = (candidate.skills || "").toLowerCase().includes(q);
      if (!nameMatch && !titleMatch && !skillsMatch) return false;
    }

    if (experienceRange[0] > 0) {
      const expStr = candidate.experience || "0";
      const expNum = parseInt(expStr.replace(/\D/g, '')) || 0;
      if (expNum < experienceRange[0]) return false;
    }

    if (preferredMetro.trim()) {
      const qLoc = preferredMetro.toLowerCase().trim();
      const cityMatch = (candidate.city || "").toLowerCase().includes(qLoc);
      const stateMatch = (candidate.state || "").toLowerCase().includes(qLoc);
      if (!cityMatch && !stateMatch) return false;
    }

    if (selectedSource.length > 0) {
      if (!selectedSource.includes(candidate.source)) return false;
    }

    return true;
  });

  const clearAllFilters = () => {
    setSelectedNoticePeriods([]);
    setExperienceRange([0]);
    setMaxCtcRange([40]);
    setPreferredMetro("");
    setSelectedSource([]);
    setSearchQuery("");
    setMustHave("");
    setAnyOf("");
    setExactPhrase("");
    setExclude("");
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(filteredCandidates.map(c => c.applicantId));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedRowIds(prev => [...prev, id]);
    } else {
      setSelectedRowIds(prev => prev.filter(item => item !== id));
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-white dark:bg-slate-900 font-sans border border-neutral-200 dark:border-slate-800 rounded-sm">
      
      {/* TOP HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-4 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-850 shrink-0">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-450 dark:text-slate-400">
            <span>Database Sourcing</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-primary">Domestic India Segment</span>
          </div>
          <h1 className="text-base font-bold text-neutral-800 dark:text-neutral-100 flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Internal Resume Database Search
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {canSearchAllMarkets && (
            <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 px-3 py-1.5 rounded border border-indigo-200 dark:border-indigo-800 text-xs">
              <input
                type="checkbox"
                id="all-markets-toggle-dom"
                checked={searchAllMarkets}
                onChange={(e) => setSearchAllMarkets(e.target.checked)}
                className="h-3.5 w-3.5 accent-indigo-600 cursor-pointer"
              />
              <label htmlFor="all-markets-toggle-dom" className="font-bold text-indigo-900 dark:text-indigo-200 cursor-pointer select-none">
                Search All Markets (US + India)
              </label>
            </div>
          )}

          {/* Toggle Switch between US IT and Domestic */}
          <div className="flex bg-neutral-200/60 dark:bg-slate-800 p-0.5 rounded-sm text-xs font-bold shrink-0 border border-neutral-300 dark:border-slate-700">
            <Link href="/applicants/resume-search/usit">
              <span className="px-3 py-1 rounded-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-250 cursor-pointer block">US IT Segment</span>
            </Link>
            <Link href="/applicants/resume-search/domestic">
              <span className="px-3 py-1 rounded-sm bg-white dark:bg-slate-700 text-neutral-800 dark:text-neutral-100 shadow-sm cursor-pointer block">Domestic India</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex min-h-0 divide-x divide-neutral-200 dark:divide-slate-800">
        
        {/* LEFT FILTERS SIDEBAR */}
        <div className="w-64 shrink-0 flex flex-col h-full bg-neutral-50 dark:bg-slate-900">
          <div className="p-3 border-b border-neutral-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Filter Criteria</span>
            <button 
              onClick={clearAllFilters}
              className="text-[10px] font-bold text-primary hover:underline bg-transparent border-0 cursor-pointer"
            >
              Reset
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            
            {/* NOTICE PERIOD */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-450 block">Notice Period</span>
              <div className="space-y-1.5">
                {[
                  { label: "Immediate (Serving)", value: "Immediate" },
                  { label: "15 Days or Less", value: "15 Days" },
                  { label: "30 Days (1 Month)", value: "30 Days" },
                  { label: "60 Days (2 Months)", value: "60 Days" },
                  { label: "90 Days (3 Months)", value: "90 Days" }
                ].map((item) => (
                  <div key={item.value} className="flex items-center gap-2">
                    <input 
                      type="checkbox"
                      id={`notice-${item.value}`}
                      checked={selectedNoticePeriods.includes(item.value)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedNoticePeriods(prev => [...prev, item.value]);
                        else setSelectedNoticePeriods(prev => prev.filter(v => v !== item.value));
                      }}
                      className="h-3.5 w-3.5 accent-primary cursor-pointer"
                    />
                    <label htmlFor={`notice-${item.value}`} className="text-xs font-medium text-neutral-600 dark:text-slate-300 cursor-pointer select-none">
                      {item.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-neutral-200 dark:bg-slate-800" />

            {/* EXPECTED CTC */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-450">
                <span>Max Expected CTC</span>
                <span className="text-primary font-bold">{maxCtcRange[0]} LPA</span>
              </div>
              <Slider
                value={maxCtcRange}
                onValueChange={setMaxCtcRange}
                max={100}
                step={1}
                className="py-1"
              />
            </div>

            <div className="h-px bg-neutral-200 dark:bg-slate-800" />

            {/* EXPERIENCE RANGE */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-neutral-450">
                <span>Min Experience</span>
                <span className="text-primary font-bold">{experienceRange[0]}+ Yrs</span>
              </div>
              <Slider
                value={experienceRange}
                onValueChange={setExperienceRange}
                max={20}
                step={1}
                className="py-1"
              />
            </div>

            <div className="h-px bg-neutral-200 dark:bg-slate-800" />

            {/* PREFERRED LOCATION */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-450 block">Preferred Location</span>
              <Input
                type="text"
                placeholder="e.g. Bengaluru, Pune"
                value={preferredMetro}
                onChange={(e) => setPreferredMetro(e.target.value)}
                className="h-8 text-xs rounded border-neutral-350 bg-white"
              />
            </div>

          </div>
        </div>

        {/* RIGHT WORKSPACE: BOOLEAN SEARCH & CARD LIST */}
        <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          
          {/* BOOLEAN SEARCH INPUT & BUILDER */}
          <div className="p-4 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50/50 space-y-3 shrink-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                <Input 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='e.g. (Java OR Python) AND "Spring Boot"'
                  className="pl-9 pr-24 h-9 text-xs rounded border-neutral-350 dark:border-slate-700 bg-white font-mono"
                />
              </div>
              <Button 
                onClick={() => setIsBuilderOpen(!isBuilderOpen)}
                variant="outline"
                className="h-9 text-xs font-semibold border-neutral-350 rounded flex items-center gap-1.5 bg-white shrink-0"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" /> {isBuilderOpen ? "Close Builder" : "Boolean Builder"}
              </Button>
            </div>

            {/* CLASSIC INTERACTIVE BOOLEAN BUILDER */}
            {isBuilderOpen && (
              <div className="p-3 bg-white dark:bg-slate-855 rounded border border-neutral-200 dark:border-slate-750 space-y-3">
                <div className="flex justify-between items-center pb-1.5 border-b border-neutral-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">Boolean Search Builder (Naukri Style)</span>
                  <button 
                    onClick={() => {
                      setMustHave("");
                      setAnyOf("");
                      setExactPhrase("");
                      setExclude("");
                    }}
                    className="text-[10px] text-primary hover:underline bg-transparent border-0 cursor-pointer"
                  >
                    Clear Builder
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">All words (AND)</label>
                    <Input 
                      value={mustHave}
                      onChange={(e) => setMustHave(e.target.value)}
                      placeholder="e.g. Java Spring"
                      className="h-8 text-xs rounded border-neutral-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Exact phrase ("")</label>
                    <Input 
                      value={exactPhrase}
                      onChange={(e) => setExactPhrase(e.target.value)}
                      placeholder="e.g. Full Stack Developer"
                      className="h-8 text-xs rounded border-neutral-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Any words (OR)</label>
                    <Input 
                      value={anyOf}
                      onChange={(e) => setAnyOf(e.target.value)}
                      placeholder="e.g. Hibernate Microservices"
                      className="h-8 text-xs rounded border-neutral-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider block">Exclude words (NOT)</label>
                    <Input 
                      value={exclude}
                      onChange={(e) => setExclude(e.target.value)}
                      placeholder="e.g. QA Manager"
                      className="h-8 text-xs rounded border-neutral-300"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BULK ACTIONS / GRID SUMMARY TOOLBAR */}
          <div className="px-4 py-2 border-b border-neutral-200 dark:border-slate-800 bg-neutral-50 dark:bg-slate-855 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={filteredCandidates.length > 0 && selectedRowIds.length === filteredCandidates.length}
                onChange={(e) => handleSelectAll(e.target.checked)}
                className="h-3.5 w-3.5 accent-primary cursor-pointer mr-1"
              />
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Select All ({filteredCandidates.length} records found)
              </span>
            </div>

            {selectedRowIds.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200">
                  {selectedRowIds.length} Selected
                </span>
                <Button size="sm" className="h-7 text-[10px] font-bold bg-primary text-white hover:bg-primary/95 flex items-center gap-1 rounded-sm">
                  <UserPlus className="h-3 w-3" /> Submit to Job Order
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold border-neutral-350 flex items-center gap-1 bg-white rounded-sm">
                  <Download className="h-3 w-3" /> Download Resumes
                </Button>
              </div>
            )}
          </div>

          {/* RESULTS CARD LIST */}
          {(() => {
            const hasActiveSearch = 
              searchQuery.trim() !== "" || 
              selectedNoticePeriods.length > 0 || 
              experienceRange[0] > 0 || 
              maxCtcRange[0] < 40 || 
              preferredMetro.trim() !== "" || 
              selectedSource.length > 0;

            if (!hasActiveSearch) {
              return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-neutral-50/40 dark:bg-slate-900/30">
                  <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-full mb-3 shadow-xs border border-indigo-100 dark:border-indigo-900">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-sm font-bold text-neutral-800 dark:text-neutral-100 uppercase tracking-wider">
                    Domestic Candidate Database Search
                  </h3>
                  <p className="text-xs text-neutral-500 max-w-md mt-1.5 font-medium leading-relaxed">
                    Enter search keywords or a boolean query above (e.g. <span className="font-mono text-primary font-bold">"SAP ABAP"</span>, <span className="font-mono text-primary font-bold">Java AND Spring</span>), or select filter criteria on the left to search candidate resumes.
                  </p>
                </div>
              );
            }

            return (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-12 text-neutral-450 italic">
                    No matching candidate records found for your search criteria.
                  </div>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isSelected = selectedRowIds.includes(candidate.applicantId);
                    return (
                      <Card 
                        key={candidate.applicantId} 
                        className={`border border-neutral-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg shadow-sm hover:shadow transition-all ${
                          isSelected ? "border-indigo-300 bg-indigo-50/10" : ""
                        }`}
                      >
                        <CardContent className="p-4 flex gap-4 items-start">
                          {/* Checkbox */}
                          <input 
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => handleSelectRow(candidate.applicantId, e.target.checked)}
                            className="h-3.5 w-3.5 accent-primary cursor-pointer mt-1.5 shrink-0"
                          />

                          {/* Candidate info */}
                          <div className="flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded border border-blue-200 text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800">
                                {(candidate as any).candidateCode || `CAN-${String(candidate.applicantId).padStart(6, '0')}`}
                              </span>
                              <Link href={`/applicants/${candidate.applicantId}`} className="text-sm font-bold text-primary dark:text-blue-400 hover:underline">
                                {candidate.applicantName}
                              </Link>
                              <span className="px-1.5 py-0.5 rounded-sm border border-rose-200 text-[9px] font-bold bg-rose-50 text-rose-700">
                                Immediate (Serving)
                              </span>
                              <span className="px-1.5 py-0.5 rounded-sm border border-emerald-200 text-[9px] font-bold bg-emerald-50 text-emerald-700">
                                Match: 89%
                              </span>
                            </div>

                            {/* Metadata Row */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-neutral-600 dark:text-slate-400 font-semibold">
                              <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5 text-neutral-400" /> {candidate.jobTitle || "Engineer"}</span>
                              <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5 text-neutral-400" /> {candidate.experience || "5 Yrs"} Exp</span>
                              <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-neutral-400" /> {candidate.city || "Bengaluru"}, India</span>
                              <span className="flex items-center gap-1"><IndianRupee className="h-3.5 w-3.5 text-neutral-400" /> {candidate.expectedSalary || "18"} LPA</span>
                            </div>

                            {/* Skills Chips */}
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {(candidate.skills ? candidate.skills.split(',').map((s: string) => s.trim()).filter(Boolean) : ["General Tech"]).slice(0, 6).map((skill: string) => (
                                <span 
                                  key={skill} 
                                  className="px-1.5 py-0.5 text-[10px] font-bold bg-neutral-100 dark:bg-slate-800 text-neutral-600 dark:text-neutral-300 rounded border border-neutral-200/50"
                                >
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Card Actions */}
                          <div className="flex flex-col gap-1.5 shrink-0 justify-center w-28">
                            <Button size="sm" variant="outline" className="h-7 text-[10px] font-bold border-neutral-300 rounded-sm">
                              <Download className="h-3 w-3 mr-1" /> CV
                            </Button>
                            <Button size="sm" className="h-7 text-[10px] font-bold bg-primary text-white hover:bg-primary/95 rounded-sm">
                              <UserPlus className="h-3 w-3 mr-1" /> Add to Job
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            );
          })()}

        </div>

      </div>

    </div>
  );
}
