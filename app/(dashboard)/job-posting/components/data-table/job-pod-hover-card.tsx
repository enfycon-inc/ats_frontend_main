import React, { useState, useEffect } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Crown, Mail, ChevronDown, ChevronUp, User } from 'lucide-react';
import { atsApi } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

// Global cache to prevent redundant API calls across multiple hover cards
let globalPodsCache: any[] | null = null;
let globalUsersCache: any[] | null = null;
let isFetchingPods = false;
let isFetchingUsers = false;
let podsPromise: Promise<any[]> | null = null;
let usersPromise: Promise<any[]> | null = null;

const fetchPodsCached = async () => {
  if (globalPodsCache) return globalPodsCache;
  if (podsPromise) return podsPromise;
  podsPromise = atsApi.pods.list().then(res => {
    globalPodsCache = res;
    return res;
  }).catch(() => {
    podsPromise = null;
    return [];
  });
  return podsPromise;
};

const fetchUsersCached = async () => {
  if (globalUsersCache) return globalUsersCache;
  if (usersPromise) return usersPromise;
  usersPromise = atsApi.auth.listUsers().then(res => {
    globalUsersCache = res;
    return res;
  }).catch(() => {
    usersPromise = null;
    return [];
  });
  return usersPromise;
};

export function JobPodHoverCard({
  podIds,
  recruiterNames = [],
  recruiterIds = [],
  children
}: {
  podIds: string[];
  recruiterNames?: string[];
  recruiterIds?: string[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pods, setPods] = useState<any[]>([]);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPodId, setExpandedPodId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const needsPods = pods.length === 0 && podIds.length > 0;
      const needsRecruiters = recruiters.length === 0 && (recruiterNames.length > 0 || recruiterIds.length > 0);

      if (needsPods || needsRecruiters) {
        setIsLoading(true);
        Promise.all([
          needsPods ? fetchPodsCached() : Promise.resolve([]),
          needsRecruiters ? fetchUsersCached() : Promise.resolve([])
        ])
          .then(([allPods, allUsers]) => {
            if (needsPods) {
              const matchedPods = allPods.filter((p: any) => podIds.includes(p.id));
              setPods(matchedPods);
              if (matchedPods.length === 1) {
                setExpandedPodId(matchedPods[0].id);
              }
            }
            if (needsRecruiters) {
              const matchedRecruiters = allUsers.filter((u: any) => 
                recruiterIds.includes(u.id) || recruiterNames.some(n => n.toLowerCase() === (u.fullName || u.name || '').toLowerCase())
              );
              // if not found in db, just use the names
              // if not found in db, just use the names, or if we have ids use matched
              let mappedRecruiters = [];
              if (recruiterIds.length > 0) {
                mappedRecruiters = recruiterIds.map(id => matchedRecruiters.find(u => u.id === id) || { fullName: 'Unknown User' });
              } else {
                mappedRecruiters = recruiterNames.map(name => {
                const found = matchedRecruiters.find((u: any) => (u.fullName || u.name || '').toLowerCase() === name.toLowerCase());
                return found || { fullName: name };
                });
              }
              setRecruiters(mappedRecruiters);
            }
          })
          .catch(console.error)
          .finally(() => setIsLoading(false));
      }
    }
  }, [isOpen, podIds, pods.length, recruiters.length, recruiterNames]);

  const totalAssigned = podIds.length + Math.max(recruiterNames.length, recruiterIds.length);

  return (
    <HoverCard openDelay={200} closeDelay={300} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <div className="cursor-pointer">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent 
        className="w-80 p-0 overflow-hidden border-slate-200/80 dark:border-slate-800 shadow-xl rounded-xl bg-white dark:bg-slate-900"
        align="start"
        sideOffset={8}
        asChild
      >
        <article>
          <header className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1">
                  Assigned Team
                </h4>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
                  {totalAssigned} Entity{totalAssigned > 1 ? 's' : ''} Assigned
                </p>
              </div>
            </div>
          </header>

          <main className="p-2 max-h-96 overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-slate-400">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {pods.length > 0 && pods.map((pod) => {
                  const isExpanded = expandedPodId === pod.id;
                  const members = Array.isArray(pod.users) ? pod.users : Array.isArray(pod.members) ? pod.members : [];
                  return (
                    <section key={pod.id} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50"
                        onClick={() => setExpandedPodId(isExpanded ? null : pod.id)}
                      >
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{pod.name}</span>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Crown className="h-3 w-3 text-amber-500" />
                            <span className="truncate max-w-[10rem]">{pod.podHeadName || 'Unknown Lead'}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                            {members.length} members
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                      
                      {isExpanded && members.length > 0 && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                          <div className="flex flex-col gap-2 mt-2">
                            {members.map((m: any, idx: number) => {
                              const mName = m.name || m.fullName || m.user?.fullName || m.user?.name || m.email || 'Member';
                              const mEmail = m.email || m.user?.email;
                              const mAvatar = m.avatar || m.user?.avatar;
                              return (
                                <div key={idx} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors">
                                  <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-700">
                                    <AvatarImage src={mAvatar} />
                                    <AvatarFallback className="bg-purple-50 text-purple-600 text-xs font-bold dark:bg-purple-900/40 dark:text-purple-300">
                                      {mName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                      {mName}
                                    </span>
                                    {mEmail && (
                                      <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                        <Mail className="h-2.5 w-2.5" />
                                        {mEmail}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </section>
                  );
                })}

                {recruiters.length > 0 && (
                  <section className="rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden mt-1">
                    <header className="flex items-center gap-1.5 p-2 bg-blue-50 dark:bg-blue-950/20 border-b border-slate-100 dark:border-slate-800">
                      <User className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Independent Recruiters</span>
                    </header>
                    <div className="p-2 flex flex-col gap-1.5">
                      {recruiters.map((u: any, idx: number) => {
                        const mName = u.fullName || u.name || 'Member';
                        const mEmail = u.email;
                        const mAvatar = u.avatar;
                        return (
                          <div key={idx} className="flex items-center gap-2.5 p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <Avatar className="h-7 w-7 border border-slate-200 dark:border-slate-700">
                              <AvatarImage src={mAvatar} />
                              <AvatarFallback className="bg-blue-50 text-blue-600 text-xs font-bold dark:bg-blue-900/40 dark:text-blue-300">
                                {mName.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                                {mName}
                              </span>
                              {mEmail && (
                                <span className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                  <Mail className="h-2.5 w-2.5" />
                                  {mEmail}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </main>
        </article>
      </HoverCardContent>
    </HoverCard>
  );
}
