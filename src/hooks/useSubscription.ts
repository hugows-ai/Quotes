import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type Plan = 'free' | 'pro';

export const PLANS = {
  pro: {
    price_id: 'price_1TBwIdLX8c1YLYiD2xUPxtbJ',
    product_id: 'prod_UAGqwWcWXE1bTs',
  },
} as const;

interface SubscriptionState {
  plan: Plan;
  subscribed: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

// TEMPORARY: All users treated as Pro. Set to false to re-enable paywall.
const PAYWALL_DISABLED = true;

export function useSubscription() {
  const { user, session } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    plan: PAYWALL_DISABLED ? 'pro' : 'free',
    subscribed: PAYWALL_DISABLED ? true : false,
    subscriptionEnd: null,
    loading: false,
  });

  const checkSubscription = useCallback(async () => {
    if (!user || !session) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setState({
        plan: data.plan || 'free',
        subscribed: data.subscribed || false,
        subscriptionEnd: data.subscription_end || null,
        loading: false,
      });
    } catch (err) {
      console.error('Subscription check error:', err);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user, session]);

  useEffect(() => {
    if (user && session) {
      checkSubscription();
      const interval = setInterval(checkSubscription, 60000);
      return () => clearInterval(interval);
    }
  }, [user, session, checkSubscription]);

  const checkout = useCallback(async (priceId: string) => {
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Checkout error:', err);
    }
  }, [session]);

  const manageSubscription = useCallback(async () => {
    if (!session) return;
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err) {
      console.error('Portal error:', err);
    }
  }, [session]);

  return { ...state, checkSubscription, checkout, manageSubscription };
}
