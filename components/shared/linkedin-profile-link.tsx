import {Linkedin, ExternalLink} from 'lucide-react';

export function safeLinkedinProfile(value?:string|null):string|null {
  const text=value?.trim();
  if(!text || text.length>500 || /[\u0000-\u0020\u007f\\]/.test(text)) return null;
  try {
    const url=new URL(text);
    if(url.protocol!=='https:' || !['linkedin.com','www.linkedin.com'].includes(url.hostname) || url.username || url.password || url.port || !/^\/in\/[^/]+\/?$/.test(url.pathname)) return null;
    url.search='';url.hash='';
    return url.toString();
  } catch {return null;}
}
export function LinkedinProfileLink({url}:{url?:string|null}) {
  const href=safeLinkedinProfile(url);
  if(!href) return null;
  return <a href={href} target="_blank" rel="noopener noreferrer" title={href} aria-label="LinkedIn profile (opens in a new tab)" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#1a4fa0] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"><Linkedin className="size-3.5 shrink-0" aria-hidden="true"/>LinkedIn profile<ExternalLink className="size-3 shrink-0" aria-hidden="true"/></a>;
}
