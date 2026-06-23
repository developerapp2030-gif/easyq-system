import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { google } from 'https://esm.sh/googleapis@126.0.1'

const DRIVE_FOLDER_NAME = 'HAJZAK_BACKUPS'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

function isValidUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function escapeDriveQueryValue(value: string) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, {
      success: false,
      error: 'Method not allowed',
    })
  }

  try {
    const backupSecret = Deno.env.get('BACKUP_SECRET')
    const authHeader = req.headers.get('Authorization') || ''

    if (!backupSecret || authHeader !== `Bearer ${backupSecret}`) {
      return jsonResponse(401, {
        success: false,
        error: 'Unauthorized',
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(500, {
        success: false,
        error: 'Server configuration is incomplete',
      })
    }

    const body = await req.json().catch(() => ({}))
    const businessId = String(body.business_id || '').trim()

    if (!businessId) {
      return jsonResponse(400, {
        success: false,
        error: 'business_id is required',
      })
    }

    if (!isValidUuid(businessId)) {
      return jsonResponse(400, {
        success: false,
        error: 'Invalid business_id',
      })
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .maybeSingle()

    if (businessError) {
      return jsonResponse(500, {
        success: false,
        error: 'Failed to verify business',
      })
    }

    if (!business) {
      return jsonResponse(404, {
        success: false,
        error: 'Business not found',
      })
    }

    const { data: backupData, error: backupError } = await supabaseClient.rpc('save_business_backup', {
      p_business_id: businessId,
    })

    if (backupError) {
      return jsonResponse(500, {
        success: false,
        error: 'Backup RPC failed',
      })
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })

    const drive = google.drive({ version: 'v3', auth })

    const folderName = businessId
    const folderId = await getOrCreateFolder(drive, folderName, DRIVE_FOLDER_NAME)

    const fileName = `backup_${new Date().toISOString().split('T')[0]}.json`
    const fileContent = JSON.stringify({
      business_id: businessId,
      business_name: business.name || '',
      created_at: new Date().toISOString(),
      backup: backupData?.data ?? backupData ?? null,
    })

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

    await cleanOldBackups(drive, folderId, 7)

    return jsonResponse(200, {
      success: true,
      business_id: businessId,
      fileId: fileResponse.data.id,
    })

  } catch (error) {
    console.error('backup-to-drive failed:', error)

    return jsonResponse(500, {
      success: false,
      error: 'Unexpected backup error',
    })
  }
})

async function getOrCreateFolder(drive: any, folderName: string, parentFolderName: string): Promise<string> {
  const safeParentFolderName = escapeDriveQueryValue(parentFolderName)
  const safeFolderName = escapeDriveQueryValue(folderName)

  const parentQuery = await drive.files.list({
    q: `name='${safeParentFolderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
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

  const query = await drive.files.list({
    q: `name='${safeFolderName}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
  })

  if (query.data.files && query.data.files.length > 0) {
    return query.data.files[0].id
  }

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