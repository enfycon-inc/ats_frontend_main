import ManagerPerformancePage from '../../components/manager-performance-page';

export default async function ManagerDetailPage({ params }: { params: Promise<{ managerId: string }> }) {
  const { managerId } = await params;
  return <ManagerPerformancePage managerId={managerId} />;
}
