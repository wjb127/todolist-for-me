import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { title, description, dueDate, priority } = await request.json()

    if (!title) {
      return NextResponse.json(
        { error: '계획 제목이 필요합니다.' },
        { status: 400 }
      )
    }

    const prompt = `다음 계획을 작은 단위의 액션플랜으로 나누어 주세요:

**계획 제목:** ${title}
${description ? `**계획 설명:** ${description}` : ''}
${dueDate ? `**마감일:** ${dueDate}` : ''}
**우선순위:** ${priority === 'high' ? '높음' : priority === 'medium' ? '보통' : '낮음'}

요구사항:
1. 구체적이고 실행 가능한 작은 단위로 나누어 주세요
2. 각 액션은 명확하고 측정 가능해야 합니다
3. 시간 순서나 논리적 순서를 고려해 주세요
4. 한국어로 답변해 주세요
5. 다음 형식으로 답변해 주세요:

**액션플랜:**

1. [첫 번째 액션 항목]
2. [두 번째 액션 항목]
3. [세 번째 액션 항목]
...

**추천 일정:**
- [시간 배분이나 순서에 대한 조언]

**주의사항:**
- [계획 실행 시 고려할 점들]`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: '당신은 계획 수립과 프로젝트 관리에 전문적인 AI 어시스턴트입니다. 사용자의 계획을 구체적이고 실행 가능한 작은 단위로 나누어 체계적인 액션플랜을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API 오류: ${response.status}`)
    }

    const data = await response.json()
    const aiSuggestion = data.choices[0]?.message?.content

    if (!aiSuggestion) {
      throw new Error('AI 응답을 받을 수 없습니다.')
    }

    return NextResponse.json({ suggestion: aiSuggestion })

  } catch (error) {
    console.error('AI 계획 생성 오류:', error)
    return NextResponse.json(
      { error: 'AI 도움 기능에 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}