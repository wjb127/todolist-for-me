import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// PATCH /api/bucketlist/[id] - 항목 업데이트
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const { data, error } = await supabaseAdmin
      .from('bucketlist')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating bucketlist item:', error)
    return NextResponse.json({ error: 'Failed to update bucketlist item' }, { status: 500 })
  }
}

// DELETE /api/bucketlist/[id] - 항목 삭제
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { error } = await supabaseAdmin
      .from('bucketlist')
      .delete()
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bucketlist item:', error)
    return NextResponse.json({ error: 'Failed to delete bucketlist item' }, { status: 500 })
  }
}
