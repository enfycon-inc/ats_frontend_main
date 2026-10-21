import { APP_BRAND } from '@/lib/app-brand';

export function ProductFooter({ showAttribution = true }: { showAttribution?: boolean }) {
  return <footer className="space-y-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
    {showAttribution && <p>A product of {APP_BRAND.companyName}</p>}
    <p>© {new Date().getFullYear()}{' '}
      <a href={APP_BRAND.website} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700">{APP_BRAND.name}</a>. All rights reserved.
    </p>
  </footer>;
}
