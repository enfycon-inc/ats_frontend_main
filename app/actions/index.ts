"use server"

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export async function doSocialLogin (formData: FormData) {
    const action = formData.get('action') as string;
    try {
        await signIn(action, { redirectTo: '/dashboard' });
    } catch (error: any) {
        // AuthError is thrown by next-auth even on successful redirects — re-throw those
        if (error?.message === "NEXT_REDIRECT" || error?.digest?.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        // OAuth provider not configured or SSO failure — redirect to login with error
        redirect(`/auth/login?error=OAuthNotConfigured`);
    }
}

export async function doLogout () {
    await signOut();
}
