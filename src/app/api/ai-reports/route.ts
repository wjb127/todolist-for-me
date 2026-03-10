import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// 저장된 리포트 전체 조회
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('ai_reports')
    .select('*')

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ reports: data })
}

// 리포트 저장 (upsert - type 기준 덮어쓰기)
export async function POST(request: NextRequest) {
  const { type, content, stats } = await request.json()

  if (!type || !content) {
    return Response.json({ error: 'type과 content는 필수입니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_reports')
    .upsert(
      { type, content, stats },
      { onConflict: 'type' }
    )
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ report: data })
}
