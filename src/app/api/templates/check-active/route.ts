import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

type TemplateItem = {
  id: string
  title: string
  description?: string
  order_index: number
}

// POST /api/templates/check-active - 활성 템플릿 자동 적용 체크
export async function POST() {
  try {
    // 활성화된 템플릿 찾기
    const { data: activeTemplate, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error || !activeTemplate) {
      return NextResponse.json({ applied: false, message: 'No active template' })
    }

    const startDate = activeTemplate.applied_from_date || new Date().toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    const start = new Date(Math.max(new Date(startDate).getTime(), new Date(today).getTime()))

    let createdCount = 0

    // 오늘부터 앞으로 3개월간 확인
    for (let i = 0; i < 90; i++) {
      const currentDate = new Date(start)
      currentDate.setDate(start.getDate() + i)
      const dateString = currentDate.toISOString().split('T')[0]

      // 해당 날짜에 이미 해당 템플릿의 todos가 있는지 확인
      const { data: existingTodos } = await supabaseAdmin
        .from('todos')
        .select('id')
        .eq('date', dateString)
        .eq('template_id', activeTemplate.id)

      // 이미 todos가 있으면 스킵
      if (existingTodos && existingTodos.length > 0) continue

      // 템플릿으로부터 todos 자동 생성
      const newTodos = activeTemplate.items.map((item: TemplateItem, index: number) => ({
        template_id: activeTemplate.id,
        date: dateString,
        title: item.title,
        description: item.description || null,
        completed: false,
        order_index: index
      }))

      if (newTodos.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('todos')
          .insert(newTodos)

        if (!insertError) {
          createdCount += newTodos.length
        }
      }
    }

    return NextResponse.json({ applied: true, createdCount })
  } catch (error) {
    console.error('Error checking active template:', error)
    return NextResponse.json({ error: 'Failed to check active template' }, { status: 500 })
  }
}
