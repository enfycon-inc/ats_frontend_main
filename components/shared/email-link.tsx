'use client';
export function emailHref(value?:string|null):string|null {
  const email=value?.trim();
  if(!email || email.length>254 || /[\s\u0000-\u001f\u007f?&#,;<>]/.test(email) || !/^[^@]+@[^@]+\.[^@]+$/.test(email))return null;
  return `mailto:${encodeURIComponent(email).replace(/%40/g,'@')}`;
}
export function EmailLink({email,className}:{email?:string|null;className?:string}) {
  const href=emailHref(email);
  if(!href)return <span className={className}>{email || 'Not provided'}</span>;
  return <a href={href} title={`Email ${email?.trim()}`} className={`text-[#1a4fa0] underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-blue-500 dark:text-blue-300 ${className||''}`} onClick={event=>event.stopPropagation()}>{email?.trim()}</a>;
}
