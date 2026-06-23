import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user: authUser },
      error: authError,
    } = await adminClient.auth.getUser(token);

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

    const userId = String(body.user_id || "").trim();

    if (!userId) {
      return jsonResponse(400, {
        success: false,
        message: "معرف الموظف مطلوب",
      });
    }

    const { data: requester, error: requesterError } = await adminClient
      .from("app_users")
      .select("id, role, business_id, is_active, username, display_name")
      .eq("auth_id", authUser.id)
      .maybeSingle();

    if (requesterError || !requester) {
      return jsonResponse(403, {
        success: false,
        message: "غير مصرح",
      });
    }

    if (requester.is_active !== true) {
      return jsonResponse(403, {
        success: false,
        message: "حسابك غير نشط",
      });
    }

    if (requester.role !== "admin") {
      return jsonResponse(403, {
        success: false,
        message: "ليس لديك صلاحية حذف الموظفين",
      });
    }

    if (!requester.business_id) {
      return jsonResponse(403, {
        success: false,
        message: "لا يمكن تحديد المطعم للمستخدم الحالي",
      });
    }

    if (requester.id === userId) {
      return jsonResponse(400, {
        success: false,
        message: "لا يمكنك حذف حسابك الحالي",
      });
    }

    const { data: targetUser, error: targetError } = await adminClient
      .from("app_users")
      .select("id, username, display_name, role, business_id, auth_id, is_active")
      .eq("id", userId)
      .eq("business_id", requester.business_id)
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
        message: "يمكن حذف المدير التشغيلي أو الموظف فقط",
      });
    }

    const deletedUserSnapshot = {
      id: targetUser.id,
      username: targetUser.username,
      display_name: targetUser.display_name,
      role: targetUser.role,
      auth_id: targetUser.auth_id,
    };

    if (targetUser.auth_id) {
      const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(
        targetUser.auth_id
      );

      if (deleteAuthError) {
        console.error("delete-user auth delete error:", deleteAuthError);

        return jsonResponse(500, {
          success: false,
          message: "فشل حذف حساب الدخول المرتبط بالموظف",
        });
      }
    }

    const { error: deleteAppUserError } = await adminClient
      .from("app_users")
      .delete()
      .eq("id", targetUser.id)
      .eq("business_id", requester.business_id);

    if (deleteAppUserError) {
      console.error("delete-user app_users delete error:", deleteAppUserError);

      return jsonResponse(500, {
        success: false,
        message: "تم حذف حساب الدخول، لكن فشل حذف سجل الموظف من قاعدة البيانات. راجع الدعم.",
      });
    }

    await adminClient
      .from("business_activity_logs")
      .insert({
        business_id: requester.business_id,

        actor_user_id: requester.id,
        actor_display_name: requester.display_name || requester.username || "مستخدم",
        actor_role: requester.role,

        action_key: "user_deleted",
        action_label: "حذف موظف",

        target_type: "app_user",
        target_id: deletedUserSnapshot.id,
        target_label:
          deletedUserSnapshot.display_name ||
          deletedUserSnapshot.username ||
          "موظف",

        details: {
          username: deletedUserSnapshot.username || "",
          display_name: deletedUserSnapshot.display_name || "",
          role: deletedUserSnapshot.role || "",
          auth_deleted: Boolean(deletedUserSnapshot.auth_id),
        },
      });

    return jsonResponse(200, {
      success: true,
      message: "تم حذف الموظف بالكامل",
      deleted_user: {
        id: deletedUserSnapshot.id,
        username: deletedUserSnapshot.username,
        display_name: deletedUserSnapshot.display_name,
        role: deletedUserSnapshot.role,
      },
    });

  } catch (error) {
    console.error("delete-user error:", error);

    return jsonResponse(500, {
      success: false,
      message: "فشل حذف الموظف",
    });
  }
});