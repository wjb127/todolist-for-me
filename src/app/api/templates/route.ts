import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/templates - 템플릿 목록
// GET /api/templates?active=true - 활성 템플릿만
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const activeOnly = searchParams.get('active') === 'true'

    let query = supabaseAdmin
      .from('templates')
      .select('*')

    if (activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST /api/templates - 템플릿 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('templates')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}

// PATCH /api/templates - 모든 템플릿 업데이트 (비활성화 등)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    const { error } = await supabaseAdmin
      .from('templates')
      .update(body)
      .neq('id', '')

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating templates:', error)
    return NextResponse.json({ error: 'Failed to update templates' }, { status: 500 })
  }
}
