const fs = require('fs');
let c = fs.readFileSync('lib/ats-api.ts', 'utf8');

const search =     // Attempt automatic token refresh / session recovery if token expired and retry once
    if (isExpired && !isRetry && !isPublicAuthPolicy) {
      if (getRefreshToken()) {
        if (!isRefreshing) {
          isRefreshing = true;
          const newToken = await tryAutoRefresh();
          isRefreshing = false;
          if (newToken) {
            onRefreshed(newToken);
            return apiFetch<T>(path, options, true);
          }
        } else {
          // Wait for active refresh to finish
          const retryObj = new Promise<T>((resolve, reject) => {
            refreshSubscribers.push((newToken: string) => {
              apiFetch<T>(path, options, true).then(resolve).catch(reject);
            });
          });
          return retryObj;
        }
      };

const replace =     // Attempt automatic token refresh / session recovery if token expired and retry once
    if (isExpired && !isRetry && !isPublicAuthPolicy) {
      if (getRefreshToken()) {
        const executeRefresh = async () => {
          if (!isRefreshing) {
            isRefreshing = true;
            const newToken = await tryAutoRefresh();
            isRefreshing = false;
            if (newToken) {
              onRefreshed(newToken);
              return apiFetch<T>(path, options, true);
            }
          } else {
            return new Promise<T>((resolve, reject) => {
              refreshSubscribers.push((newToken: string) => {
                apiFetch<T>(path, options, true).then(resolve).catch(reject);
              });
            });
          }
          return null;
        };

        let retryResult;
        if (typeof navigator !== 'undefined' && navigator.locks) {
          retryResult = await navigator.locks.request('ats_token_refresh', async () => {
             const currentToken = getToken();
             if (currentToken && currentToken !== token) {
                return apiFetch<T>(path, options, true);
             }
             return await executeRefresh();
          });
        } else {
          retryResult = await executeRefresh();
        }
        if (retryResult) return retryResult;
      };

if (c.includes(search)) {
  c = c.replace(search, replace);
  fs.writeFileSync('lib/ats-api.ts', c);
  console.log('Patched ats-api.ts (LF)');
} else if (c.includes(search.replace(/\n/g, '\r\n'))) {
  c = c.replace(search.replace(/\n/g, '\r\n'), replace);
  fs.writeFileSync('lib/ats-api.ts', c);
  console.log('Patched ats-api.ts (CRLF)');
} else {
  console.log('Target string not found!');
}
