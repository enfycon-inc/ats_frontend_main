import { MassMailForm } from "@/components/email/mass-mail-form";

export default function MassMailPage() {
  return (
    <div className="p-4 md:p-6 w-full max-w-[1400px] mx-auto min-h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Mass Email Campaigns</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Send personalized bulk emails to candidates and track engagement.</p>
      </div>
      
      <MassMailForm />
    </div>
  );
}
