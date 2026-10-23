import { normalizeJobWorkMode } from './job-work-mode';

interface JobLocationFields {
  workMode?: string | null;
  remoteJob?: string | null;
  location?: string | null;
  jobLocation?: string | null;
  city?: string | null;
  state?: string | null;
  states?: string | null;
  country?: string | null;
}

/** Geography is independent of work mode. Discard old mode-as-location placeholders. */
export function jobLocation(job: JobLocationFields): string {
  const explicit = (job.location || job.jobLocation || '').trim();
  if (explicit && !normalizeJobWorkMode(explicit)) return explicit;
  const parts = [job.city, job.state || job.states, job.country]
    .map(value => value?.trim()).filter((value): value is string => Boolean(value));
  return [...new Map(parts.map(value => [value.toLowerCase(), value])).values()].join(', ');
}

export function jobLocationDisplay(job: JobLocationFields): string {
  const location = jobLocation(job) || 'Location not specified';
  const mode = normalizeJobWorkMode(job.workMode) || normalizeJobWorkMode(job.remoteJob);
  return mode ? `${location} · ${mode}` : location;
}
