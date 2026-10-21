# Application branding

Global defaults live in `lib/app-brand.ts`. Public configuration:

```dotenv
NEXT_PUBLIC_APP_NAME="EnfySync ATS"
NEXT_PUBLIC_COMPANY_NAME="Enfycon India Pvt Ltd"
NEXT_PUBLIC_COMPANY_WEBSITE="https://enfycon.com"
```

For local development put overrides in `.env.local` and restart Next.js. For production set these names as GitHub Actions repository variables. The release workflow passes them to the frontend Docker build. Empty variables use the central defaults; the company website must be an absolute HTTP(S) URL.

These public values are compiled into the frontend: rebuild and deploy a new frontend image after changing them. Changing runtime container variables alone does not update an existing browser bundle. If the release skips an unchanged frontend source revision, ensure a new frontend build is requested rather than reusing the old image.

The global product name appears in shared product logos, login, default metadata and page titles. Footers show “A product of {companyName}” and link to the configured website. Tenant workspace names and uploaded logos remain distinct from product attribution.
