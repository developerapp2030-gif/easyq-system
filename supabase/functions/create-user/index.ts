import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
}

function jsonResponse(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      success: false,
      message: 'Method not allowed',
    })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        message: 'إعدادات السيرفر غير مكتملة',
      })
    }

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '').trim()

    if (!token) {
      return jsonResponse(401, {
        success: false,
        message: 'غير مصرح',
      })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

    const {
      data: { user: authUser },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return jsonResponse(401, {
        success: false,
        message: 'جلسة المستخدم غير صالحة',
      })
    }

    const { data: actor, error: actorError } = await supabaseAdmin
      .from('app_users')
      .select('id, username, display_name, role, business_id, is_active')
      .eq('auth_id', authUser.id)
      .maybeSingle()

    if (actorError || !actor) {
      return jsonResponse(403, {
        success: false,
        message: 'لم يتم العثور على مستخدم النظام',
      })
    }

    if (actor.is_active !== true) {
      return jsonResponse(403, {
        success: false,
        message: 'حسابك غير نشط',
      })
    }

    if (actor.role !== 'admin') {
      return jsonResponse(403, {
        success: false,
        message: 'ليس لديك صلاحية إنشاء مستخدمين',
      })
    }

    if (!actor.business_id) {
      return jsonResponse(403, {
        success: false,
        message: 'لا يمكن تحديد المطعم للمستخدم الحالي',
      })
    }

    const body = await req.json()

    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const displayName = String(body.display_name || '').trim()
    const requestedRole = String(body.role || '').trim()

    const allowedRolesToCreate = ['manager', 'staff']

    if (!email || !password || !displayName || !requestedRole) {
      return jsonResponse(400, {
        success: false,
        message: 'البيانات المطلوبة غير مكتملة',
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(400, {
        success: false,
        message: 'البريد الإلكتروني غير صحيح',
      })
    }

    if (password.length < 6) {
      return jsonResponse(400, {
        success: false,
        message: 'كلمة المرور يجب أن تكون 6 أحرف أو أكثر',
      })
    }

    if (!allowedRolesToCreate.includes(requestedRole)) {
      return jsonResponse(403, {
        success: false,
        message: 'لا يمكن إنشاء مستخدم بهذا الدور',
      })
    }

    const { data: existingAppUser, error: existingError } = await supabaseAdmin
      .from('app_users')
      .select('id')
      .eq('username', email)
      .maybeSingle()

    if (existingError) {
      return jsonResponse(400, {
        success: false,
        message: existingError.message,
      })
    }

    if (existingAppUser) {
      return jsonResponse(409, {
        success: false,
        message: 'هذا البريد الإلكتروني مستخدم مسبقًا',
      })
    }

    const { data: createdAuthUser, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          role: requestedRole,
        },
      })

    if (createAuthError || !createdAuthUser?.user?.id) {
      return jsonResponse(400, {
        success: false,
        message: createAuthError?.message || 'فشل إنشاء مستخدم المصادقة',
      })
    }

    const newAuthId = createdAuthUser.user.id

    const { data: createdAppUser, error: dbError } = await supabaseAdmin
      .from('app_users')
      .insert({
        username: email,
        display_name: displayName,
        role: requestedRole,
        business_id: actor.business_id,
        auth_id: newAuthId,
        is_active: true,
      })
      .select('id, username, display_name, role, business_id, is_active')
      .single()

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(newAuthId)

      return jsonResponse(400, {
        success: false,
        message: dbError.message || 'فشل حفظ المستخدم في قاعدة البيانات',
      })
    }

    return jsonResponse(200, {
      success: true,
      user: createdAppUser,
    })
  } catch (error) {
    return jsonResponse(500, {
      success: false,
      message: String(error?.message || error || 'حدث خطأ غير متوقع'),
    })
  }
})