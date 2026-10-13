'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useLoading } from '@/contexts/LoadingContext'
import { forgotPasswordSchema } from '@/lib/zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import { atsApi } from '@/lib/ats-api'

const ForgotPasswordComponent = () => {
  const { loading, setLoading } = useLoading()
  const [isPending, startTransition] = useTransition()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = (values: z.infer<typeof forgotPasswordSchema>) => {
    setLoading(true)

    startTransition(async () => {
      try {
        const res = await atsApi.auth.forgotPassword(values.email)
        if (res?.success) {
          setSubmittedEmail(values.email)
          toast.success(res.message || 'Password reset link sent to your email.')
        } else {
          toast.error(res?.message || 'Failed to request password reset.')
        }
      } catch (error: any) {
        console.error('Forgot password error:', error)
        toast.error(error.message || 'Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    })
  }

  if (submittedEmail) {
    return (
      <div className="space-y-6 text-center py-2">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
          <Mail className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Check Your Email
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed px-2">
            If an account exists for <span className="font-semibold text-slate-900 dark:text-white">{submittedEmail}</span>,
            we have sent a secure password reset link. Please check your inbox and spam folder.
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            ⏱️ For security, the link will expire in 30 minutes.
          </p>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm border-slate-300 dark:border-slate-700"
            onClick={() => {
              setSubmittedEmail(null)
              form.reset()
            }}
          >
            Send to a different email
          </Button>

          <div>
            <Link
              href="/auth/login"
              className="inline-flex items-center text-sm font-semibold text-primary hover:underline gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5"
        >
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute start-5 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-700 dark:text-neutral-200" />
                    <Input
                      {...field}
                      type="email"
                      placeholder="Enter your registered work email"
                      name="email"
                      className="ps-13 pe-12 h-14 rounded-xl bg-neutral-100 dark:bg-slate-800 border border-neutral-300 dark:border-slate-700 focus:border-primary dark:focus:border-primary focus-visible:border-primary !shadow-none !ring-0"
                      disabled={loading || isPending}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full rounded-lg h-[52px] text-sm mt-2"
            disabled={loading || isPending}
          >
            {loading || isPending ? (
              <>
                <Loader2 className="animate-spin h-4.5 w-4.5 mr-2" />
                Sending Link...
              </>
            ) : (
              'Send Password Reset Link'
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-8 text-center text-sm">
        <p>
          Remember your credentials?{' '}
          <Link
            href="/auth/login"
            className="text-primary font-semibold hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </>
  )
}

export default ForgotPasswordComponent
