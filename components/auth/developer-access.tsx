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
  return <details className="group/developer text-left">
    <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 rounded-sm text-xs font-normal text-slate-500 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 [&::-webkit-details-marker]:hidden">
      Developer access<span aria-hidden="true" className="text-[10px] transition-transform group-open/developer:rotate-180">⌄</span>
    </summary>
    <p className="mb-3 text-xs leading-relaxed text-slate-500">For accounts authorized by your workspace administrator.</p>
    <form className="space-y-3" aria-busy={pending} onSubmit={event=>{event.preventDefault();if(!preview&&!pending) onSignIn?.({email,password});}}>
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
