import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/notes - 메모 목록
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching notes:', error)
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 })
  }
}

// POST /api/notes - 메모 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('notes')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating note:', error)
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 })
  }
}
