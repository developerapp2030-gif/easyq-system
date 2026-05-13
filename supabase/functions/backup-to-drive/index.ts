import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { google } from 'https://esm.sh/googleapis@126.0.1'

const DRIVE_FOLDER_NAME = 'HAJZAK_BACKUPS'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

serve(async (req) => {
  // التعامل مع preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // التحقق من التوكن السري
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${Deno.env.get('BACKUP_SECRET')}`) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { business_id } = await req.json()
    
    // الاتصال بـ Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    // جلب بيانات النسخ الاحتياطي
    const { data: backupData, error: backupError } = await supabaseClient.rpc('save_business_backup', {
      p_business_id: business_id
    })
    
    if (backupError) throw backupError
    
    // إعداد مصادقة Google Drive
    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
    
    const drive = google.drive({ version: 'v3', auth })
    
    // البحث عن مجلد المطعم
    const folderName = `${business_id}`
    let folderId = await getOrCreateFolder(drive, folderName, DRIVE_FOLDER_NAME)
    
    // رفع الملف
    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`
    const fileContent = JSON.stringify(backupData.data)
    
    const fileResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
        mimeType: 'application/json',
      },
      media: {
        mimeType: 'application/json',
        body: new Blob([fileContent], { type: 'application/json' }),
      },
    })
    
    // حذف النسخ القديمة
    await cleanOldBackups(drive, folderId, 7)
    
    return new Response(
      JSON.stringify({ success: true, fileId: fileResponse.data.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getOrCreateFolder(drive: any, folderName: string, parentFolderName: string): Promise<string> {
  // البحث عن المجلد الرئيسي
  const parentQuery = await drive.files.list({
    q: `name='${parentFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  })
  
  let parentId = parentQuery.data.files?.[0]?.id
  
  if (!parentId) {
    const parentFolder = await drive.files.create({
      requestBody: {
        name: parentFolderName,
        mimeType: 'application/vnd.google-apps.folder',
      },
    })
    parentId = parentFolder.data.id
  }
  
  // البحث عن مجلد المطعم
  const query = await drive.files.list({
    q: `name='${folderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  })
  
  if (query.data.files && query.data.files.length > 0) {
    return query.data.files[0].id
  }
  
  // إنشاء مجلد جديد
  const folder = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
  })
  
  return folder.data.id
}

async function cleanOldBackups(drive: any, folderId: string, keepCount: number) {
  const files = await drive.files.list({
    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
    fields: 'files(id, name, createdTime)',
    orderBy: 'createdTime desc',
  })
  
  const allFiles = files.data.files || []
  const toDelete = allFiles.slice(keepCount)
  
  for (const file of toDelete) {
    await drive.files.delete({ fileId: file.id })
  }
}