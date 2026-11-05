import {ExternalLink} from 'lucide-react';

function LinkedinMark() {
  return <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true" focusable="false">
    <rect width="24" height="24" rx="2" fill="#0A66C2"/>
    <path fill="#fff" d="M5.3 9h3v10h-3V9Zm1.5-5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5ZM10.3 9h2.9v1.4h.04c.4-.76 1.4-1.56 2.88-1.56 3.08 0 3.65 2.03 3.65 4.67V19h-3v-4.87c0-1.16-.02-2.66-1.62-2.66-1.63 0-1.88 1.27-1.88 2.58V19h-2.97V9Z"/>
  </svg>;
}

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
  return <a href={href} target="_blank" rel="noopener noreferrer" title={href} aria-label="LinkedIn profile (opens in a new tab)" className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#1a4fa0] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300"><LinkedinMark/>LinkedIn profile<ExternalLink className="size-3 shrink-0" aria-hidden="true"/></a>;
}
