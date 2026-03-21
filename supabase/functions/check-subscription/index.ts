import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Collect emails to check: user's own email + tenant admin emails
    const emailsToCheck: string[] = [user.email];

    // Find tenant(s) this user belongs to and get admin emails
    const { data: memberData } = await supabaseClient
      .from("tenant_members")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (memberData && memberData.length > 0) {
      const tenantIds = memberData.map((m: any) => m.tenant_id);
      // Find admin users in these tenants
      const { data: adminRoles } = await supabaseClient
        .from("user_roles")
        .select("user_id")
        .in("tenant_id", tenantIds)
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const adminUserIds = adminRoles.map((r: any) => r.user_id).filter((id: string) => id !== user.id);
        if (adminUserIds.length > 0) {
          const { data: adminProfiles } = await supabaseClient
            .from("profiles")
            .select("email")
            .in("user_id", adminUserIds);
          if (adminProfiles) {
            for (const p of adminProfiles) {
              if (p.email && !emailsToCheck.includes(p.email)) {
                emailsToCheck.push(p.email);
              }
            }
          }
        }
      }
    }

    logStep("Emails to check", { emails: emailsToCheck });

    // Check Stripe for each email until we find an active subscription
    for (const email of emailsToCheck) {
      const customers = await stripe.customers.list({ email, limit: 1 });
      if (customers.data.length === 0) continue;

      const customerId = customers.data[0].id;
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const sub = subscriptions.data[0];
        let subscriptionEnd = null;
        try {
          const endTs = typeof sub.current_period_end === 'number'
            ? sub.current_period_end
            : Number(sub.current_period_end);
          if (!isNaN(endTs) && endTs > 0) {
            subscriptionEnd = new Date(endTs * 1000).toISOString();
          }
        } catch (e) {
          logStep("Could not parse period end", { raw: sub.current_period_end });
        }
        const priceId = sub.items.data[0].price.id;
        const productId = sub.items.data[0].price.product;
        logStep("Active subscription found", { email, priceId, productId });

        return new Response(JSON.stringify({
          subscribed: true,
          product_id: productId,
          price_id: priceId,
          subscription_end: subscriptionEnd,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    logStep("No active subscription found for any email");
    return new Response(JSON.stringify({ subscribed: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
