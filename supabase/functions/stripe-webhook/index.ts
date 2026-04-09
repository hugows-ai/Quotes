import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Webhooks are POST only
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not set" });
    return new Response("Server configuration error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (webhookSecret) {
      if (!sig) {
        logStep("Missing stripe-signature header");
        return new Response("Missing signature", { status: 400 });
      }
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err) {
        logStep("Signature verification failed", { error: (err as Error).message });
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      // Without webhook secret, parse directly (development/test mode)
      logStep("WARNING: No STRIPE_WEBHOOK_SECRET set - accepting unverified events");
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Event received", { type: event.type, id: event.id });

    const relevantEvents = [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
      "invoice.payment_succeeded",
      "invoice.payment_failed",
    ];

    if (!relevantEvents.includes(event.type)) {
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const findUserByEmail = async (email: string) => {
      const { data, error } = await supabaseClient.auth.admin.listUsers();
      if (error) throw error;
      return data.users.find(u => u.email === email);
    };

    const upsertSubscription = async (
      userId: string, plan: string, status: string,
      customerId: string | null, subscriptionId: string | null,
      priceId: string | null, productId: string | null, periodEnd: string | null,
    ) => {
      const { error } = await supabaseClient.from("user_subscriptions").upsert({
        user_id: userId,
        plan, status,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        stripe_product_id: productId,
        current_period_end: periodEnd,
        ai_daily_limit: plan === "pro" ? 999999 : 5,
        storage_limit_bytes: plan === "pro" ? 53687091200 : 314572800,
      }, { onConflict: "user_id" });

      if (error) {
        logStep("Upsert error", { message: error.message });
      } else {
        logStep("Subscription upserted", { userId, plan, status });
      }
    };

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_email || session.customer_details?.email;
      if (!customerEmail) {
        logStep("No email in checkout session");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const user = await findUserByEmail(customerEmail);
      if (!user) {
        logStep("User not found", { email: customerEmail });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
      if (subscriptionId) {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price?.id || null;
        const productId = typeof subscription.items.data[0]?.price?.product === "string"
          ? subscription.items.data[0].price.product : null;
        const periodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString() : null;

        await upsertSubscription(
          user.id, "pro", "active",
          typeof session.customer === "string" ? session.customer : null,
          subscriptionId, priceId, productId, periodEnd
        );
      }
    }

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;
      
      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (email) {
          const user = await findUserByEmail(email);
          if (user) {
            const isActive = subscription.status === "active" || subscription.status === "trialing";
            const priceId = subscription.items.data[0]?.price?.id || null;
            const productId = typeof subscription.items.data[0]?.price?.product === "string"
              ? subscription.items.data[0].price.product : null;
            const periodEnd = subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString() : null;

            await upsertSubscription(
              user.id, isActive ? "pro" : "free", isActive ? "active" : "inactive",
              customerId, subscription.id, priceId, productId, periodEnd
            );
          }
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = typeof subscription.customer === "string" ? subscription.customer : null;

      if (customerId) {
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (email) {
          const user = await findUserByEmail(email);
          if (user) {
            await upsertSubscription(
              user.id, "free", "canceled",
              customerId, subscription.id, null, null, null
            );
          }
        }
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      const customerEmail = typeof invoice.customer_email === "string" ? invoice.customer_email : null;
      if (customerEmail) {
        const user = await findUserByEmail(customerEmail);
        if (user) {
          logStep("Payment failed for user", { userId: user.id });
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
