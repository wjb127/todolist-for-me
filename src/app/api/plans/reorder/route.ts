import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST /api/plans/reorder - 여러 계획의 order_index 일괄 업데이트
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array required' }, { status: 400 })
    }

    // 각 항목의 order_index를 업데이트
    for (const item of items) {
      const { error } = await supabaseAdmin
        .from('plans')
        .update({ order_index: item.order_index })
        .eq('id', item.id)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering plans:', error)
    return NextResponse.json({ error: 'Failed to reorder plans' }, { status: 500 })
  }
}
