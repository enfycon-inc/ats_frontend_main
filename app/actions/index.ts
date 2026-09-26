"use server"

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function doSocialLogin (formData: FormData) {
    const action = formData.get('action') as string;
    const tenantId = formData.get('tenantId') as string | null;
    console.log('--- DO SOCIAL LOGIN CALLED ---');
    console.log('Action:', action);
    console.log('Tenant ID:', tenantId);
    
    // Dynamic kc_idp_hint logic for Keycloak
    let authParams: any = undefined;
    if (action === 'keycloak') {
        if (tenantId) {
            authParams = { kc_idp_hint: 'microsoft-' + tenantId };
        } else {
            authParams = { kc_idp_hint: 'microsoft' };
        }
    }

    try {
        await signIn(action, { redirectTo: '/dashboard' }, authParams);
    } catch (error: any) {
        // AuthError is thrown by next-auth even on successful redirects  re-throw those
        if (error?.message === "NEXT_REDIRECT" || error?.digest?.startsWith("NEXT_REDIRECT")) {
            throw error;
        }
        // OAuth provider not configured or SSO failure  redirect to login with error
        redirect('/auth/login?error=OAuthNotConfigured');
    }
}

export async function doLogout () {
    await signOut();
}
