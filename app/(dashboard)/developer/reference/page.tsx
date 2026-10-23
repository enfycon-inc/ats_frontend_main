"use client";
import { useEffect, useState } from 'react';
import styles from './reference.module.css';
import Link from 'next/link';
import { getApiBase } from '@/lib/ats-api';
import { endpoints, languages, requestExample, type Language } from '@/lib/career-api-reference';

function Code({ title, value, children }: { title: string; value: string; children?: React.ReactNode }) {
 const [message, setMessage] = useState('Copy');
 async function copy() { try { await navigator.clipboard.writeText(value); setMessage('Copied'); } catch { setMessage('Select text to copy'); } }
 useEffect(() => { setMessage('Copy'); }, [value]);
 const lines = value.split('\n');
 return (
  <section className={styles.codePanel}>
   <div className={styles.codeHeader}>
    <span>{title}</span>
    <div className={styles.codeActions}>{children}<button type="button" onClick={() => void copy()} aria-label={'Copy ' + title}>{message}</button></div>
   </div>
   <pre tabIndex={0} className={styles.codeBody} aria-label={title}>
    <code>{lines.map((line, lineIndex) => (
     <span className={styles.codeLine} key={lineIndex}>
      <span className={styles.lineNumber} aria-hidden="true">{lineIndex + 1}</span>
      <span className={styles.lineContent}>{line.split(/("(?:\\.|[^"\\])*"|'[^']*'|\b(?:const|var|return|import|from|if|throw|new|await|using|null|true|false)\b|\b\d+\b)/g).map((token, i) => (
       <span key={i} className={/^["']/.test(token) ? styles.string : /^\d+$/.test(token) ? styles.number : /^(const|var|return|import|from|if|throw|new|await|using|null|true|false)$/.test(token) ? styles.keyword : undefined}>{token}</span>
      ))}</span>
     </span>
    ))}</code>
   </pre>
  </section>
 );
}
export default function ApiReference() {
 const [selected, setSelected] = useState('authentication');
 const [language, setLanguage] = useState<Language>('cURL');
 const [search, setSearch] = useState('');
 const [base, setBase] = useState('');
 const [status, setStatus] = useState('200');
 useEffect(() => { setBase(getApiBase()); }, []);
 const endpoint = endpoints.find(item => item.id === selected)!;
 const filtered = endpoints.filter(item => (item.title + item.path + item.method).toLowerCase().includes(search.toLowerCase()));
 function select(id: string) { setSelected(id); setStatus(Object.keys(endpoints.find(item => item.id === id)!.responses)[0]); }
 const auth = selected === 'authentication';
 const selectClass = 'rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-white';
 return <div className={styles.root}>
 <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-5 dark:border-slate-700"><div><h1 className="text-xl font-bold text-neutral-900 dark:text-white">Careers API Reference</h1><p className="mt-2 text-neutral-500">OAuth authentication, published jobs, and candidate applications.</p></div><Link href="/developer/clients" className="rounded-lg border px-3 py-2 font-semibold text-indigo-700 dark:text-indigo-300">Manage API clients →</Link></header>
 <div className={styles.layout}>
 <aside className={styles.navigation}><input value={search} onChange={e => setSearch(e.target.value)} aria-label="Search endpoints" placeholder="Find endpoint…" className="w-full rounded-lg border bg-transparent px-3 py-2"/><nav aria-label="API endpoints" className={styles.endpointNav}>{filtered.map(item => <button key={item.id} onClick={() => select(item.id)} aria-current={selected === item.id ? 'page' : undefined} className={'flex w-full items-center gap-2 rounded-lg px-2 py-3 text-left ' + (selected === item.id ? 'bg-indigo-50 font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-200' : 'hover:bg-neutral-100 dark:hover:bg-slate-800')}><span className={'rounded px-1 py-0.5 text-[9px] font-bold ' + (item.method === 'GET' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700')}>{item.method}</span>{item.title}</button>)}{!filtered.length && <p>No matching endpoints.</p>}</nav><select className={styles.mobileNav} aria-label="Choose endpoint" value={selected} onChange={e => select(e.target.value)}>{filtered.map(item => <option key={item.id} value={item.id}>{item.method} · {item.title}</option>)}</select><div className="rounded-lg border p-3"><p className="font-bold">API base URL</p><code className="mt-2 block break-all text-[10px]">{base || 'Loading configuration…'}</code><p className="mt-2 text-[10px] leading-5 text-neutral-500">Use HTTPS in production. Keep credentials on your website server.</p></div></aside>
 <div className={styles.content}>
 <article className="min-w-0 space-y-6"><div><h2 className="text-xl font-bold text-neutral-900 dark:text-white">{endpoint.title}</h2><div className="mt-3 flex gap-2 rounded-lg border p-3 font-mono"><span className="font-bold text-emerald-600">{endpoint.method}</span><span className="break-all">{endpoint.path}</span></div><p className="mt-4 leading-6">{endpoint.description}</p></div>
 <section><h3 className="text-sm font-bold">Authentication & headers</h3><table className="mt-3 w-full text-left"><thead className="border-b text-[10px] uppercase text-neutral-500"><tr><th className="py-2">Header</th><th>Value</th></tr></thead><tbody><tr className="border-b"><td className="py-3 font-mono">Authorization</td><td className="break-all pl-3 font-mono">{auth ? 'Basic BASE64(CLIENT_ID:CLIENT_SECRET)' : 'Bearer ACCESS_TOKEN'}</td></tr>{endpoint.method === 'POST' && <tr><td className="py-3 font-mono">Content-Type</td><td className="pl-3">{auth ? 'application/x-www-form-urlencoded' : 'multipart/form-data (library generates boundary)'}</td></tr>}</tbody></table></section>
 <section><h3 className="mb-3 text-sm font-bold">{auth ? 'Form parameters' : selected === 'jobs' ? 'Query parameters' : selected === 'applications' ? 'Path & form parameters' : 'Path parameters'}</h3><div className="divide-y dark:divide-slate-700">{endpoint.parameters.map(parameter => <div key={parameter.name} className="py-3"><div className="flex flex-wrap items-center gap-2"><code className="font-semibold text-neutral-900 dark:text-white">{parameter.name}</code><span className="text-[10px] text-neutral-500">{parameter.type}</span><span className={'text-[9px] font-semibold ' + (parameter.required ? 'text-red-600 dark:text-red-300' : 'text-neutral-400')}>{parameter.required ? 'REQUIRED' : 'OPTIONAL'}</span></div><p className="mt-1.5 leading-5 text-neutral-500 dark:text-neutral-400">{parameter.description}</p></div>)}</div></section>
 <section className={styles.notes}><h3 className="font-bold">Integration notes</h3><p>Access is restricted by the client’s tenant, branch, or unit. Revoking the client blocks subsequent requests using issued tokens. No-expiry clients still receive short-lived tokens. A 429 response means you should back off before retrying.</p><p className="mt-2">Origin * does not override CORS or make it safe to put client secrets in browser code. There are no public job edit or delete endpoints.</p>{selected === 'applications' && <p className="mt-2">Keep the returned reference. Repeated applications for the same email and job may return the existing reference. Concurrent duplicates can return 409; avoid automatic resubmission after an uncertain network result.</p>}</section>
 </article>
 <aside className={styles.examples}><Code title={endpoint.method + ' · Request example'} value={requestExample(endpoint, language, base || 'https://YOUR_API_HOST')}><select aria-label="Programming language" className={selectClass} value={language} onChange={e => setLanguage(e.target.value as Language)}>{languages.map(item => <option key={item}>{item}</option>)}</select></Code><Code title="Example response" value={JSON.stringify(endpoint.responses[status], null, 2)}><select aria-label="Response status" className={selectClass} value={status} onChange={e => setStatus(e.target.value)}>{Object.keys(endpoint.responses).map(item => <option key={item}>{item}</option>)}</select></Code><p className="text-[10px] leading-5 text-neutral-500">Illustrative data and placeholder credentials. Install the dependency noted in each sample. This page does not execute requests.</p></aside>
 </div></div></div>;
}
