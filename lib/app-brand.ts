// Public build-time branding. Set these variables before building the frontend.
const website = process.env.NEXT_PUBLIC_COMPANY_WEBSITE?.trim() || 'https://enfycon.com';
const companyWebsite = new URL(website);
if (!['https:', 'http:'].includes(companyWebsite.protocol)) throw new Error('Company website must use HTTP or HTTPS.');

export const APP_BRAND = Object.freeze({
  name: process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'EnfySync ATS',
  companyName: process.env.NEXT_PUBLIC_COMPANY_NAME?.trim() || 'Enfycon India Pvt Ltd',
  website: companyWebsite.href,
  websiteLabel: companyWebsite.hostname,
});
