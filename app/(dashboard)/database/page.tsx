import { redirect } from "next/navigation";

export default function DatabaseRedirect() {
  redirect("/applicants/all");
}
