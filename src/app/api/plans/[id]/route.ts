import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// PATCH /api/plans/[id] - 계획 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('plans')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating plan:', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

// DELETE /api/plans/[id] - 계획 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting plan:', error)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
