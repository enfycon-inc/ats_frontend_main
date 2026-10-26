function searchParams(value: string | URLSearchParams): URLSearchParams {
  return new URLSearchParams(typeof value === 'string' ? value : value.toString());
}

export function submissionReviewHref(current: string | URLSearchParams, submissionId: string, returnToTracker = false): string {
  const query = searchParams(current);
  query.set('submission', submissionId);
  query.set('review', '1');
  if (returnToTracker) query.set('reviewReturn', 'tracker');
  else query.delete('reviewReturn');
  return `/utility/submissions?${query}`;
}

export function closeSubmissionReviewHref(current: string | URLSearchParams): string {
  const query = searchParams(current);
  const returnToTracker = query.get('reviewReturn') === 'tracker';
  query.delete('review');
  query.delete('reviewReturn');
  if (returnToTracker) query.delete('submission');
  const suffix = query.toString();
  return `/utility/submissions${suffix ? `?${suffix}` : ''}`;
}
