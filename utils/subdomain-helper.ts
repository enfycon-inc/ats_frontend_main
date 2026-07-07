/**
 * subdomain-helper.ts
 *
 * Helpers to extract subdomains and base domains in Next.js.
 * Safe for both client-side and server-side components.
 */

export function getBaseDomain(host?: string): string {
  const activeHost = host || (typeof window !== 'undefined' ? window.location.host : 'enfycon.com');
  // strip port
  const hostname = activeHost.split(':')[0];
  
  if (hostname.includes('localhost')) {
    // Preserve the actual dev-server port so this works off port 3000 too.
    const port = activeHost.split(':')[1];
    return port ? `localhost:${port}` : 'localhost:3000';
  }

  const parts = hostname.split('.');
  if (parts.length > 2) {
    return parts.slice(1).join('.');
  }
  return hostname;
}

export function getCurrentSubdomain(host?: string): string {
  const activeHost = host || (typeof window !== 'undefined' ? window.location.host : '');
  if (!activeHost) return '';
  const hostname = activeHost.split(':')[0];
  const parts = hostname.split('.');
  
  if (hostname.includes('localhost')) {
    if (parts.length > 1 && parts[0] !== 'localhost') {
      return parts[0];
    }
    return '';
  }
  
  if (parts.length > 2 && parts[0] !== 'www') {
    return parts[0];
  }
  return '';
}

export function getTenantIdentifier(host?: string): string {
  const activeHost = host || (typeof window !== 'undefined' ? window.location.host : '');
  if (!activeHost) return '';
  const hostname = activeHost.split(':')[0];
  
  const baseDomain = getBaseDomain(hostname);
  const subdomain = getCurrentSubdomain(hostname);
  
  if (subdomain) {
    return subdomain;
  }
  
  // If we are on the base domain, return empty (root domain)
  if (hostname === baseDomain || hostname === 'localhost' || hostname === 'www' || hostname === 'www.' + baseDomain) {
    return '';
  }
  
  // Otherwise it's a custom domain (e.g. tenant3domain.com) -> return the whole hostname
  return hostname;
}
