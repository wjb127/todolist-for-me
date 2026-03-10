import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// 특정 날짜의 리포트 조회 (?date=2026-03-10)
export async function GET(request: NextRequest) {
  const date = request.nextUrl.searchParams.get('date')
  if (!date) {
    return Response.json({ error: 'date 파라미터가 필요합니다.' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_reports')
    .select('*')
    .eq('report_date', date)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ reports: data })
}

// 리포트 저장 (upsert - type+report_date 기준 덮어쓰기)
export async function POST(request: NextRequest) {
  const { type, content, stats, report_date } = await request.json()

  if (!type || !content) {
    return Response.json({ error: 'type과 content는 필수입니다.' }, { status: 400 })
  }

  const date = report_date || new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from('ai_reports')
    .upsert(
      { type, content, stats, report_date: date },
      { onConflict: 'type,report_date' }
    )
    .select()
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ report: data })
}
