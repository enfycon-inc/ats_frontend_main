"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function DeveloperAccess({ enabled, preview = false, onSignIn }: {
  enabled: boolean; preview?: boolean;
  onSignIn?: (data: { email: string; password: string }) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  if (!enabled) return null;
  return <details className="border-t border-slate-200 pt-4 text-left dark:border-slate-700">
    <summary className="cursor-pointer text-xs font-medium text-slate-500 focus-visible:outline-indigo-600">Developer Access</summary>
    <p className="my-3 text-xs text-slate-500">For accounts authorized by your workspace administrator.</p>
    <form className="space-y-3" onSubmit={event => { event.preventDefault(); if (!preview) onSignIn?.({ email, password }); }}>
      <label className="block text-xs font-medium">Developer email
        <Input className="mt-1" type="email" autoComplete="username" required value={email} onChange={event => setEmail(event.target.value)} disabled={preview} />
      </label>
      <label className="block text-xs font-medium">Password
        <Input className="mt-1" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} disabled={preview} />
      </label>
      <Button type="submit" className="w-full" disabled={preview}>Sign in as developer</Button>
    </form>
  </details>;
}
