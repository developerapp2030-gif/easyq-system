import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ success: false, message: "user_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: requester, error: requesterError } = await adminClient
      .from("app_users")
      .select("id, role, business_id, is_active")
      .eq("auth_id", user.id)
      .single();

    if (requesterError || !requester) {
      throw new Error("Requester user not found");
    }

    if (requester.role !== "admin" || requester.is_active !== true) {
      return new Response(
        JSON.stringify({ success: false, message: "ليس لديك صلاحية لحذف الموظفين" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requester.id === user_id) {
      return new Response(
        JSON.stringify({ success: false, message: "لا يمكنك حذف حسابك الحالي" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from("app_users")
      .select("id, username, display_name, role, business_id, auth_id")
      .eq("id", user_id)
      .eq("business_id", requester.business_id)
      .single();

    if (targetError || !targetUser) {
      throw new Error("الموظف غير موجود أو لا يتبع نفس المطعم");
    }

    if (!["manager", "staff"].includes(targetUser.role)) {
      return new Response(
        JSON.stringify({ success: false, message: "يمكن حذف المشرف أو الموظف فقط" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: deleteAppUserError } = await adminClient
      .from("app_users")
      .delete()
      .eq("id", targetUser.id)
      .eq("business_id", requester.business_id);

    if (deleteAppUserError) {
      throw deleteAppUserError;
    }

    if (targetUser.auth_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        targetUser.auth_id
      );

      if (deleteAuthError) {
        throw deleteAuthError;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "تم حذف الموظف بالكامل",
        deleted_user: {
          id: targetUser.id,
          username: targetUser.username,
          display_name: targetUser.display_name,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("delete-user error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        message: error?.message || "فشل حذف الموظف",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});