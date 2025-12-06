import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST /api/plans/swap-order - 두 계획의 순서 교환
export async function POST(request: NextRequest) {
  try {
    const { planId1, planId2 } = await request.json()

    if (!planId1 || !planId2) {
      return NextResponse.json({ error: 'planId1 and planId2 required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.rpc('swap_plan_order', {
      plan_id_1: planId1,
      plan_id_2: planId2
    })

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error swapping plan order:', error)
    return NextResponse.json({ error: 'Failed to swap plan order' }, { status: 500 })
  }
}
