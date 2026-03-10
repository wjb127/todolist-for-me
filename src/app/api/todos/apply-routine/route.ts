import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

// POST /api/todos/apply-routine - 루틴 저장 및 적용
export async function POST(request: NextRequest) {
  try {
    const { items } = await request.json()

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items must be an array' }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + 3)
    const endDateString = endDate.toISOString().split('T')[0]

    // 1. 활성 템플릿 찾기
    const { data: activeTemplates } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    let templateId: string

    if (activeTemplates && activeTemplates.length > 0) {
      // 기존 활성 템플릿의 items 업데이트
      templateId = activeTemplates[0].id
      const { error: updateError } = await supabaseAdmin
        .from('templates')
        .update({
          items,
          applied_from_date: today,
        })
        .eq('id', templateId)

      if (updateError) throw updateError
    } else {
      // 활성 템플릿이 없으면 새로 생성
      const { data: newTemplate, error: createError } = await supabaseAdmin
        .from('templates')
        .insert({
          title: '매일 루틴',
          description: '매일 반복되는 할 일',
          items,
          is_active: true,
          applied_from_date: today,
        })
        .select()
        .single()

      if (createError || !newTemplate) throw createError
      templateId = newTemplate.id
    }

    // 2. 오늘~90일 후 범위에서 template_id가 있는 todo만 삭제 (수동 todo 보존)
    const { error: deleteError } = await supabaseAdmin
      .from('todos')
      .delete()
      .not('template_id', 'is', null)
      .gte('date', today)
      .lte('date', endDateString)

    if (deleteError) throw deleteError

    // 3. 새 items로 오늘~90일 todo 재생성
    if (items.length > 0) {
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

        items.forEach((item: { title: string; description?: string }, index: number) => {
          createTodos.push({
            template_id: templateId,
            date: dateString,
            title: item.title,
            description: item.description || null,
            completed: false,
            order_index: index,
          })
        })
      }

      // Supabase insert 제한을 위해 배치 처리
      const batchSize = 500
      for (let i = 0; i < createTodos.length; i += batchSize) {
        const batch = createTodos.slice(i, i + batchSize)
        const { error: insertError } = await supabaseAdmin
          .from('todos')
          .insert(batch)

        if (insertError) throw insertError
      }
    }

    return NextResponse.json({ success: true, templateId })
  } catch (error) {
    console.error('Error applying routine:', error)
    return NextResponse.json({ error: 'Failed to apply routine' }, { status: 500 })
  }
}
