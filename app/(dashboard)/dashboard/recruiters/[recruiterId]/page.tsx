import RecruiterPerformancePage from '../../components/recruiter-performance-page';
export default async function Page({
  params,
}: {
  params: Promise<{ recruiterId: string }>;
}) {
  const { recruiterId } = await params;
  return <RecruiterPerformancePage recruiterId={recruiterId} />;
}
