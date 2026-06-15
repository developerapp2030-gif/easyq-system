import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ success: false, message: "إعدادات السيرفر غير مكتملة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, message: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const userSupabase = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user: authUser },
      error: authError,
    } = await userSupabase.auth.getUser();

    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ success: false, message: "جلسة المستخدم غير صالحة" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const targetUserId = body.target_user_id;
    const newPassword = body.new_password;

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ success: false, message: "معرف الموظف مطلوب" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!newPassword || String(newPassword).length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // جلب المستخدم الذي ينفذ العملية
    const { data: actor, error: actorError } = await adminSupabase
      .from("app_users")
      .select("id, role, business_id, is_active, username, display_name")
      .eq("auth_id", authUser.id)
      .eq("is_active", true)
      .single();

    if (actorError || !actor) {
      return new Response(
        JSON.stringify({ success: false, message: "غير مصرح" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (actor.role === "super_admin") {
      return new Response(
        JSON.stringify({ success: false, message: "هذه العملية مخصصة للوحة المطعم فقط" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // التحقق من صلاحية إدارة الموظفين
    const { data: permission, error: permissionError } = await adminSupabase
      .from("role_permissions")
      .select("is_enabled")
      .eq("role", actor.role)
      .eq("permission_key", "manage_users")
      .single();

    if (permissionError || !permission?.is_enabled) {
      return new Response(
        JSON.stringify({ success: false, message: "ليس لديك صلاحية لإدارة الموظفين" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // جلب الموظف المستهدف من نفس المطعم
    const { data: targetUser, error: targetError } = await adminSupabase
      .from("app_users")
      .select("id, auth_id, role, business_id, username, display_name")
      .eq("id", targetUserId)
      .eq("business_id", actor.business_id)
      .single();

    if (targetError || !targetUser) {
      return new Response(
        JSON.stringify({ success: false, message: "الموظف غير موجود أو لا يتبع هذا المطعم" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetUser.role === "super_admin") {
      return new Response(
        JSON.stringify({ success: false, message: "لا يمكن تعديل حساب سوبر أدمن" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!targetUser.auth_id) {
      return new Response(
        JSON.stringify({ success: false, message: "هذا الموظف لا يملك حساب دخول مرتبط" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // تغيير كلمة المرور في Supabase Auth
    const { error: updatePasswordError } = await adminSupabase.auth.admin.updateUserById(
      targetUser.auth_id,
      {
        password: newPassword,
      }
    );

if (updatePasswordError) {
  return new Response(
    JSON.stringify({
      success: false,
      message: "فشل تغيير كلمة المرور",
      details: updatePasswordError.message,
    }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

// تسجيل العملية في سجل نشاط المطعم
await adminSupabase
  .from("business_activity_logs")
  .insert({
    business_id: actor.business_id,

    actor_user_id: actor.id,
    actor_display_name: actor.display_name || actor.username || "مستخدم",
    actor_role: actor.role,

    action_key: "user_password_changed",
    action_label: "تغيير كلمة مرور موظف",

    target_type: "app_user",
    target_id: targetUser.id,
    target_label: targetUser.display_name || targetUser.username || "موظف",

    details: {
      username: targetUser.username || "",
      password_changed: true
    }
  });

return new Response(
      JSON.stringify({
        success: true,
        message: "تم تغيير كلمة مرور الموظف بنجاح",
        user: {
          id: targetUser.id,
          username: targetUser.username,
          display_name: targetUser.display_name,
          role: targetUser.role,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        message: "حدث خطأ غير متوقع",
        details: String(err?.message || err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});