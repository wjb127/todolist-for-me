import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST /api/templates/[id]/activate - 템플릿 활성화
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 템플릿 조회
    const { data: template, error: templateError } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const today = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)
    const endDateString = endDate.toISOString().split('T')[0]

    // 1. 모든 템플릿 비활성화
    await supabaseAdmin
      .from('templates')
      .update({ is_active: false, applied_from_date: null })
      .neq('id', '')

    // 2. 오늘부터 3개월 후까지의 모든 기존 todos 삭제
    await supabaseAdmin
      .from('todos')
      .delete()
      .gte('date', today)
      .lte('date', endDateString)

    // 3. 선택한 템플릿 활성화
    const { error: activateError } = await supabaseAdmin
      .from('templates')
      .update({
        is_active: true,
        applied_from_date: today
      })
      .eq('id', id)

    if (activateError) throw activateError

    // 4. 오늘부터 3개월간의 todos 생성
    const createTodos: Array<{
      template_id: string
      date: string
      title: string
      description: string | null
      completed: boolean
      order_index: number
    }> = []

    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(today)
      currentDate.setDate(currentDate.getDate() + i)
      const dateString = currentDate.toISOString().split('T')[0]

      template.items.forEach((item: { title: string; description?: string }, index: number) => {
        createTodos.push({
          template_id: template.id,
          date: dateString,
          title: item.title,
          description: item.description || null,
          completed: false,
          order_index: index
        })
      })
    }

    if (createTodos.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('todos')
        .insert(createTodos)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error activating template:', error)
    return NextResponse.json({ error: 'Failed to activate template' }, { status: 500 })
  }
}
