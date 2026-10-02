import React, { useState, useEffect } from 'react';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Crown, Mail, ChevronDown, ChevronUp } from 'lucide-react';
import { atsApi } from '@/lib/ats-api';
import { cn } from '@/lib/utils';

export function JobPodHoverCard({
  podIds,
  children
}: {
  podIds: string[];
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pods, setPods] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedPodId, setExpandedPodId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && pods.length === 0 && podIds.length > 0) {
      setIsLoading(true);
      // Fetch all pods since there is no endpoint to fetch specific pods by IDs yet, 
      // but in a real app you'd fetch only what you need.
      atsApi.pods.list()
        .then((allPods) => {
          const matched = allPods.filter((p: any) => podIds.includes(p.id));
          setPods(matched);
          if (matched.length === 1) {
            setExpandedPodId(matched[0].id);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, podIds, pods.length]);

  return (
    <HoverCard openDelay={200} closeDelay={300} onOpenChange={setIsOpen}>
      <HoverCardTrigger asChild>
        <div className=\"cursor-pointer\">{children}</div>
      </HoverCardTrigger>
      <HoverCardContent 
        className=\"w-[320px] p-0 overflow-hidden border-slate-200/80 dark:border-slate-800 shadow-xl rounded-xl bg-white dark:bg-slate-900\"
        align=\"start\"
        sideOffset={8}
      >
        <div className=\"bg-slate-50 dark:bg-slate-850 px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between\">
          <div className=\"flex items-center gap-2\">
            <div className=\"h-7 w-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400\">
              <Users className=\"h-4 w-4\" />
            </div>
            <div>
              <h4 className=\"text-sm font-semibold text-slate-900 dark:text-white leading-none mb-1\">
                Assigned Pods
              </h4>
              <p className=\"text-[10px] text-slate-500 font-medium uppercase tracking-wider\">
                {podIds.length} Pod{podIds.length > 1 ? 's' : ''} Selected
              </p>
            </div>
          </div>
        </div>

        <div className=\"p-2 max-h-[360px] overflow-y-auto custom-scrollbar\">
          {isLoading ? (
            <div className=\"flex items-center justify-center py-6 text-slate-400\">
              <Loader2 className=\"h-5 w-5 animate-spin\" />
            </div>
          ) : pods.length === 0 ? (
            <div className=\"py-6 text-center text-xs text-slate-500\">No pod details found.</div>
          ) : (
            <div className=\"flex flex-col gap-2\">
              {pods.map((pod) => {
                const isExpanded = expandedPodId === pod.id;
                const members = Array.isArray(pod.users) ? pod.users : Array.isArray(pod.members) ? pod.members : [];
                return (
                  <div key={pod.id} className=\"rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-200\">
                    <div 
                      className=\"flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50\"
                      onClick={() => setExpandedPodId(isExpanded ? null : pod.id)}
                    >
                      <div className=\"flex flex-col gap-0.5\">
                        <span className=\"text-[13px] font-bold text-slate-800 dark:text-slate-100\">{pod.name}</span>
                        <div className=\"flex items-center gap-1.5 text-[11px] text-slate-500\">
                          <Crown className=\"h-3 w-3 text-amber-500\" />
                          <span className=\"truncate max-w-[150px]\">{pod.podHeadName || 'Unknown Lead'}</span>
                        </div>
                      </div>
                      <div className=\"flex items-center gap-2\">
                        <span className=\"text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded\">
                          {members.length} members
                        </span>
                        {isExpanded ? (
                          <ChevronUp className=\"h-4 w-4 text-slate-400\" />
                        ) : (
                          <ChevronDown className=\"h-4 w-4 text-slate-400\" />
                        )}
                      </div>
                    </div>
                    
                    {isExpanded && members.length > 0 && (
                      <div className=\"px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20\">
                        <div className=\"flex flex-col gap-2 mt-2\">
                          {members.map((m: any, idx: number) => {
                            const mName = m.name || m.fullName || m.user?.fullName || m.user?.name || m.email || 'Member';
                            const mEmail = m.email || m.user?.email;
                            const mAvatar = m.avatar || m.user?.avatar;
                            return (
                              <div key={idx} className=\"flex items-center gap-2.5 p-1.5 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors\">
                                <Avatar className=\"h-7 w-7 border border-slate-200 dark:border-slate-700\">
                                  <AvatarImage src={mAvatar} />
                                  <AvatarFallback className=\"bg-blue-50 text-blue-600 text-[10px] font-bold dark:bg-blue-900/40 dark:text-blue-300\">
                                    {mName.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className=\"flex flex-col min-w-0\">
                                  <span className=\"text-[11.5px] font-medium text-slate-700 dark:text-slate-200 truncate\">
                                    {mName}
                                  </span>
                                  {mEmail && (
                                    <span className=\"text-[9px] text-slate-500 flex items-center gap-1 truncate\">
                                      <Mail className=\"h-2.5 w-2.5\" />
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
