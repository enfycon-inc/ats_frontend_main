# Frontend contract validation

The frontend production image builds from this repository alone. `npm run build`
runs the three synchronization scripts with `--check`, validating committed
contract copies against `contracts.manifest.json`. No sibling backend directory
is required inside Docker.

CI also checks out `ats_backend` beside this repository, records its exact Git
revision in the build log, and runs every script with `--check-backend`. This
compares actual canonical sources and fails if they are missing or different.
Checksums alone do not establish compatibility with a backend revision.

When changing a canonical contract, first update the backend and then run the
appropriate synchronization command from the frontend directory:

```
node scripts/sync-tenant-branding.cjs
node scripts/sync-sign-in-policy.cjs
node scripts/sync-job-access.cjs
```

Commit the changed frontend contracts and manifest together. Publish the backend
contract revision before triggering a frontend release, since CI compares against
backend `main`. Never regenerate hashes solely to accept an unrelated frontend
edit. Line endings are normalized to LF for cross-platform comparisons.

Run `node --test tests/contract-validation.test.cjs` for isolated frontend-only,
missing-source, modified-contract, synchronization and line-ending checks.

This changes build validation only. It does not introduce a database migration
or change application permissions. Roll back the workflow and frontend validation
files together if reverting this build arrangement.
