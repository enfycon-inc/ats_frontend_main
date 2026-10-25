import { Suspense } from "react";
import HelpSupport from "@/components/help/help-support";

export default function HelpPage() {
  return <Suspense fallback={<p className="text-xs text-slate-500" role="status">Loading help guides…</p>}>
    <HelpSupport />
  </Suspense>;
}
