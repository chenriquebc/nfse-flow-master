import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No auth" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { name, email, document, plan, password, is_member, tenant_id } = body;

    if (!name || !email) {
      return new Response(JSON.stringify({ error: "name and email required" }), { status: 400, headers: corsHeaders });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // If is_member=true, the caller must be a tenant admin (not necessarily platform admin)
    if (is_member && tenant_id) {
      // Check caller has admin role in this tenant
      const { data: hasRole } = await adminClient
        .from("user_roles")
        .select("id")
        .eq("user_id", caller.id)
        .eq("tenant_id", tenant_id)
        .eq("role", "admin")
        .maybeSingle();

      if (!hasRole) {
        return new Response(JSON.stringify({ error: "Not a tenant admin" }), { status: 403, headers: corsHeaders });
      }

      // Create auth user
      const tempPassword = password || (crypto.randomUUID().slice(0, 12) + "A1!");
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: name, provisioned: true },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const userId = authData.user.id;

      // Add to tenant_members, user_roles, and set profile
      await adminClient.from("tenant_members").insert({ tenant_id, user_id: userId });
      await adminClient.from("user_roles").insert({ tenant_id, user_id: userId, role: "operator" });

      console.log(`[PROVISION] Member created for ${email} in tenant ${tenant_id}`);

      return new Response(
        JSON.stringify({ success: true, user_id: userId, email, temp_password: tempPassword }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Original flow: platform admin provisioning a new tenant
    const { data: isAdmin } = await callerClient.rpc("is_platform_admin", { _user_id: caller.id });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Not a platform admin" }), { status: 403, headers: corsHeaders });
    }

    const tempPassword = crypto.randomUUID().slice(0, 12) + "A1!";
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: name, provisioned: true },
    });

    if (authError) {
      return new Response(JSON.stringify({ error: authError.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userId = authData.user.id;

    const { data: tenantData, error: tenantError } = await adminClient
      .from("tenants")
      .insert({ name, email, document: document || "", plan: plan || "basic", subscription_status: "active" })
      .select("id")
      .single();

    if (tenantError) {
      return new Response(JSON.stringify({ error: tenantError.message }), { status: 500, headers: corsHeaders });
    }

    const tenantId = tenantData.id;

    await adminClient.from("tenant_members").insert({ tenant_id: tenantId, user_id: userId });
    await adminClient.from("user_roles").insert({ tenant_id: tenantId, user_id: userId, role: "admin" });
    await adminClient.from("profiles").update({
      must_change_password: true,
      provisioned_at: new Date().toISOString(),
    }).eq("user_id", userId);

    console.log(`[PROVISION] Account created for ${email} with temp password. Tenant: ${tenantId}`);

    return new Response(
      JSON.stringify({ success: true, tenant_id: tenantId, email, temp_password: tempPassword }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
