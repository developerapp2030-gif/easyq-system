import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-info, apikey",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ success: false, message: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SVC_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return json({ success: false, message: "Server configuration error" }, 500);
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();

    const businessName = String(body.business_name || "").trim();
    const displayName = String(body.display_name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = body.phone ? String(body.phone).trim() : null;
    const city = body.city ? String(body.city).trim() : null;

    if (businessName.length < 2) {
      return json({ success: false, message: "اسم المطعم غير صحيح" }, 400);
    }

    if (displayName.length < 2) {
      return json({ success: false, message: "اسم المدير غير صحيح" }, 400);
    }

    if (!email || !email.includes("@")) {
      return json({ success: false, message: "البريد الإلكتروني غير صحيح" }, 400);
    }

    if (password.length < 8) {
      return json({ success: false, message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل" }, 400);
    }

    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          business_name: businessName,
          role: "admin",
        },
      });

    if (createUserError || !createdUser.user) {
      return json({
        success: false,
        message: createUserError?.message || "فشل إنشاء حساب المستخدم",
      }, 400);
    }

    const authId = createdUser.user.id;

    const { data: result, error: rpcError } = await admin.rpc("register_business_core", {
      p_business_name: businessName,
      p_admin_email: email,
      p_admin_display_name: displayName,
      p_auth_id: authId,
      p_phone: phone,
      p_city: city,
    });

    if (rpcError || !result?.success) {
      await admin.auth.admin.deleteUser(authId);

      return json({
        success: false,
        message: rpcError?.message || result?.message || "فشل إنشاء بيانات المطعم",
      }, 400);
    }

    return json({
      success: true,
      message: "تم إنشاء المطعم بنجاح",
      business_id: result.business_id,
      license_key: result.license_key,
    }, 200);

  } catch (error) {
    return json({
      success: false,
      message: error?.message || "Unexpected error",
    }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}