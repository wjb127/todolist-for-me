import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/plans - 계획 목록
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('parent_id', { ascending: true, nullsFirst: true })
      .order('order_index', { ascending: true })

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching plans:', error)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 500 })
  }
}

// POST /api/plans - 계획 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('plans')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating plan:', error)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}
