export function classifySsoError(status?: number, message = ''): string {
  if (!status || status >= 500) return 'SSOServiceUnavailable';
  if (/No account found.*invited/i.test(message)) return 'WorkspaceAccountMissing';
  if (/different workspace|does not belong|workspace not found/i.test(message)) return 'WorkspaceMismatch';
  if (/directory configuration|organization directory|Sign-In is disabled/i.test(message)) return 'SSOConfiguration';
  if (/deactivated|inactive/i.test(message)) return 'AccountInactive';
  return 'AccessDenied';
}

export function ssoErrorMessage(code: string): string | null {
  const messages: Record<string, string> = {
    WorkspaceAccountMissing: 'No account was found for your Microsoft email in this workspace. Contact your administrator to restore or invite your account.',
    WorkspaceMismatch: 'Your Microsoft account could not be matched to this workspace. Contact your administrator to check your workspace membership.',
    SSOConfiguration: 'Microsoft sign-in configuration does not match this workspace. Contact your administrator to check the directory and sign-in settings.',
    AccountInactive: 'Your account or workspace is inactive. Contact your administrator.',
    SSOServiceUnavailable: 'The sign-in service could not complete your request. Please try again or contact your administrator.',
    AccessDenied: 'Sign-in was denied. Contact your administrator to check workspace access and Microsoft sign-in settings.',
    Callback: 'Microsoft sign-in could not complete. Please try again or contact your administrator.',
  };
  return messages[code] || null;
}
