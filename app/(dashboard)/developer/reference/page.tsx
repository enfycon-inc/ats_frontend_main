import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ApiReference() {
  return <div className="w-full space-y-5 pb-10 text-xs">
    <h1 className="text-xl font-bold">Developer API Reference</h1>
    <p>Use your configured ATS API host. Integrate from your website server and keep client secrets private.</p>
    <Card><CardHeader><CardTitle className="text-sm">1. Obtain an access token</CardTitle></CardHeader><CardContent className="space-y-3">
      <p>Create a client in Developer → API Clients. Send its ID and secret using HTTP Basic authentication. Tokens last up to 15 minutes; cache the token until shortly before expires_in, then request a new one. No refresh token is issued.</p>
      <pre className="overflow-auto rounded border p-3">{`POST /api/oauth/token
Authorization: Basic BASE64(CLIENT_ID:CLIENT_SECRET)
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials`}</pre>
      <pre className="overflow-auto rounded border p-3">{`{"access_token":"cat_...","token_type":"Bearer","expires_in":899}`}</pre>
      <p>Send the returned token as Authorization: Bearer &lt;access_token&gt;. Revoking the client blocks new tokens and all subsequent requests using its existing tokens.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">2. Published jobs</CardTitle></CardHeader><CardContent className="space-y-3"><pre>{`GET /api/public/jobs
GET /api/public/jobs/{slug}`}</pre><p>Only active, approved, publicly published jobs inside the client's tenant, branch, or unit scope are returned. There are no public job modification or deletion endpoints.</p></CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">3. Submit an application</CardTitle></CardHeader><CardContent className="space-y-3">
      <pre>POST /api/public/jobs/&#123;slug&#125;/applications</pre><p>Send multipart/form-data with resume (PDF or DOCX, maximum 8 MB), fullName, email, consent="true", totalExperienceYears, relevantExperienceYears, currentCompany, currentLocation, preferredLocations (comma-separated), noticePeriodDays, currentCompensation (Current CTC), expectedCompensation (Expected CTC), compensationCurrency, and compensationInputUnit. Include phone when available. Compensation fields must match the job's employment type.</p>
      <p>Source and recruiter attribution are assigned by the backend. Internal remarks are not candidate-facing fields.</p>
    </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-sm">Access controls and errors</CardTitle></CardHeader><CardContent><p>400: invalid input or grant type. 401: invalid client credentials, expired token, revoked client, inactive tenant/branch, or disallowed origin. 404: unavailable or out-of-scope job. 429: request limit reached. Origins may contain explicit HTTPS origins or * for any origin; this does not enable public browser storage of secrets or override the server's CORS policy.</p></CardContent></Card>
  </div>;
}
