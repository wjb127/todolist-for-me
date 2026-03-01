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

    const prompt = `[중요] 현재 시각은 정확히 ${currentTime}입니다.

완료해야 할 계획 (총 ${plans.length}개):
${plans.map((p, i) => `${i + 1}. [ID: ${p.id}] ${p.title} (우선순위: ${p.priority === 'high' ? '높음' : p.priority === 'medium' ? '보통' : '낮음'})${p.description ? ` - ${p.description}` : ''}`).join('\n')}

절대 규칙:
1. 모든 계획의 start_time은 반드시 ${currentTime} 이후여야 합니다. ${currentTime} 이전 시간은 절대 금지.
2. ${plans.length}개 계획을 모두 빠짐없이 배치 (누락 금지)
3. 수면 시간(00:00~06:00) 배치 금지
4. 가용 시간: ${currentTime}~23:59만 사용. 시간이 부족하면 계획의 소요시간을 줄여서라도 이 범위 안에 배치.
5. 우선순위 높은 항목을 먼저 배치
6. 각 계획에 적절한 소요 시간 추정
7. 식사 시간(12:00-13:00, 18:00-19:00)은 비워두기
8. 계획 사이에 10분 휴식 포함

반드시 아래 JSON 형식으로만 응답:
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

    // 유효성 검사
    const inputIds = new Set(plans.map(p => p.id))
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/

    const validSchedule = scheduleData.schedule.filter(s => {
      if (!inputIds.has(s.plan_id)) return false
      if (!timeRegex.test(s.start_time) || !timeRegex.test(s.end_time)) return false
      return true
    })

    // currentTime 이전에 배치된 항목을 강제 보정
    // AI가 06:00 같은 과거 시간을 반환할 경우 currentTime 이후로 재배치
    const correctedSchedule = enforceMinStartTime(validSchedule, currentTime)

    return NextResponse.json({ schedule: correctedSchedule })

  } catch (error) {
    console.error('시간 배치 오류:', error)
    return NextResponse.json(
      { error: '시간 배치에 실패했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }
}

// currentTime 이전에 배치된 항목들을 현재 시각 이후로 밀어내기
function enforceMinStartTime(schedule: ScheduleItem[], currentTime: string): ScheduleItem[] {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTimeStr = (mins: number) => {
    const h = Math.floor(mins / 60) % 24
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const currentMins = toMinutes(currentTime)

  // 유효 항목: currentTime 이후 & 최소 15분 이상 소요
  const validItems = schedule.filter(s => {
    const start = toMinutes(s.start_time)
    const end = toMinutes(s.end_time)
    return start >= currentMins && end - start >= 15
  })
  // 무효 항목: currentTime 이전이거나 소요시간이 15분 미만인 항목
  const invalidItems = schedule.filter(s => {
    const start = toMinutes(s.start_time)
    const end = toMinutes(s.end_time)
    return start < currentMins || end - start < 15
  })

  if (invalidItems.length === 0) return schedule

  // validItems 중 마지막 종료 시각 찾기
  let nextAvailable = currentMins
  if (validItems.length > 0) {
    const lastEnd = Math.max(...validItems.map(s => toMinutes(s.end_time)))
    nextAvailable = Math.max(nextAvailable, lastEnd + 10) // 10분 휴식
  }

  // invalidItems를 뒤에 붙여서 재배치
  const rescheduled = invalidItems.map(item => {
    const duration = toMinutes(item.end_time) - toMinutes(item.start_time)
    const adjustedDuration = Math.max(duration, 15) // 최소 15분

    // 23:59 넘으면 압축
    if (nextAvailable + adjustedDuration > 23 * 60 + 59) {
      const remaining = 23 * 60 + 59 - nextAvailable
      if (remaining < 15) {
        // 시간이 정말 부족하면 그냥 마지막에 15분으로
        const start = toTimeStr(23 * 60 + 59 - 15)
        nextAvailable = 23 * 60 + 59
        return { ...item, start_time: start, end_time: '23:59' }
      }
      const start = toTimeStr(nextAvailable)
      const end = toTimeStr(nextAvailable + Math.min(adjustedDuration, remaining))
      nextAvailable += Math.min(adjustedDuration, remaining) + 10
      return { ...item, start_time: start, end_time: end }
    }

    const start = toTimeStr(nextAvailable)
    const end = toTimeStr(nextAvailable + adjustedDuration)
    nextAvailable += adjustedDuration + 10
    return { ...item, start_time: start, end_time: end }
  })

  return [...validItems, ...rescheduled].sort((a, b) =>
    a.start_time.localeCompare(b.start_time)
  )
}
