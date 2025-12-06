import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/bucketlist?showCompleted=false
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const showCompleted = searchParams.get('showCompleted') === 'true'

    let query = supabaseAdmin
      .from('bucketlist')
      .select('*')
      .order('order_index', { ascending: true })

    if (!showCompleted) {
      query = query.eq('completed', false)
    }

    const { data, error } = await query

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching bucketlist:', error)
    return NextResponse.json({ error: 'Failed to fetch bucketlist' }, { status: 500 })
  }
}

// POST /api/bucketlist - 새 항목 추가
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('bucketlist')
      .insert(body)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating bucketlist item:', error)
    return NextResponse.json({ error: 'Failed to create bucketlist item' }, { status: 500 })
  }
}
