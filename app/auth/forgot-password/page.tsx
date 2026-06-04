import ForgotPasswordComponent from "@/components/auth/forgot-password";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-100 dark:bg-slate-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-neutral-200 dark:border-slate-800">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <span className="text-2xl font-bold bg-gradient-to-r from-primary to-indigo-600 bg-clip-text text-transparent">
              enfysync
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-neutral-900 dark:text-white">
            Forgot Password
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            Enter your email to receive a password reset code
          </p>
        </div>
        <ForgotPasswordComponent />
      </div>
    </div>
  );
}
