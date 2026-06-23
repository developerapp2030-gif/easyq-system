import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(405, {
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        message: "إعدادات السيرفر غير مكتملة",
      });
    }

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return jsonResponse(401, {
        success: false,
        message: "غير مصرح",
      });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: authUser },
      error: authError,
    } = await adminSupabase.auth.getUser(token);

    if (authError || !authUser) {
      return jsonResponse(401, {
        success: false,
        message: "جلسة المستخدم غير صالحة",
      });
    }

    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return jsonResponse(400, {
        success: false,
        message: "صيغة الطلب غير صحيحة",
      });
    }

    const targetUserId = String(body.target_user_id || "").trim();
    const newPassword = String(body.new_password || "");

    if (!targetUserId) {
      return jsonResponse(400, {
        success: false,
        message: "معرف الموظف مطلوب",
      });
    }

    if (!newPassword || newPassword.length < 8) {
      return jsonResponse(400, {
        success: false,
        message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل",
      });
    }

    const { data: actor, error: actorError } = await adminSupabase
      .from("app_users")
      .select("id, role, business_id, is_active, username, display_name")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (actorError || !actor) {
      return jsonResponse(403, {
        success: false,
        message: "غير مصرح",
      });
    }

    if (actor.is_active !== true) {
      return jsonResponse(403, {
        success: false,
        message: "حسابك غير نشط",
      });
    }

    if (actor.role !== "admin") {
      return jsonResponse(403, {
        success: false,
        message: "ليس لديك صلاحية تغيير كلمات مرور الموظفين",
      });
    }

    if (!actor.business_id) {
      return jsonResponse(403, {
        success: false,
        message: "لا يمكن تحديد المطعم للمستخدم الحالي",
      });
    }

    if (actor.id === targetUserId) {
      return jsonResponse(400, {
        success: false,
        message: "لا يمكنك تغيير كلمة مرور حسابك الحالي من إدارة الموظفين",
      });
    }

    const { data: targetUser, error: targetError } = await adminSupabase
      .from("app_users")
      .select("id, auth_id, role, business_id, username, display_name, is_active")
      .eq("id", targetUserId)
      .eq("business_id", actor.business_id)
      .maybeSingle();

    if (targetError || !targetUser) {
      return jsonResponse(404, {
        success: false,
        message: "الموظف غير موجود أو لا يتبع هذا المطعم",
      });
    }

    if (!["manager", "staff"].includes(targetUser.role)) {
      return jsonResponse(403, {
        success: false,
        message: "يمكن تغيير كلمة مرور المدير التشغيلي أو الموظف فقط",
      });
    }

    if (!targetUser.auth_id) {
      return jsonResponse(400, {
        success: false,
        message: "هذا الموظف لا يملك حساب دخول مرتبط",
      });
    }

    const { error: updatePasswordError } =
      await adminSupabase.auth.admin.updateUserById(targetUser.auth_id, {
        password: newPassword,
      });

    if (updatePasswordError) {
      console.error("update-user-password auth error:", updatePasswordError);

      return jsonResponse(500, {
        success: false,
        message: "فشل تغيير كلمة المرور",
      });
    }

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
          target_role: targetUser.role,
          password_changed: true,
        },
      });

    return jsonResponse(200, {
      success: true,
      message: "تم تغيير كلمة مرور الموظف بنجاح",
      user: {
        id: targetUser.id,
        username: targetUser.username,
        display_name: targetUser.display_name,
        role: targetUser.role,
      },
    });

  } catch (err) {
    console.error("update-user-password error:", err);

    return jsonResponse(500, {
      success: false,
      message: "حدث خطأ غير متوقع",
    });
  }
});