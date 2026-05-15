import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SVC_ROLE_KEY')!
    )

    const { email, password, business_name, phone, city, display_name } = await req.json()

    if (!email || !password || !business_name || !display_name) {
      return new Response(
        JSON.stringify({ success: false, message: 'جميع الحقول المطلوبة غير مكتملة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 8) {
      return new Response(
        JSON.stringify({ success: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 1. إنشاء مستخدم في Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { business_name, display_name, role: 'admin' }
    })

    if (authError) throw authError

    // 2. إنشاء سجل في جدول businesses
    const { data: business, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: business_name,
        phone: phone || null,
        city: city || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (businessError) throw businessError

    // 3. إنشاء سجل في app_users (مدير المطعم)
    const { error: userError } = await supabaseAdmin
      .from('app_users')
      .insert({
        username: email,
        display_name: display_name,
        role: 'admin',
        business_id: business.id,
        auth_id: authUser.user.id,
        is_active: true
      })

    if (userError) throw userError

    // 4. إنشاء ترخيص تجريبي (14 يوم)
    const { error: licenseError } = await supabaseAdmin
      .from('licenses')
      .insert({
        business_id: business.id,
        license_key: crypto.randomUUID(),
        plan_type: 'trial',
        max_tables: 20,
        max_users: 5,
        starts_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        is_active: true
      })

    if (licenseError) throw licenseError

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
        cleaning_hold_minutes: 10
      })

    if (settingsError) throw settingsError

    return new Response(
      JSON.stringify({
        success: true,
        business_id: business.id,
        message: 'تم تسجيل المطعم بنجاح'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, message: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})