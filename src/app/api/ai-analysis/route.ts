import { NextRequest } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { format, subDays, subWeeks } from 'date-fns'

type AnalysisType = 'weekly' | 'routine' | 'trend' | 'plans' | 'priority' | 'deadline'

const SYSTEM_PROMPT = `너는 개인 생산성 코치야. 한국어로 자연스럽게 답변해.

중요: 응답을 반드시 HTML로 작성해. <div>를 루트로 사용하고, 다음 스타일 가이드를 따라:
- 섹션 제목: <h3 style="font-size:15px;font-weight:700;margin:16px 0 8px;color:inherit">
- 본문: <p style="font-size:13px;line-height:1.7;margin:0 0 10px;color:inherit">
- 강조 숫자/핵심: <span style="color:#6366f1;font-weight:600">
- 긍정 지표: <span style="color:#22c55e;font-weight:600">
- 부정 지표: <span style="color:#ef4444;font-weight:600">
- 리스트: <ul style="padding-left:16px;margin:6px 0 12px"><li style="font-size:13px;line-height:1.7;margin:2px 0">
- 구분선: <hr style="border:none;border-top:1px solid rgba(128,128,128,0.15);margin:14px 0">
- 조언 박스: <div style="background:rgba(99,102,241,0.08);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:13px;line-height:1.6">

간결하고 실용적으로. 이모지 사용 금지. 데이터가 없거나 0이면 "아직 분석할 데이터가 부족합니다"라고 짧게 HTML로 감싸서 답변해.`

// 데이터 수집 함수들 (stats + prompt 반환)

function collectWeekly() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const weekAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd')
  const twoWeeksAgo = format(subDays(new Date(), 13), 'yyyy-MM-dd')
  const prevWeekEnd = format(subDays(new Date(), 7), 'yyyy-MM-dd')

  return {
    fetch: async () => {
      const [thisWeekRes, prevWeekRes, plansRes] = await Promise.all([
        supabaseAdmin.from('todos').select('*').gte('date', weekAgo).lte('date', today).order('date'),
        supabaseAdmin.from('todos').select('*').gte('date', twoWeeksAgo).lte('date', prevWeekEnd).order('date'),
        supabaseAdmin.from('plans').select('*').gte('due_date', weekAgo).lte('due_date', today),
      ])

      console.log('[Weekly] Supabase:', {
        thisWeek: thisWeekRes.data?.length, prevWeek: prevWeekRes.data?.length, plans: plansRes.data?.length,
      })

      const thisWeekTodos = thisWeekRes.data || []
      const prevWeekTodos = prevWeekRes.data || []
      const recentPlans = plansRes.data || []

      const dailyStats: Record<string, { completed: number; total: number }> = {}
      for (const todo of thisWeekTodos) {
        if (!dailyStats[todo.date]) dailyStats[todo.date] = { completed: 0, total: 0 }
        dailyStats[todo.date].total++
        if (todo.completed) dailyStats[todo.date].completed++
      }

      const totalCompleted = thisWeekTodos.filter(t => t.completed).length
      const totalTodos = thisWeekTodos.length
      const completionRate = totalTodos > 0 ? Math.round((totalCompleted / totalTodos) * 100) : 0
      const prevCompleted = prevWeekTodos.filter(t => t.completed).length
      const prevTotal = prevWeekTodos.length
      const prevWeekRate = prevTotal > 0 ? Math.round((prevCompleted / prevTotal) * 100) : 0

      const dailyRates = Object.entries(dailyStats).map(([date, s]) => ({
        date, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0, completed: s.completed, total: s.total,
      })).sort((a, b) => b.rate - a.rate)

      const bestDay = dailyRates[0]?.date || '-'
      const worstDay = dailyRates[dailyRates.length - 1]?.date || '-'
      const plansCompleted = recentPlans.filter(p => p.completed).length

      const stats = { totalCompleted, totalTodos, completionRate, prevWeekRate, bestDay, worstDay }

      const prompt = `다음 주간 데이터를 분석해줘:

이번 주 데이터 (${weekAgo} ~ ${today}):
- 총 할 일: ${totalTodos}개, 완료: ${totalCompleted}개, 완료율: ${completionRate}%
- 전주 완료율: ${prevWeekRate}%
- 일별 현황: ${dailyRates.length > 0 ? dailyRates.map(d => `${d.date}: ${d.completed}/${d.total} (${d.rate}%)`).join(', ') : '데이터 없음'}
- 최근 계획 완료: ${plansCompleted}/${recentPlans.length}개

분석 항목:
- 완료율 트렌드 (전주 대비 변화)
- 가장 잘한 날 / 못한 날 분석
- 요일별 패턴
- 다음 주 실행 가능한 조언 1-2개`

      return { stats, prompt }
    },
  }
}

function collectRoutine() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const monthAgo = format(subDays(new Date(), 27), 'yyyy-MM-dd')

  return {
    fetch: async () => {
      const [templateRes, todoRes] = await Promise.all([
        supabaseAdmin.from('templates').select('*').eq('is_active', true),
        supabaseAdmin.from('todos').select('*').not('template_id', 'is', null).gte('date', monthAgo).lte('date', today),
      ])

      console.log('[Routine] Supabase:', { templates: templateRes.data?.length, todos: todoRes.data?.length })

      const templateItems = templateRes.data?.[0]?.items || []
      const todos = todoRes.data || []

      const itemStats: Record<string, { completed: number; total: number }> = {}
      for (const todo of todos) {
        if (!itemStats[todo.title]) itemStats[todo.title] = { completed: 0, total: 0 }
        itemStats[todo.title].total++
        if (todo.completed) itemStats[todo.title].completed++
      }
      const itemRates = Object.entries(itemStats)
        .map(([title, s]) => ({ title, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0, completed: s.completed, total: s.total }))
        .sort((a, b) => b.rate - a.rate)

      const dayOfWeekStats: Record<number, { completed: number; total: number }> = {}
      for (const todo of todos) {
        const dow = new Date(todo.date).getDay()
        if (!dayOfWeekStats[dow]) dayOfWeekStats[dow] = { completed: 0, total: 0 }
        dayOfWeekStats[dow].total++
        if (todo.completed) dayOfWeekStats[dow].completed++
      }
      const dayNames = ['일', '월', '화', '수', '목', '금', '토']
      const dayRates = Object.entries(dayOfWeekStats).map(([day, s]) => ({
        day: dayNames[Number(day)], rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      }))

      const totalCompleted = todos.filter(t => t.completed).length
      const avgCompletionRate = todos.length > 0 ? Math.round((totalCompleted / todos.length) * 100) : 0

      const stats = {
        activeRoutineCount: templateItems.length,
        avgCompletionRate,
        topItem: itemRates[0]?.title || '-',
        bottomItem: itemRates[itemRates.length - 1]?.title || '-',
      }

      const prompt = `다음 루틴 데이터를 분석해줘:

루틴 분석 데이터 (최근 28일):
- 활성 루틴 항목: ${templateItems.length}개
- 평균 완료율: ${avgCompletionRate}%
- 항목별 완료율: ${itemRates.length > 0 ? itemRates.map(i => `${i.title}: ${i.rate}% (${i.completed}/${i.total})`).join(', ') : '데이터 없음'}
- 요일별 완료율: ${dayRates.length > 0 ? dayRates.map(d => `${d.day}요일: ${d.rate}%`).join(', ') : '데이터 없음'}

분석 항목:
- 항목별 완료율 순위
- 자주 건너뛰는 항목과 요일 패턴
- 루틴 효율 개선을 위한 구체적 제안`

      return { stats, prompt }
    },
  }
}

function collectTrend() {
  const today = new Date()
  const weeks: { label: string; start: string; end: string }[] = []
  for (let i = 3; i >= 0; i--) {
    const start = format(subWeeks(today, i), 'yyyy-MM-dd')
    const end = format(subDays(subWeeks(today, i - 1), 1), 'yyyy-MM-dd')
    weeks.push({ label: `${4 - i}주차`, start, end: i === 0 ? format(today, 'yyyy-MM-dd') : end })
  }

  return {
    fetch: async () => {
      const { data: todos } = await supabaseAdmin
        .from('todos').select('*').gte('date', weeks[0].start).lte('date', weeks[3].end)

      console.log('[Trend] Supabase:', { count: todos?.length })

      const allTodos = todos || []
      const weeklyRates = weeks.map(w => {
        const wt = allTodos.filter(t => t.date >= w.start && t.date <= w.end)
        const completed = wt.filter(t => t.completed).length
        return { ...w, completed, total: wt.length, rate: wt.length > 0 ? Math.round((completed / wt.length) * 100) : 0 }
      })

      const totalCompleted = allTodos.filter(t => t.completed).length
      const avgRate = allTodos.length > 0 ? Math.round((totalCompleted / allTodos.length) * 100) : 0
      const improving = weeklyRates.length >= 2 && weeklyRates[weeklyRates.length - 1].rate > weeklyRates[0].rate

      const stats = { avgRate, weekCount: 4, improving }

      const prompt = `다음 4주간 완료 트렌드를 분석해줘:

주간 완료율 추이:
${weeklyRates.map(w => `- ${w.label} (${w.start}~${w.end}): ${w.completed}/${w.total} (${w.rate}%)`).join('\n')}
- 4주 평균 완료율: ${avgRate}%

분석 항목:
- 주간 완료율 변화 추이 (상승/하락/정체)
- 특이 패턴 포착
- 지속적 개선을 위한 구체적 방법 1-2개`

      return { stats, prompt }
    },
  }
}

function collectPlans() {
  return {
    fetch: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: plans } = await supabaseAdmin.from('plans').select('*').order('created_at', { ascending: false })

      console.log('[Plans] Supabase:', { count: plans?.length })

      const allPlans = plans || []
      const totalPlans = allPlans.length
      const completedPlans = allPlans.filter(p => p.completed).length
      const incompletePlans = allPlans.filter(p => !p.completed)
      const overduePlans = incompletePlans.filter(p => p.due_date && p.due_date < today)

      const completedWithDates = allPlans.filter(p => p.completed && p.created_at && p.updated_at)
      let avgCompletionDays = 0
      if (completedWithDates.length > 0) {
        const totalDays = completedWithDates.reduce((sum, p) => sum + Math.max(0, Math.round((new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000)), 0)
        avgCompletionDays = Math.round(totalDays / completedWithDates.length)
      }

      // 마감일이 지났는데 미완료인 계획 = 방치 계획
      const stalePlans = incompletePlans.filter(p => p.due_date && p.due_date < today)

      const stats = { totalPlans, completedPlans, overdueCount: overduePlans.length, avgCompletionDays }

      const prompt = `다음 계획 관리 데이터를 분석해줘:

계획 패턴 데이터:
- 총 계획: ${totalPlans}개, 완료: ${completedPlans}개, 완료율: ${totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0}%
- 완료까지 평균 소요일: ${avgCompletionDays}일
- 기한 초과 미완료 계획: ${stalePlans.length}개
${stalePlans.length > 0 ? `- 기한 초과 목록: ${stalePlans.slice(0, 5).map(p => `${p.title}(기한: ${p.due_date})`).join(', ')}` : ''}

분석 항목:
- 전체 계획 완료 패턴
- 기한 초과 미완료 계획 지적
- 계획 수립과 실행 간 갭 분석
- 개선 조언 1-2개`

      return { stats, prompt }
    },
  }
}

function collectPriority() {
  return {
    fetch: async () => {
      const { data: plans } = await supabaseAdmin.from('plans').select('*').order('created_at', { ascending: false })

      console.log('[Priority] Supabase:', { count: plans?.length })

      const allPlans = plans || []
      const priorityStats: Record<string, { completed: number; total: number }> = {}
      for (const plan of allPlans) {
        if (!priorityStats[plan.priority]) priorityStats[plan.priority] = { completed: 0, total: 0 }
        priorityStats[plan.priority].total++
        if (plan.completed) priorityStats[plan.priority].completed++
      }

      const priorityRates = Object.entries(priorityStats).map(([p, s]) => ({
        priority: p, rate: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0, completed: s.completed, total: s.total,
      }))

      const priorityLabels: Record<string, string> = { high: '높음', medium: '보통', low: '낮음' }

      const stats = {
        highRate: priorityRates.find(p => p.priority === 'high')?.rate ?? 0,
        mediumRate: priorityRates.find(p => p.priority === 'medium')?.rate ?? 0,
        lowRate: priorityRates.find(p => p.priority === 'low')?.rate ?? 0,
      }

      const prompt = `다음 우선순위별 계획 데이터를 분석해줘:

우선순위별 현황:
${priorityRates.map(p => `- ${priorityLabels[p.priority] || p.priority}: ${p.completed}/${p.total}개 완료 (${p.rate}%)`).join('\n')}

분석 항목:
- 우선순위별 완료율 비교
- 우선순위 설정이 적절한지 평가
- 현실적 우선순위 재설정 조언`

      return { stats, prompt }
    },
  }
}

function collectDeadline() {
  return {
    fetch: async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const { data: plans } = await supabaseAdmin.from('plans').select('*').order('created_at', { ascending: false })

      console.log('[Deadline] Supabase:', { count: plans?.length })

      const allPlans = plans || []
      const withDueDate = allPlans.filter(p => p.due_date)
      const withoutDueDate = allPlans.filter(p => !p.due_date)
      const incompletePlans = allPlans.filter(p => !p.completed)
      const overduePlans = incompletePlans.filter(p => p.due_date && p.due_date < today)

      const completedWithDue = withDueDate.filter(p => p.completed)
      const onTimeCount = completedWithDue.filter(p => p.updated_at && p.due_date && format(new Date(p.updated_at), 'yyyy-MM-dd') <= p.due_date).length

      const stats = {
        totalWithDue: withDueDate.length,
        totalWithoutDue: withoutDueDate.length,
        overdueCount: overduePlans.length,
        onTimeRate: completedWithDue.length > 0 ? Math.round((onTimeCount / completedWithDue.length) * 100) : 0,
      }

      const prompt = `다음 기한 관리 데이터를 분석해줘:

기한 관리 현황:
- 기한 설정된 계획: ${withDueDate.length}개, 미설정: ${withoutDueDate.length}개
- 기한 초과 미완료: ${overduePlans.length}개
- 기한 내 완료율: ${stats.onTimeRate}%
${overduePlans.length > 0 ? `- 기한 초과 목록: ${overduePlans.slice(0, 5).map(p => `${p.title}(기한: ${p.due_date})`).join(', ')}` : ''}

분석 항목:
- 기한 준수율 평가
- 미루기 패턴 (기한 초과 빈도)
- 기한 설정 습관 진단
- 기한 관리 개선 조언 1-2개`

      return { stats, prompt }
    },
  }
}

const collectors: Record<AnalysisType, () => { fetch: () => Promise<{ stats: Record<string, unknown>; prompt: string }> }> = {
  weekly: collectWeekly,
  routine: collectRoutine,
  trend: collectTrend,
  plans: collectPlans,
  priority: collectPriority,
  deadline: collectDeadline,
}

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json() as { type: AnalysisType }
    console.log('\n[AI Analysis] 요청 타입:', type)

    const validTypes: AnalysisType[] = ['weekly', 'routine', 'trend', 'plans', 'priority', 'deadline']
    if (!validTypes.includes(type)) {
      return new Response(JSON.stringify({ error: '올바른 분석 타입이 아닙니다.' }), { status: 400 })
    }

    // 1. 데이터 수집
    const { stats, prompt } = await collectors[type]().fetch()
    console.log(`[${type}] stats:`, stats)
    console.log(`[${type}] prompt:`, prompt.substring(0, 200), '...')

    // 2. Claude 스트리밍 요청
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!claudeRes.ok) {
      const error = await claudeRes.text()
      console.error('[Claude API Error]:', claudeRes.status, error)
      throw new Error(`Claude API 오류: ${claudeRes.status}`)
    }

    // 3. SSE 스트림으로 클라이언트에 전달
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const stream = new ReadableStream({
      async start(controller) {
        // stats를 먼저 전송
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'stats', stats })}\n\n`))

        const reader = claudeRes.body!.getReader()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6)
              if (data === '[DONE]') continue

              try {
                const parsed = JSON.parse(data)
                // content_block_delta 이벤트에서 텍스트 추출
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', text: parsed.delta.text })}\n\n`))
                }
              } catch {
                // JSON 파싱 실패는 무시
              }
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        } catch (error) {
          console.error('[Stream Error]:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: '스트리밍 중 오류 발생' })}\n\n`))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Analysis] 오류:', error)
    return new Response(JSON.stringify({ error: 'AI 분석에 오류가 발생했습니다.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
