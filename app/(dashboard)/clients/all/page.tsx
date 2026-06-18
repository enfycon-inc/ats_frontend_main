import { Metadata } from "next"
import ClientDashboard from "../components/client-dashboard"

export const metadata: Metadata = {
  title: "Clients | ATS",
  description: "Manage your clients",
}

export default function ClientsPage() {
  return <ClientDashboard />;
}
