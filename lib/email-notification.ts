import toast from 'react-hot-toast';
import type { EmailNotification } from './system-email.types';

export function warnIfEmailFailed(result: { emailNotification?: EmailNotification }) {
  if (result.emailNotification?.status === 'failed') {
    toast.error(result.emailNotification.message || 'The account was saved, but its email was not accepted. Check email settings.', { duration: 8000 });
  }
}
