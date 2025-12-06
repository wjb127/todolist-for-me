import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// GET /api/todos?date=2024-01-01 - 특정 날짜의 todos 조회
// GET /api/todos?dates=2024-01-01,2024-01-02,... - 여러 날짜의 todos 조회 (주간)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const date = searchParams.get('date')
    const dates = searchParams.get('dates')

    if (dates) {
      // 주간 조회
      const dateArray = dates.split(',')
      const { data, error } = await supabaseAdmin
        .from('todos')
        .select('*')
        .in('date', dateArray)
        .order('order_index', { ascending: true })

      if (error) throw error
      return NextResponse.json(data)
    }

    if (date) {
      // 단일 날짜 조회
      const { data, error } = await supabaseAdmin
        .from('todos')
        .select('*')
        .eq('date', date)
        .order('order_index', { ascending: true })

      if (error) throw error
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'date or dates parameter required' }, { status: 400 })
  } catch (error) {
    console.error('Error fetching todos:', error)
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 })
  }
}

// POST /api/todos - todo 추가 (단일 또는 복수)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // body가 배열이면 bulk insert
    const todos = Array.isArray(body) ? body : [body]

    const { data, error } = await supabaseAdmin
      .from('todos')
      .insert(todos)
      .select()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating todos:', error)
    return NextResponse.json({ error: 'Failed to create todos' }, { status: 500 })
  }
}

// DELETE /api/todos?from=2024-01-01&to=2024-03-31 - 범위 삭제
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!from || !to) {
      return NextResponse.json({ error: 'from and to parameters required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin
      .from('todos')
      .delete()
      .gte('date', from)
      .lte('date', to)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting todos:', error)
    return NextResponse.json({ error: 'Failed to delete todos' }, { status: 500 })
  }
}
