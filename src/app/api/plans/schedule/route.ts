import { NextRequest, NextResponse } from 'next/server'

interface PlanInput {
  id: string
  title: string
  priority: 'low' | 'medium' | 'high'
  description: string | null
}

interface ScheduleItem {
  plan_id: string
  start_time: string
  end_time: string
}

export async function POST(request: NextRequest) {
  try {
    const { plans, currentTime } = await request.json() as {
      plans: PlanInput[]
      currentTime: string
    }

    if (!plans || plans.length === 0) {
      return NextResponse.json(
        { error: '배치할 계획이 없습니다.' },
        { status: 400 }
      )
    }

    const prompt = `현재 시간: ${currentTime}
취침 시간: 23:00

다음은 오늘 완료해야 할 계획 목록입니다:
${plans.map((p, i) => `${i + 1}. [ID: ${p.id}] ${p.title} (우선순위: ${p.priority === 'high' ? '높음' : p.priority === 'medium' ? '보통' : '낮음'})${p.description ? ` - ${p.description}` : ''}`).join('\n')}

규칙:
- 현재 시간(${currentTime}) 이후부터 취침 시간(23:00) 사이에 배치
- 우선순위가 높은 항목을 먼저 배치
- 각 계획에 적절한 소요 시간을 추정하여 배치
- 식사 시간(12:00-13:00, 18:00-19:00)은 비워두기
- 계획 사이에 10분의 쉬는 시간 포함
- 반드시 아래 JSON 형식으로만 응답하고 다른 텍스트는 포함하지 마세요

{"schedule":[{"plan_id":"실제ID값","start_time":"HH:MM","end_time":"HH:MM"}]}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Anthropic API 오류:', errorText)
      throw new Error(`Anthropic API 오류: ${response.status}`)
    }

    const data = await response.json()
    const content = data.content[0]?.text

    if (!content) {
      throw new Error('AI 응답을 받을 수 없습니다.')
    }

    // JSON 파싱: 응답에서 JSON 블록 추출
    const jsonMatch = content.match(/\{[\s\S]*"schedule"[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('AI 응답 파싱 실패:', content)
      throw new Error('AI 응답에서 유효한 JSON을 찾을 수 없습니다.')
    }

    const scheduleData = JSON.parse(jsonMatch[0]) as { schedule: ScheduleItem[] }

    // 유효성 검사: 입력에 존재하는 plan_id만 허용
    const inputIds = new Set(plans.map(p => p.id))
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

    const validSchedule = scheduleData.schedule.filter(s => {
      if (!inputIds.has(s.plan_id)) return false
      if (!timeRegex.test(s.start_time) || !timeRegex.test(s.end_time)) return false
      return true
    })

    return NextResponse.json({ schedule: validSchedule })

  } catch (error) {
    console.error('시간 배치 오류:', error)
    return NextResponse.json(
      { error: '시간 배치에 실패했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}
