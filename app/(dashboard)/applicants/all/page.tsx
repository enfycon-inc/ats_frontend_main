import { redirect } from "next/navigation";

// Redirect /applicants/all → /applicants (main page)
export default function AllCandidatesPage() {
  redirect("/applicants");
}
