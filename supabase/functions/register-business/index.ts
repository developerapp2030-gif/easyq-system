import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(
    JSON.stringify(body),
    {
      status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    }
  )
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return 'حدث خطأ غير متوقع'
}

function normalizeAuthErrorMessage(message: string) {
  const lower = message.toLowerCase()

  if (
    lower.includes('already') ||
    lower.includes('registered') ||
    lower.includes('exists') ||
    lower.includes('duplicate') ||
    message.includes('موجود') ||
    message.includes('مسجل')
  ) {
    return 'هذا البريد الإلكتروني مسجل مسبقًا، جرّب تسجيل الدخول أو استخدم بريدًا آخر.'
  }

  return message
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      {
        success: false,
        message: 'طريقة الطلب غير مسموحة',
      },
      405
    )
  }

  let supabaseAdmin: ReturnType<typeof createClient> | null = null

  let createdAuthUserId: string | null = null
  let createdBusinessId: string | null = null

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey =
      Deno.env.get('SVC_ROLE_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ||
      Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          success: false,
          message: 'إعدادات الخادم غير مكتملة: Supabase URL أو Service Role Key غير موجود',
        },
        500
      )
    }

    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '').trim()
    const business_name = String(body.business_name || '').trim()
    const phone = String(body.phone || '').trim()
    const city = String(body.city || '').trim()
    const display_name = String(body.display_name || '').trim()

    if (!email || !password || !business_name || !display_name || !phone || !city) {
      return jsonResponse(
        {
          success: false,
          message: 'جميع الحقول المطلوبة غير مكتملة',
        },
        400
      )
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(
        {
          success: false,
          message: 'يرجى إدخال بريد إلكتروني صحيح',
        },
        400
      )
    }

    if (password.length < 8) {
      return jsonResponse(
        {
          success: false,
          message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
        },
        400
      )
    }

    if (!/^05\d{8}$/.test(phone)) {
      return jsonResponse(
        {
          success: false,
          message: 'رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام',
        },
        400
      )
    }

    // 1. إنشاء مستخدم في Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        business_name,
        display_name,
        role: 'admin',
      },
    })

    if (authError) throw new Error(normalizeAuthErrorMessage(authError.message))

    if (!authUser?.user?.id) {
      throw new Error('تعذر إنشاء مستخدم المصادقة')
    }

    createdAuthUserId = authUser.user.id

    // 2. إنشاء سجل في جدول businesses
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: business_name,
        phone,
        city,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (businessError) throw businessError

    if (!business?.id) {
      throw new Error('تعذر إنشاء سجل المطعم')
    }

    createdBusinessId = business.id

    // 3. إنشاء ترخيص تجريبي قبل app_users
    // مهم جدًا: Trigger حدود المستخدمين على app_users يفحص وجود ترخيص للمطعم.
    // لذلك يجب إنشاء الترخيص قبل إنشاء مدير المطعم في app_users.
    const { error: licenseError } = await supabaseAdmin
      .from('licenses')
      .insert({
        business_id: business.id,
        license_key: crypto.randomUUID(),
        plan_type: 'trial',
        max_tables: 20,
        max_users: 5,
        max_zones: 5,
        max_floors: 3,
        whatsapp_api_enabled: false,
        analytics_enabled: false,
        support_priority: 'normal',
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true,
      })

    if (licenseError) throw licenseError

    // 4. إنشاء سجل في app_users (مدير المطعم)
    const { error: userError } = await supabaseAdmin
      .from('app_users')
      .insert({
        username: email,
        display_name,
        role: 'admin',
        business_id: business.id,
        auth_id: authUser.user.id,
        is_active: true,
      })

    if (userError) throw userError

    // 5. إنشاء إعدادات افتراضية للمطعم
    const { error: settingsError } = await supabaseAdmin
      .from('business_settings')
      .insert({
        business_id: business.id,
        ready_mode: 'any_match',
        alert_sound_enabled: true,
        alert_vibration_enabled: true,
        expired_sound_enabled: true,
        expired_vibration_enabled: true,
        expired_panel_enabled: true,
        expired_list_limit: 5,
        reservation_hold_minutes: 10,
        pending_hold_minutes: 5,
        cleaning_hold_minutes: 10,
      })

    if (settingsError) throw settingsError

    return jsonResponse(
      {
        success: true,
        business_id: business.id,
        message: 'تم تسجيل المطعم بنجاح',
      },
      200
    )

  } catch (error) {
    const message = getErrorMessage(error)

    console.error('register-business failed:', {
      message,
      createdAuthUserId,
      createdBusinessId,
    })

    // تنظيف آمن عند الفشل حتى لا يبقى مطعم بدون ترخيص أو مستخدم بدون اكتمال التسجيل
    if (supabaseAdmin && createdBusinessId) {
      try {
        await supabaseAdmin
          .from('business_settings')
          .delete()
          .eq('business_id', createdBusinessId)

        await supabaseAdmin
          .from('app_users')
          .delete()
          .eq('business_id', createdBusinessId)

        await supabaseAdmin
          .from('licenses')
          .delete()
          .eq('business_id', createdBusinessId)

        await supabaseAdmin
          .from('businesses')
          .delete()
          .eq('id', createdBusinessId)
      } catch (cleanupError) {
        console.error('register-business cleanup failed:', cleanupError)
      }
    }

    if (supabaseAdmin && createdAuthUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId)
      } catch (cleanupAuthError) {
        console.error('register-business auth cleanup failed:', cleanupAuthError)
      }
    }

    return jsonResponse(
      {
        success: false,
        message,
      },
      400
    )
  }
})