import { supabase } from '../lib/supabase';
import { CHARIOW_LICENSE_PRODUCTS } from '../types/database';

export interface CheckoutResult {
  success: boolean;
  checkout_url?: string;
  plan?: 'creator' | 'pro';
  product_id?: string;
  product_name?: string;
  price_usd?: number;
  error?: string;
  message?: string;
}

export interface SubscriptionCountdown {
  plan: 'free' | 'creator' | 'pro';
  status: 'active' | 'expired' | 'trial' | 'pending';
  daysRemaining: number;
  hoursRemaining: number;
  isExpiringSoon: boolean; // <= 5 days
  isExpired: boolean;
  expiresAt: Date | null;
  startedAt: Date | null;
  licenseKey: string | null;
  licenseStatus: string | null;
  formattedExpirationDate: string;
}

/**
 * Initiates secure Chariow checkout via backend API route (/api/payments/chariow/checkout)
 * Backend uses process.env.CHARIOW_API_KEY securely on the server and returns authorized checkout URL
 */
export async function initiateChariowCheckout(
  plan: 'creator' | 'pro'
): Promise<CheckoutResult> {
  const hostedUrl = plan === 'pro'
    ? 'https://manux.mychariow.com/prd_lsy7udh2'
    : 'https://manux.mychariow.com/prd_bqe0zdzi';

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      return {
        success: false,
        error: 'UNAUTHENTICATED',
        message: 'Veuillez vous connecter pour souscrire à un abonnement.',
      };
    }

    let response: Response;
    try {
      response = await fetch('/api/payments/chariow/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plan }),
      });
    } catch (networkErr: any) {
      console.warn('[CHARIOW CHECKOUT] Network request failed, using direct checkout URL:', networkErr);
      const params = new URLSearchParams();
      if (session?.user?.email) {
        params.set('email', session.user.email);
        params.set('customer_email', session.user.email);
        params.set('email_address', session.user.email);
        params.set('customer[email]', session.user.email);
      }
      params.set('custom_metadata[manux_user_id]', session?.user?.id || '');
      params.set('custom_metadata[manux_plan]', plan);
      params.set('checkout', 'true');
      params.set('buy', '1');
      params.set('step', 'payment');
      params.set('quick', '1');
      return {
        success: true,
        checkout_url: `${hostedUrl}/checkout?${params.toString()}`,
        plan,
        product_id: plan === 'pro' ? 'prd_lsy7udh2' : 'prd_bqe0zdzi',
      };
    }

    const responseText = await response.text();
    let result: any = null;
    if (responseText && responseText.trim()) {
      try {
        result = JSON.parse(responseText);
      } catch (parseErr) {
        console.warn('[CHARIOW CHECKOUT] Non-JSON server response text:', responseText.slice(0, 150));
      }
    }

    if (!response.ok || !result || !result.success) {
      if (result && result.message) {
        return {
          success: false,
          error: result.error || 'CHECKOUT_ERROR',
          message: result.message,
        };
      }

      // If server returned empty or non-JSON body, fallback seamlessly to direct store checkout URL
      console.info('[CHARIOW CHECKOUT] Falling back to direct checkout store URL');
      const params = new URLSearchParams();
      if (session?.user?.email) {
        params.set('email', session.user.email);
        params.set('customer_email', session.user.email);
        params.set('email_address', session.user.email);
        params.set('customer[email]', session.user.email);
      }
      params.set('custom_metadata[manux_user_id]', session?.user?.id || '');
      params.set('custom_metadata[manux_plan]', plan);
      params.set('checkout', 'true');
      params.set('buy', '1');
      params.set('step', 'payment');
      params.set('quick', '1');

      return {
        success: true,
        checkout_url: `${hostedUrl}/checkout?${params.toString()}`,
        plan,
        product_id: plan === 'pro' ? 'prd_lsy7udh2' : 'prd_bqe0zdzi',
      };
    }

    return result as CheckoutResult;
  } catch (error: any) {
    console.error('Error initiating Chariow checkout:', error);
    const params = new URLSearchParams();
    params.set('custom_metadata[manux_plan]', plan);
    params.set('checkout', 'true');
    params.set('buy', '1');
    params.set('step', 'payment');
    return {
      success: true,
      checkout_url: `${hostedUrl}/checkout?${params.toString()}`,
      plan,
      product_id: plan === 'pro' ? 'prd_lsy7udh2' : 'prd_bqe0zdzi',
    };
  }
}

/**
 * Calculates remaining days and countdown for a user's subscription
 */
export function calculateSubscriptionCountdown(profile: any): SubscriptionCountdown {
  const plan = (profile?.subscription_plan || 'free') as 'free' | 'creator' | 'pro';
  const status = (profile?.subscription_status || 'active') as 'active' | 'expired' | 'trial' | 'pending';
  const licenseKey = profile?.license_key || null;
  const licenseStatus = profile?.license_status || (plan !== 'free' ? 'active' : null);

  if (plan === 'free' || !profile?.subscription_expires_at) {
    return {
      plan: 'free',
      status: 'active',
      daysRemaining: 0,
      hoursRemaining: 0,
      isExpiringSoon: false,
      isExpired: false,
      expiresAt: null,
      startedAt: profile?.subscription_started_at ? new Date(profile.subscription_started_at) : null,
      licenseKey,
      licenseStatus,
      formattedExpirationDate: 'Illimité (Plan Gratuit)',
    };
  }

  const expiresAt = new Date(profile.subscription_expires_at);
  const startedAt = profile.subscription_started_at ? new Date(profile.subscription_started_at) : null;
  const now = new Date();

  const diffMs = expiresAt.getTime() - now.getTime();
  const isExpired = diffMs <= 0 || status === 'expired';

  if (isExpired) {
    return {
      plan,
      status: 'expired',
      daysRemaining: 0,
      hoursRemaining: 0,
      isExpiringSoon: false,
      isExpired: true,
      expiresAt,
      startedAt,
      licenseKey,
      licenseStatus: 'expired',
      formattedExpirationDate: `Expiré le ${expiresAt.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })}`,
    };
  }

  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isExpiringSoon = daysRemaining <= 5;

  return {
    plan,
    status: 'active',
    daysRemaining,
    hoursRemaining,
    isExpiringSoon,
    isExpired: false,
    expiresAt,
    startedAt,
    licenseKey,
    licenseStatus,
    formattedExpirationDate: expiresAt.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}
