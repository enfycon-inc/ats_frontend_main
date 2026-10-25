import toast from 'react-hot-toast';
import type { EmailNotification } from './system-email.types';

export function warnIfEmailFailed(result: { emailNotification?: EmailNotification }) {
  if (result.emailNotification?.status === 'failed') {
    toast.error(result.emailNotification.message || 'The account was saved, but its email was not accepted. Check email settings.', { duration: 8000 });
  }
}

// The saved action and any delivery warning share a single result notification.
export function notifyAccountSaved(result: { emailNotification?: EmailNotification }, successMessage: string) {
  if (result.emailNotification?.status === 'failed') {
    toast.error(`${successMessage} ${result.emailNotification.message || 'Notification email could not be sent. Check email settings.'}`, { duration: 8000 });
  } else {
    toast.success(successMessage);
  }
}
