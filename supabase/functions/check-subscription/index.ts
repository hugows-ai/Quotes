import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found");
      await supabaseClient.from('user_subscriptions').upsert({
        user_id: user.id,
        plan: 'free',
        status: 'inactive',
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_price_id: null,
        stripe_product_id: null,
        current_period_end: null,
        ai_daily_limit: 5,
        storage_limit_bytes: 524288000,
      }, { onConflict: 'user_id' });

      return new Response(JSON.stringify({ subscribed: false, plan: 'free' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let plan = 'free';
    let subscriptionEnd: string | null = null;
    let priceId: string | null = null;
    let productId: string | null = null;
    let subscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionId = subscription.id;
      priceId = subscription.items.data[0]?.price?.id || null;
      productId = typeof subscription.items.data[0]?.price?.product === 'string'
        ? subscription.items.data[0].price.product
        : null;
      plan = 'pro';

      // Safely convert period end to ISO string
      const periodEnd = subscription.current_period_end;
      if (periodEnd && typeof periodEnd === 'number' && periodEnd > 0) {
        try {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        } catch {
          subscriptionEnd = null;
        }
      }
      logStep("Active subscription found", { plan, subscriptionId, endDate: subscriptionEnd });
    } else {
      logStep("No active subscription");
    }

    // Persist subscription state
    const upsertData: Record<string, any> = {
      user_id: user.id,
      plan,
      status: hasActiveSub ? 'active' : 'inactive',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      stripe_product_id: productId,
      current_period_end: subscriptionEnd,
      ai_daily_limit: plan === 'pro' ? 999999 : 5,
      storage_limit_bytes: plan === 'pro' ? 53687091200 : 524288000, // 50GB for pro
    };

    const { error: upsertError } = await supabaseClient
      .from('user_subscriptions')
      .upsert(upsertData, { onConflict: 'user_id' });

    if (upsertError) {
      logStep("Upsert error", { message: upsertError.message });
    } else {
      logStep("Subscription persisted to DB");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
