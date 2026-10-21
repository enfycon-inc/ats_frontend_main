"use client";
import { useEffect, useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export function DeveloperAccess({enabled,preview=false,pending=false,error,onSignIn}: {
  enabled:boolean; preview?:boolean; pending?:boolean; error?:string;
  onSignIn?:(data:{email:string;password:string})=>void;
}) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const errorId=useId();
  useEffect(()=>{if(error) setPassword('');},[error]);
  if(!enabled) return null;
  return <details className="text-left">
    <summary className="flex min-h-11 w-full cursor-pointer list-none items-center justify-center gap-4 rounded-sm text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden [&::marker]:content-none">
      <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
      <span>Developer access</span>
      <span aria-hidden="true" className="h-px flex-1 bg-slate-200" />
    </summary>
    <p className="mt-2 px-4 text-center text-xs leading-relaxed text-slate-500 sm:px-5">For accounts authorized by your workspace administrator.</p>
    <form className="space-y-3 rounded-2xl border border-transparent p-4 sm:p-5" aria-busy={pending} onSubmit={event=>{event.preventDefault();if(!preview&&!pending) onSignIn?.({email,password});}}>
      <label className="block text-xs font-medium">Developer email
        <Input className="mt-1" type="email" autoComplete="username" placeholder="name@company.com" required value={email} onChange={event=>setEmail(event.target.value)} disabled={preview||pending} aria-describedby={error?errorId:undefined} />
      </label>
      <label className="block text-xs font-medium">Password
        <Input className="mt-1" type="password" autoComplete="current-password" required value={password} onChange={event=>setPassword(event.target.value)} disabled={preview||pending} aria-describedby={error?errorId:undefined} />
      </label>
      {error && <p id={errorId} role="alert" className="rounded-md bg-red-50 p-3 text-xs leading-relaxed text-red-700">{error}</p>}
      <Button type="submit" className="h-11 w-full bg-blue-700 hover:bg-blue-800" disabled={preview||pending}>{pending?'Signing in…':'Sign in as developer'}</Button>
    </form>
  </details>;
}
